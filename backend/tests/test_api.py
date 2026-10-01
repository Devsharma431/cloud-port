import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://edit-reel-19.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# --- Health / root ---
def test_root():
    r = requests.get(f"{API}/", timeout=20)
    assert r.status_code == 200
    assert r.json().get("message") == "Hello World"


# --- Profile endpoint ---
def test_profile_returns_discord_and_email():
    r = requests.get(f"{API}/profile", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data.get("discord") == "_cloudx1"
    assert data.get("email") == "cloudcreates7@gmail.com"


# --- Contact validation ---
def test_contact_invalid_email_422():
    r = requests.post(f"{API}/contact", json={
        "name": "TEST_user", "email": "not-an-email", "message": "hi"
    }, timeout=30)
    assert r.status_code == 422


def test_contact_missing_fields_422():
    r = requests.post(f"{API}/contact", json={"name": "TEST_user"}, timeout=30)
    assert r.status_code == 422


# --- Contact happy-path: posts a single TEST_ record. Backend may return 502
# if the Emergent email proxy is unavailable but the DB write still happens.
def test_contact_submit_and_persist():
    payload = {
        "name": "TEST_automation",
        "email": "test_automation@example.com",
        "project_type": "Motion Graphics",
        "budget": "Below 100$",
        "message": "TEST_automation ping — please ignore.",
    }
    r = requests.post(f"{API}/contact", json=payload, timeout=60)
    # Either success (200) or 502 if the email proxy failed, both leave the
    # record in Mongo. We assert on either and then verify via GET.
    assert r.status_code in (200, 502), f"Unexpected {r.status_code}: {r.text}"

    lst = requests.get(f"{API}/contact", timeout=30)
    assert lst.status_code == 200
    items = lst.json()
    assert isinstance(items, list)
    assert any(c.get("email") == payload["email"] and c.get("name") == payload["name"] for c in items), \
        "Submitted contact not found in GET /api/contact"
