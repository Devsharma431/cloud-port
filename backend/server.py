from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from ai import register as register_ai  # noqa: E402
from storage import register as register_storage, init_storage, file_url  # noqa: E402

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email (Emergent managed Resend proxy)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
OWNER_EMAIL = os.environ["OWNER_EMAIL"]
OWNER_DISCORD = os.environ.get("OWNER_DISCORD", "")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    project_type: Optional[str] = None
    budget: Optional[str] = None
    message: str
    attachments: List[str] = Field(default_factory=list, max_length=3)


class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    project_type: Optional[str] = None
    budget: Optional[str] = None
    message: str
    attachments: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def build_contact_email(payload: ContactCreate, files: list[dict]) -> str:
    name = escape(payload.name)
    email = escape(payload.email)
    project_type = escape(payload.project_type or "—")
    budget = escape(payload.budget or "—")
    message = escape(payload.message).replace("\n", "<br/>")
    attachments_html = ""
    if files:
        rows = "".join(
            f'<li style="margin:0 0 8px;color:#ffffff;">{escape(f["name"])} '
            f'<span style="color:#71717a;">· {f["kind"]} · {f["size"] / (1024 * 1024):.1f} MB</span> — '
            f'<a href="{escape(f["url"])}" style="color:#2997FF;text-decoration:none;">Open file</a></li>'
            for f in files
        )
        attachments_html = (
            '<p style="margin:20px 0 8px;"><strong style="color:#a1a1aa;">Attachments:</strong></p>'
            f'<ul style="margin:0;padding-left:18px;color:#ffffff;">{rows}</ul>'
        )
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 32px;border-bottom:1px solid #27272a;">
            <p style="margin:0;color:#2997FF;font-size:12px;letter-spacing:3px;text-transform:uppercase;">New Enquiry</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">New project request</h1>
          </td></tr>
          <tr><td style="padding:24px 32px;color:#e5e5e5;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 6px;"><strong style="color:#a1a1aa;">Name:</strong> {name}</p>
            <p style="margin:0 0 6px;"><strong style="color:#a1a1aa;">Email:</strong> {email}</p>
            <p style="margin:0 0 6px;"><strong style="color:#a1a1aa;">Project type:</strong> {project_type}</p>
            <p style="margin:0 0 16px;"><strong style="color:#a1a1aa;">Budget:</strong> {budget}</p>
            <div style="background:#050505;border:1px solid #27272a;border-radius:12px;padding:16px;color:#ffffff;">
              {message}
            </div>
            {attachments_html}
            <p style="margin:20px 0 0;font-size:12px;color:#71717a;">Sent by {escape(EMAIL_FROM_NAME)} portfolio contact form. Reply directly to this email to answer the sender.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = set()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]


def _assert_safe_email(html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email")
    for url in scan.urls:
        low = url.strip().lower()
        if not low.startswith(("https://", "mailto:", "tel:", "#")):
            raise ValueError(f"Unsafe email link: {url!r}")


async def send_owner_email(payload: ContactCreate, files: list[dict]):
    html = build_contact_email(payload, files)
    _assert_safe_email(html)
    body = {
        "to": [OWNER_EMAIL],
        "subject": f"New portfolio enquiry from {payload.name}",
        "html": html,
        "from_name": EMAIL_FROM_NAME,
        "contact_email": payload.email,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=body,
            )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Contact email send failed: {str(e)}")
        return False


# Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/profile")
async def get_profile():
    return {"discord": OWNER_DISCORD, "email": OWNER_EMAIL}


@api_router.post("/contact", response_model=Contact)
async def create_contact(input: ContactCreate, request: Request):
    files = []
    if input.attachments:
        recs = await db.files.find({"id": {"$in": input.attachments}, "is_deleted": False}, {"_id": 0}).to_list(10)
        if len(recs) != len(set(input.attachments)):
            raise HTTPException(status_code=400, detail="One or more attachments could not be found.")
        files = [
            {"name": r["original_filename"], "kind": r["kind"], "size": r["size"], "url": file_url(request, r["id"])}
            for r in recs
        ]
    contact = Contact(**input.model_dump())
    await db.contacts.insert_one(contact.model_dump())
    emailed = await send_owner_email(input, files)
    if not emailed:
        raise HTTPException(status_code=502, detail="Message saved but email delivery failed.")
    return contact


@api_router.get("/contact", response_model=List[Contact])
async def list_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contacts


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Include the router in the main app
app.include_router(api_router)
app.include_router(register_ai(db))
app.include_router(register_storage(db))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("startup")
async def startup_storage():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
