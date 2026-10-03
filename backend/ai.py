import os
import json
import time
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = "gemini-1.5-flash"

genai.configure(api_key=GEMINI_API_KEY)

MAX_MESSAGE_CHARS = 2000
HISTORY_TURNS = 20
RATE_LIMIT = 30
RATE_WINDOW = 10 * 60

KNOWLEDGE = """
You are "Cloud Assistant", the friendly AI concierge on the portfolio website of Cloud (real name Diwanshu),
a freelance Video Editor & Motion Designer. Speak in first person plural about the studio ("we") or refer to
Diwanshu by name. Keep answers short (2-5 sentences), warm, confident and plain-spoken. Use markdown sparingly
(bold for key facts, simple lists only). Never invent facts not listed here - if unsure, say you don't know and
point the visitor to the contact form, Discord or email.

ABOUT
- Name: Diwanshu, works under the brand "Cloud". 19 years old, based in India. Works remotely worldwide.
- Languages: Hindi and English.
- Available for one-off projects AND as a full-time video editor.
- Stats: 80+ projects delivered, 2+ years experience, 30M+ views generated, 20+ happy clients.
- Worked with big creators like Jake Sweet, Louie Sweet, Scout, Payal Gaming and more.

SERVICES / SKILLS
- Long form editing, Short form editing (Shorts/Reels/TikTok), Motion graphics, UI animation, Sound design.
- Motion graphics styles: SaaS and UI animation, Mograph edits, Story-telling edits.
- Video editing styles: Long form, Short form, Phonk style edits.
- Common project types: Motion Graphics, Gaming, Reaction, IRL, Vlogs, Podcast.

TOOLS
- After Effects, Premiere Pro, Photoshop, Adobe Podcast, Topaz, Audacity, Canva, Frame.io.

DELIVERY TIMELINES (typical, can vary with scope)
- Motion graphics video: about 1 week.
- Long form editing: 20min+ video about 1 week; 10min+ video about 4-5 days.
- Short form: 2-3 days.

PRICING & PAYMENT
- Budget tiers on the contact form: Below $100, Below $500, Below $1000, $1000 or more. Exact quotes depend on
  length, style and deadline - ask the visitor to share details via the contact form for a quote.
- Policy: 50% payment in advance before work starts; the rest on delivery.
- Payment methods: PayPal, Wise, UPI, direct bank transfer.

AVAILABILITY
- Usually online from about 2-3 PM to 6-7 AM IST (India Standard Time).
- Fastest replies on Discord.

CONTACT
- Email: cloudcreates7@gmail.com
- Discord: _cloudx1
- YTJobs profile: https://ytjobs.co/talent/profile/638933
- The contact form is at the bottom of this page ("Let's talk").

Goal: help visitors understand the services, timelines and process, then encourage them to send a brief via the
contact form or reach out on Discord. Do not discuss topics unrelated to video editing / this portfolio; politely
steer back.
"""

BRIEF_SYSTEM = """
You rewrite rough project ideas from potential clients into a clean, concise project brief for a freelance video
editor & motion designer. Output ONLY the brief as plain text (no title, no markdown headers, no preamble), in
this shape with short lines:

Project: <type and one-line goal>
Format & length: <platform, orientation, duration>
Style / references: <tone, look, references if given>
Deliverables: <what will be delivered, versions, captions, thumbnails if mentioned>
Footage & assets: <what the client will provide>
Deadline: <when, or "flexible" if not given>
Notes: <anything else relevant>

Keep every fact from the client's text; do not invent specifics. If something is missing, write "TBD".
Keep it under 120 words. Write in the same language as the client's text (English or Hindi).
"""

router = APIRouter(prefix="/api/ai", tags=["ai"])

_hits: dict[str, deque] = defaultdict(deque)


def _rate_limit(request: Request) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a few minutes.")
    q.append(now)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _stream_response(generator):
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class ChatIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatMessage(BaseModel):
    role: str
    content: str
    created_at: str


