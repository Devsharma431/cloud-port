"""
Backend tests for the chunked upload / storage flow and contact-attachment
integration. These share the preview backend and MongoDB with the other
tests. xdist's loadscope keeps this module on a single worker so the
sequential create -> chunk -> complete -> contact flow is race-free.

NOTE: /api/contact sends a real email to the owner on each success.
We limit the number of successful contact posts in this file to 2.
"""
import os
import io
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
MB = 1024 * 1024


# ------------------------- /api/uploads/init -------------------------

def test_init_rejects_disallowed_mime_415():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "evil.exe", "content_type": "application/x-msdownload", "size": 1024
    }, timeout=20)
    assert r.status_code == 415


def test_init_rejects_plain_text_415():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "notes.txt", "content_type": "text/plain", "size": 1024
    }, timeout=20)
    assert r.status_code == 415


def test_init_image_oversize_413():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "big.png", "content_type": "image/png", "size": 11 * MB
    }, timeout=20)
    assert r.status_code == 413


def test_init_video_oversize_413():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "big.mp4", "content_type": "video/mp4", "size": 101 * MB
    }, timeout=20)
    assert r.status_code == 413


def test_init_video_50mb_ok_without_upload():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "ok.mp4", "content_type": "video/mp4", "size": 50 * MB
    }, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["chunk_size"] == 4 * MB
    assert isinstance(data["upload_id"], str)


def test_init_size_zero_422():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "empty.png", "content_type": "image/png", "size": 0
    }, timeout=20)
    assert r.status_code == 422


def test_init_size_negative_422():
    r = requests.post(f"{API}/uploads/init", json={
        "filename": "neg.png", "content_type": "image/png", "size": -5
    }, timeout=20)
    assert r.status_code == 422


# ---------- chunk flow: 9MB png in 4MB slices, errors on bad calls ----------

