import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

BLOB_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN")
BLOB_API_BASE = "https://blob.vercel-storage.com"

if not BLOB_TOKEN:
    logger.warning("BLOB_READ_WRITE_TOKEN not set - file uploads will fail")

MB = 1024 * 1024
MAX_FILES = 3
CHUNK_LIMIT = 6 * MB
ALLOWED = {
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
    @router.post("/uploads/init")
    async def upload_init(body: UploadInit):
        if body.content_type not in ALLOWED:
            raise HTTPException(status_code=415, detail="Only images (JPG, PNG, GIF, WebP), PDFs and video clips (MP4, MOV, WebM, MKV) are allowed.")
        limit, kind = ALLOWED[body.content_type]
        if body.size > limit:
            raise HTTPException(status_code=413, detail=f"{'Videos' if kind == 'video' else 'Images and PDFs'} must be under {limit // MB} MB.")
        
        upload_id = str(uuid.uuid4())
        await db.upload_sessions.insert_one({
            "upload_id": upload_id,
            "filename": body.filename,
            "content_type": body.content_type,
            "size": body.size,
            "kind": kind,
            "chunks": [],
            "received": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"upload_id": upload_id, "chunk_size": 4 * MB}

    @router.put("/uploads/{upload_id}/chunk")
    async def upload_chunk(upload_id: str, request: Request):
        session = await db.upload_sessions.find_one({"upload_id": upload_id})
        if not session:
            raise HTTPException(status_code=404, detail="Upload not found or expired.")
        
        data = await request.body()
        if len(data) > CHUNK_LIMIT:
            raise HTTPException(status_code=413, detail="Chunk too large.")
        if session["received"] + len(data) > session["size"]:
            raise HTTPException(status_code=413, detail="Upload exceeds declared size.")
        
        await db.upload_sessions.update_one(
            {"upload_id": upload_id},
            {"$push": {"chunks": data}, "$inc": {"received": len(data)}}
        )
        return {"received": session["received"] + len(data), "size": session["size"]}

    @router.post("/uploads/{upload_id}/complete", response_model=FileOut)
    async def upload_complete(upload_id: str):
        session = await db.upload_sessions.find_one({"upload_id": upload_id})
        if not session:
            raise HTTPException(status_code=404, detail="Upload not found or expired.")
        if session["received"] != session["size"]:
            raise HTTPException(status_code=400, detail="Upload incomplete.")
        
        ext = session["filename"].rsplit(".", 1)[-1].lower() if "." in session["filename"] else "bin"
        blob_path = f"uploads/contact/{uuid.uuid4()}.{ext}"
        
        file_data = b"".join(session["chunks"])
        
        try:
            response = await asyncio.to_thread(
                _put_blob,
                blob_path,
                file_data,
                session["content_type"]
            )
            blob_url = response.get("url")
            if not blob_url:
                raise Exception("No URL returned from Vercel Blob")
        except Exception as e:
            logger.error(f"Vercel Blob upload failed: {e}")
            raise HTTPException(status_code=502, detail="Could not store the file. Please try again.")
        finally:
            await db.upload_sessions.delete_one({"upload_id": upload_id})
        
        file_id = str(uuid.uuid4())
        await db.files.insert_one(
            {
                "id": file_id,
                "storage_path": blob_path,
                "blob_url": blob_url,
                "original_filename": session["filename"],
                "content_type": session["content_type"],
                "size": session["size"],
                "kind": session["kind"],
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return FileOut(id=file_id, name=session["filename"], content_type=session["content_type"], size=session["size"], kind=session["kind"])

    @router.get("/files/{file_id}")
    async def get_file(file_id: str, download: bool = Query(False)):
        rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="File not found")
        
        blob_url = rec.get("blob_url")
        if not blob_url:
            raise HTTPException(status_code=404, detail="File not found in blob storage")
        
        try:
            response = await asyncio.to_thread(_get_blob, blob_url)
            data = response.content
            content_type = response.headers.get("Content-Type", rec.get("content_type", "application/octet-stream"))
        except Exception as e:
            logger.error(f"Vercel Blob download failed: {e}")
            raise HTTPException(status_code=502, detail="Could not fetch the file.")
        
        disposition = "attachment" if download else "inline"
        safe_name = rec["original_filename"].replace('"', "")
        return Response(
            content=data,
            media_type=rec.get("content_type", content_type),
            headers={"Content-Disposition": f'{disposition}; filename="{safe_name}"'},
        )

    return router

def _put_blob(path: str, data: bytes, content_type: str) -> dict:
    if not BLOB_TOKEN:
        raise Exception("BLOB_READ_WRITE_TOKEN not configured")
    
    url = f"{BLOB_API_BASE}/{path}"
    headers = {
        "Authorization": f"Bearer {BLOB_TOKEN}",
        "Content-Type": content_type,
        "x-add-random-suffix": "true",
    }
    response = requests.put(url, headers=headers, data=data, timeout=300)
    response.raise_for_status()
    return response.json()

def _get_blob(url: str):
    headers = {"Authorization": f"Bearer {BLOB_TOKEN}"}
    response = requests.get(url, headers=headers, timeout=120)
    response.raise_for_status()
    return response