class BriefIn(BaseModel):
    idea: str = Field(min_length=10, max_length=MAX_MESSAGE_CHARS)
    project_type: Optional[str] = None
    budget: Optional[str] = None


def _build_gemini_history(history: list[dict], system_prompt: str) -> list[dict]:
    """Convert MongoDB history to Gemini format."""
    messages = [{"role": "user", "parts": [system_prompt]}, {"role": "model", "parts": ["Understood."]}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        messages.append({"role": role, "parts": [msg["content"]]})
    return messages


def _stream_gemini(model_name: str, messages: list[dict], system_prompt: str = ""):
    """Stream response from Gemini."""
    model = genai.GenerativeModel(model_name, system_instruction=system_prompt if system_prompt else None)
    chat = model.start_chat(history=messages[:-1])
    response = chat.send_message(messages[-1]["parts"][0], stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text


def register(db):
    @router.get("/chat/{session_id}", response_model=list[ChatMessage])
    async def get_history(session_id: str):
        docs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
        return docs

    @router.post("/chat")
    async def chat(body: ChatIn, request: Request):
        async def gen():
            try:
                _rate_limit(request)
            except HTTPException as e:
                yield _sse({"error": e.detail})
                return
            except Exception as e:
                logger.error(f"Rate limit error: {e}")
                yield _sse({"error": "Rate limit error."})
                return

            try:
                history = await db.chat_messages.find(
                    {"session_id": body.session_id}, {"_id": 0, "role": 1, "content": 1}
                ).sort("created_at", -1).to_list(HISTORY_TURNS * 2)
                history.reverse()
            except Exception as e:
                logger.error(f"DB history fetch error: {e}")
                yield _sse({"error": "Failed to load chat history."})
                return

            now = datetime.now(timezone.utc).isoformat()
            try:
                await db.chat_messages.insert_one(
                    {"session_id": body.session_id, "role": "user", "content": body.message, "created_at": now}
                )
            except Exception as e:
                logger.error(f"DB insert user message error: {e}")
                yield _sse({"error": "Failed to save message."})
                return

            gemini_history = _build_gemini_history(history, KNOWLEDGE)
            gemini_history.append({"role": "user", "parts": [body.message]})

            full = ""
            try:
                for chunk_text in _stream_gemini(GEMINI_MODEL, gemini_history, KNOWLEDGE):
                    full += chunk_text
                    yield _sse({"delta": chunk_text})
            except Exception as e:
                logger.error(f"Gemini chat error: {e}")
                yield _sse({"error": "The assistant is unavailable right now. Please use the contact form or Discord."})
                return
            if full:
                try:
                    await db.chat_messages.insert_one(
                        {
                            "session_id": body.session_id,
                            "role": "assistant",
                            "content": full,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                except Exception as e:
                    logger.error(f"DB insert assistant message error: {e}")
            yield _sse({"done": True})

        return _stream_response(gen())

    @router.post("/brief")
    async def brief(body: BriefIn, request: Request):
        async def gen():
            try:
                _rate_limit(request)
            except HTTPException as e:
                yield _sse({"error": e.detail})
                return
            except Exception as e:
                logger.error(f"Rate limit error: {e}")
                yield _sse({"error": "Rate limit error."})
                return

            context = []
            if body.project_type:
                context.append(f"Project type selected: {body.project_type}")
            if body.budget:
                context.append(f"Budget selected: {body.budget}")
            prompt = ("\n".join(context) + "\n\n" if context else "") + f"Client's rough idea:\n{body.idea}"

            try:
                messages = [{"role": "user", "parts": [prompt]}]
                for chunk_text in _stream_gemini(GEMINI_MODEL, messages, BRIEF_SYSTEM):
                    yield _sse({"delta": chunk_text})
            except Exception as e:
                logger.error(f"Gemini brief error: {e}")
                yield _sse({"error": "Couldn't polish the brief right now. You can still send your message as is."})
                return
            yield _sse({"done": True})

        return _stream_response(gen())

    return router