def _init(filename, content_type, size):
    r = requests.post(f"{API}/uploads/init", json={
        "filename": filename, "content_type": content_type, "size": size
    }, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["upload_id"]


def test_chunk_unknown_upload_id_404():
    r = requests.put(f"{API}/uploads/{uuid.uuid4()}/chunk",
                     data=b"\x00" * 1024,
                     headers={"Content-Type": "application/octet-stream"}, timeout=20)
    assert r.status_code == 404


def test_chunk_too_large_413():
    uid = _init("x.png", "image/png", 9 * MB)
    big = b"\x00" * (7 * MB)  # > 6MB CHUNK_LIMIT
    r = requests.put(f"{API}/uploads/{uid}/chunk", data=big,
                     headers={"Content-Type": "application/octet-stream"}, timeout=60)
    assert r.status_code == 413


def test_chunk_exceeds_declared_size_413():
    uid = _init("x.png", "image/png", 1 * MB)
    r = requests.put(f"{API}/uploads/{uid}/chunk", data=b"\x00" * (2 * MB),
                     headers={"Content-Type": "application/octet-stream"}, timeout=60)
    assert r.status_code == 413


def test_full_chunked_upload_9mb_png_round_trip():
    """9MB PNG uploaded in 4MB slices, completed, downloaded, bytes verified."""
    size = 9 * MB
    # Deterministic payload (not a real PNG; backend doesn't validate contents)
    payload = bytes((i * 7) % 256 for i in range(size))
    uid = _init("ninemb.png", "image/png", size)

    chunk = 4 * MB
    offset = 0
    received = 0
    while offset < size:
        slab = payload[offset:offset + chunk]
        r = requests.put(f"{API}/uploads/{uid}/chunk", data=slab,
                         headers={"Content-Type": "application/octet-stream"}, timeout=120)
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        received += len(slab)
        assert data["received"] == received
        assert data["size"] == size
        offset += chunk

    # Complete
    r = requests.post(f"{API}/uploads/{uid}/complete", timeout=120)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["kind"] == "image"
    assert out["content_type"] == "image/png"
    assert out["size"] == size
    assert out["name"] == "ninemb.png"
    file_id = out["id"]

    # Complete again -> 404 (upload record removed)
    r2 = requests.post(f"{API}/uploads/{uid}/complete", timeout=30)
    assert r2.status_code == 404

    # Temp file gone
    assert not os.path.exists(f"/tmp/cloud-uploads/{uid}")

    # Download inline — Content-Disposition inline and content-type match, bytes identical
    g = requests.get(f"{API}/files/{file_id}", timeout=120)
    assert g.status_code == 200
    assert g.headers.get("Content-Type", "").startswith("image/png")
    cd = g.headers.get("Content-Disposition", "")
    assert cd.startswith("inline"), cd
    assert 'filename="ninemb.png"' in cd
    assert g.content == payload

    # Download attachment flavour
    g2 = requests.get(f"{API}/files/{file_id}?download=true", timeout=120)
    assert g2.status_code == 200
    assert g2.headers.get("Content-Disposition", "").startswith("attachment")

    # Stash for the contact test
    global _UPLOADED_FILE_ID
    _UPLOADED_FILE_ID = file_id


def test_complete_before_all_bytes_400():
    size = 2 * MB
    uid = _init("partial.png", "image/png", size)
    # Only send 1MB
    r = requests.put(f"{API}/uploads/{uid}/chunk", data=b"\x00" * (1 * MB),
                     headers={"Content-Type": "application/octet-stream"}, timeout=30)
    assert r.status_code == 200
    done = requests.post(f"{API}/uploads/{uid}/complete", timeout=30)
    assert done.status_code == 400


def test_get_unknown_file_404():
    r = requests.get(f"{API}/files/{uuid.uuid4()}", timeout=20)
    assert r.status_code == 404


# -------------------- Contact + attachments integration --------------------

# Module-global file id populated by the 9MB round-trip test. loadscope keeps
# this module on one worker so ordering within the file is preserved.
_UPLOADED_FILE_ID = None


def _upload_small_png() -> str:
    size = 50 * 1024  # 50 KB
    payload = bytes((i * 13) % 256 for i in range(size))
    uid = _init("tiny.png", "image/png", size)
    r = requests.put(f"{API}/uploads/{uid}/chunk", data=payload,
                     headers={"Content-Type": "application/octet-stream"}, timeout=30)
    assert r.status_code == 200
    done = requests.post(f"{API}/uploads/{uid}/complete", timeout=60)
    assert done.status_code == 200, done.text
    return done.json()["id"]


def test_contact_with_unknown_attachment_400():
    r = requests.post(f"{API}/contact", json={
        "name": "TEST_badattach", "email": "TEST_badattach@example.com",
        "message": "has bogus id", "attachments": [str(uuid.uuid4())],
    }, timeout=30)
    assert r.status_code == 400


def test_contact_too_many_attachments_422():
    ids = [str(uuid.uuid4()) for _ in range(4)]
    r = requests.post(f"{API}/contact", json={
        "name": "TEST_toomany", "email": "TEST_toomany@example.com",
        "message": "too many", "attachments": ids,
    }, timeout=30)
    assert r.status_code == 422


def test_contact_with_valid_attachment_200():
    """One successful contact post with a real attachment (sends 1 real email)."""
    file_id = _upload_small_png()
    payload = {
        "name": "TEST_attach_ok",
        "email": "test_attach_ok@example.com",
        "project_type": "Motion Graphics",
        "budget": "Below 100$",
        "message": "TEST_attach_ok — ignore.",
        "attachments": [file_id],
    }
    r = requests.post(f"{API}/contact", json=payload, timeout=60)
    # Accept 502 if the email proxy failed (same convention as test_api).
    assert r.status_code in (200, 502), f"{r.status_code}: {r.text}"
    if r.status_code == 200:
        data = r.json()
        assert data["attachments"] == [file_id]
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]

    # Verify persistence via GET /api/contact
    g = requests.get(f"{API}/contact", timeout=30)
    assert g.status_code == 200
    assert any(
        c.get("email") == payload["email"] and c.get("attachments") == [file_id]
        for c in g.json()
    ), "Contact with attachment not found in GET /api/contact"
