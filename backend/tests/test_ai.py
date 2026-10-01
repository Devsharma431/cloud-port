"""AI endpoint tests for /api/ai/chat, /api/ai/chat/{session_id}, /api/ai/brief.
Keep AI calls modest - the user's Gemini quota is consumed.
"""
import os
import json
import time
import uuid
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    try:
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return ""


BASE_URL = _load_backend_url().rstrip("/")
API = f"{BASE_URL}/api"


def _parse_sse(resp):
    """Parse SSE stream, return (deltas_concatenated, done_seen, error_msg)."""
    full = ""
    done = False
    error = None
    for raw in resp.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data: "):
            continue
        try:
            payload = json.loads(raw[6:])
        except Exception:
            continue
        if payload.get("error"):
            error = payload["error"]
        if payload.get("delta"):
            full += payload["delta"]
        if payload.get("done"):
            done = True
            break
    return full, done, error


# --- Validation (cheap: no AI call made because pydantic rejects first) ---
def test_chat_empty_message_422():
    sid = "s" + uuid.uuid4().hex
    r = requests.post(f"{API}/ai/chat", json={"session_id": sid, "message": ""}, timeout=20)
    assert r.status_code == 422


def test_chat_too_long_message_422():
    sid = "s" + uuid.uuid4().hex
    r = requests.post(
        f"{API}/ai/chat",
        json={"session_id": sid, "message": "x" * 2001},
        timeout=20,
    )
    assert r.status_code == 422


def test_chat_short_session_id_422():
    r = requests.post(f"{API}/ai/chat", json={"session_id": "abc", "message": "hi"}, timeout=20)
    assert r.status_code == 422


def test_brief_short_idea_422():
    r = requests.post(f"{API}/ai/brief", json={"idea": "short"}, timeout=20)
    assert r.status_code == 422


def test_history_unknown_session_returns_empty():
    sid = "unknown" + uuid.uuid4().hex
    r = requests.get(f"{API}/ai/chat/{sid}", timeout=20)
    assert r.status_code == 200
    assert r.json() == []


# --- Multi-turn chat with memory + SSE format + persistence (2 AI calls) ---
@pytest.fixture(scope="module")
def session_id():
    return "sess" + uuid.uuid4().hex


def test_chat_turn1_sse_stream(session_id):
    r = requests.post(
        f"{API}/ai/chat",
        json={"session_id": session_id, "message": "How long for a 12 minute YouTube video?"},
        stream=True,
        timeout=60,
    )
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")
    # Note: X-Accel-Buffering header is set by backend but may be stripped by Cloudflare/ingress
    full, done, error = _parse_sse(r)
    assert error is None, f"stream error: {error}"
    assert done is True
    assert len(full.strip()) > 20, f"reply too short: {full!r}"


def test_chat_turn2_memory(session_id):
    time.sleep(1)
    r = requests.post(
        f"{API}/ai/chat",
        json={"session_id": session_id, "message": "What did I just ask?"},
        stream=True,
        timeout=60,
    )
    assert r.status_code == 200
    full, done, error = _parse_sse(r)
    assert error is None
    assert done is True
    low = full.lower()
    # Must reference the 12-minute video question
    assert ("12" in full) or ("twelve" in low) or ("minute" in low), (
        f"turn 2 did not reference prior turn: {full!r}"
    )


def test_history_returns_4_messages_oldest_first(session_id):
    time.sleep(2)  # allow any trailing writes to flush
    r = requests.get(f"{API}/ai/chat/{session_id}", timeout=20)
    assert r.status_code == 200
    msgs = r.json()
    assert isinstance(msgs, list)
    assert len(msgs) == 4, f"expected 4 messages got {len(msgs)}: {msgs}"
    roles = [m["role"] for m in msgs]
    assert roles == ["user", "assistant", "user", "assistant"]
    for m in msgs:
        assert "content" in m and "created_at" in m
    # oldest first
    ts = [m["created_at"] for m in msgs]
    assert ts == sorted(ts)


# --- Brief streaming (1 AI call) ---
def test_brief_streams_structured_sections():
    r = requests.post(
        f"{API}/ai/brief",
        json={
            "idea": "A 10 minute gaming montage of Valorant clips with phonk music, delivered next week.",
            "project_type": "Gaming",
            "budget": "Below 500$",
        },
        stream=True,
        timeout=60,
    )
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")
    full, done, error = _parse_sse(r)
    assert error is None, f"stream error: {error}"
    assert done is True
    # Must contain the required labels on their own lines or at start
    for label in ("Project:", "Format & length:", "Deliverables:", "Deadline:"):
        assert label in full, f"missing '{label}' in brief:\n{full}"
