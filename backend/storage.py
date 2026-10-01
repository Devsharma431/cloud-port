import os
import uuid
import shutil
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ["EMERGENT_LLM_KEY"]
APP_NAME = "cloud-portfolio"

TMP_DIR = Path("/tmp/cloud-uploads")
TMP_DIR.mkdir(parents=True, exist_ok=True)

MB = 1024 * 1024
MAX_FILES = 3
CHUNK_LIMIT = 6 * MB
ALLOWED = {
    # content_type: (max size, kind)
    "image/jpeg": (10 * MB, "image"),
    "image/png": (10 * MB, "image"),
    "image/gif": (10 * MB, "image"),
    "image/webp": (10 * MB, "image"),
    "application/pdf": (10 * MB, "pdf"),
    "video/mp4": (100 * MB, "video"),
    "video/quicktime": (100 * MB, "video"),
    "video/webm": (100 * MB, "video"),
    "video/x-matroska": (100 * MB, "video"),
}

_storage_key: Optional[str] = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=300,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=300,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


class UploadInit(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    content_type: str
    size: int = Field(gt=0)


class FileOut(BaseModel):
    id: str
    name: str
    content_type: str
    size: int
    kind: str


def file_url(request: Request, file_id: str) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    host = host.split(",")[0].strip()
    return f"https://{host}/api/files/{file_id}"


router = APIRouter(prefix="/api", tags=["files"])


def register(db):
    async def _prune_stale_uploads():
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        stale = await db.uploads.find({"created_at": {"$lt": cutoff}}, {"_id": 0, "upload_id": 1}).to_list(500)
        for up in stale:
            (TMP_DIR / up["upload_id"]).unlink(missing_ok=True)
        if stale:
            await db.uploads.delete_many({"upload_id": {"$in": [u["upload_id"] for u in stale]}})

    @router.post("/uploads/init")
    async def upload_init(body: UploadInit):
        await _prune_stale_uploads()
        if body.content_type not in ALLOWED:
            raise HTTPException(status_code=415, detail="Only images (JPG, PNG, GIF, WebP), PDFs and video clips (MP4, MOV, WebM, MKV) are allowed.")
        limit, kind = ALLOWED[body.content_type]
        if body.size > limit:
            raise HTTPException(status_code=413, detail=f"{'Videos' if kind == 'video' else 'Images and PDFs'} must be under {limit // MB} MB.")
        upload_id = str(uuid.uuid4())
        await db.uploads.insert_one(
            {
                "upload_id": upload_id,
                "filename": body.filename,
                "content_type": body.content_type,
                "size": body.size,
                "kind": kind,
                "received": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        (TMP_DIR / upload_id).write_bytes(b"")
        return {"upload_id": upload_id, "chunk_size": 4 * MB}

    @router.put("/uploads/{upload_id}/chunk")
    async def upload_chunk(upload_id: str, request: Request):
        up = await db.uploads.find_one({"upload_id": upload_id}, {"_id": 0})
        tmp = TMP_DIR / upload_id
        if not up or not tmp.exists():
            raise HTTPException(status_code=404, detail="Upload not found or expired.")
        data = await request.body()
        if len(data) > CHUNK_LIMIT:
            raise HTTPException(status_code=413, detail="Chunk too large.")
        if up["received"] + len(data) > up["size"]:
            raise HTTPException(status_code=413, detail="Upload exceeds declared size.")
        with tmp.open("ab") as f:
            f.write(data)
        received = up["received"] + len(data)
        await db.uploads.update_one({"upload_id": upload_id}, {"$set": {"received": received}})
        return {"received": received, "size": up["size"]}

    @router.post("/uploads/{upload_id}/complete", response_model=FileOut)
    async def upload_complete(upload_id: str):
        up = await db.uploads.find_one({"upload_id": upload_id}, {"_id": 0})
        tmp = TMP_DIR / upload_id
        if not up or not tmp.exists():
            raise HTTPException(status_code=404, detail="Upload not found or expired.")
        if up["received"] != up["size"]:
            raise HTTPException(status_code=400, detail="Upload incomplete.")

        ext = up["filename"].rsplit(".", 1)[-1].lower() if "." in up["filename"] else "bin"
        path = f"{APP_NAME}/uploads/contact/{uuid.uuid4()}.{ext}"
        data = tmp.read_bytes()
        try:
            result = await asyncio.to_thread(_put_object, path, data, up["content_type"])
        except Exception as e:  # noqa: BLE001
            logger.error(f"Storage upload failed: {e}")
            raise HTTPException(status_code=502, detail="Could not store the file. Please try again.")
        finally:
            tmp.unlink(missing_ok=True)

        file_id = str(uuid.uuid4())
        await db.files.insert_one(
            {
                "id": file_id,
                "storage_path": result["path"],
                "original_filename": up["filename"],
                "content_type": up["content_type"],
                "size": result.get("size", up["size"]),
                "kind": up["kind"],
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        await db.uploads.delete_one({"upload_id": upload_id})
        return FileOut(id=file_id, name=up["filename"], content_type=up["content_type"], size=up["size"], kind=up["kind"])

    @router.get("/files/{file_id}")
    async def get_file(file_id: str, download: bool = Query(False)):
        rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="File not found")
        try:
            data, content_type = await asyncio.to_thread(_get_object, rec["storage_path"])
        except Exception as e:  # noqa: BLE001
            logger.error(f"Storage download failed: {e}")
            raise HTTPException(status_code=502, detail="Could not fetch the file.")
        disposition = "attachment" if download else "inline"
        safe_name = rec["original_filename"].replace('"', "")
        return Response(
            content=data,
            media_type=rec.get("content_type", content_type),
            headers={"Content-Disposition": f'{disposition}; filename="{safe_name}"'},
        )

    return router


def cleanup_tmp():
    shutil.rmtree(TMP_DIR, ignore_errors=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
