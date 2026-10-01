# Cloud — Freelance Video Editor & Motion Designer Portfolio

## Original problem statement
"i wanna make a portfolio for my video editing/motion graphics....i am a free lancer"

## User choices (verbatim/faithful)
- Video work embedded via YouTube/Vimeo links (no uploads).
- Sections: About + client logos, Showreel, Projects split into TWO categories — Motion Graphics and Video Editing. Video Editing sub-categories: Gaming, Documentary, Reaction, Short-Form, Long-Form.
- Contact via email form + Discord handle.
- Vibe: bold/contrasty clean Apple-style minimal, black + white with slight blue accent.
- Placeholders for name/tagline/showreel links.

## Architecture
- **Frontend**: React 19 + Tailwind + Shadcn UI + framer-motion + lenis (smooth momentum scrolling) + react-fast-marquee + sonner (toasts) + lucide-react.
- **Backend**: FastAPI + Motor (MongoDB async) + Resend via Emergent-managed email proxy (httpx).
- **DB**: MongoDB collection `contacts` — stores every enquiry.
- Single-page app with in-page smooth-scroll navigation (Lenis).

## Sections implemented
1. **Cursor** — custom dot+ring cursor, expands on interactive hover.
2. **Navbar** — glassmorphic sticky bar with mobile menu.
3. **Hero** — line-by-line masked reveal, parallax blue orb, grid backdrop, stats row.
4. **Showreel** — scroll-driven scale-up cinematic frame, YouTube embed on play.
5. **Projects** — Motion vs Video pill toggle + sub-category filters, animated grid + click-to-play lightbox with iframe.
6. **About** — numbered manifesto chapters (01/02/03), services pill list.
7. **Clients** — slow editorial marquee (react-fast-marquee, low-contrast).
8. **Contact** — huge "LET'S TALK", Email + Discord (copy-to-clipboard), form (name, email, project type, budget, message) posts to `/api/contact`.
9. **Footer**.

## Backend endpoints
- `GET /api/` — health.
- `GET /api/profile` — owner discord & email.
- `POST /api/contact` — validates, stores in Mongo, sends email to `OWNER_EMAIL` via Resend proxy.
- `GET /api/contact` — list submissions.
- `GET/POST /api/status` — legacy status checks.

## Environment (backend/.env)
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (existing).
- `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME=Cloud Studio`.
- `OWNER_EMAIL=delivered@resend.dev` (PLACEHOLDER — swap to real inbox in Preview → Secrets or backend/.env).
- `OWNER_DISCORD=_cloudx1`.

## What's implemented (2026-01)
- Full award-worthy portfolio landing with kinetic hero, showreel, filterable projects, manifesto, marquee, contact form + Discord copy.
- Contact form is wired to backend, stores in Mongo, and dispatches email via Emergent Resend proxy.
- Applied user visual edit: hero projects-delivered stat now "100+".

## Prioritized backlog / next tasks
- **P0** — Owner swaps placeholder profile data (name, tagline, showreel YouTube id, project embeds, client names, real Discord, real OWNER_EMAIL).
- **P1** — Case-study detail pages per project (long-form treatment, before/after, credits).
- **P1** — Admin-only view of `/api/contact` submissions.
- **P2** — Testimonials carousel, pricing packages, "Book a call" (Calendly) integration.
- **P2** — Blog / tutorials, dark/light theme toggle, sitemap + SEO metadata.

## Update — 2026-09-29 (Rebrand to "Cloud")
- Global rename Kaizen → Cloud (logo, footer, page title/meta).
- Navbar: Showreel · Projects (→ #work) · About. "Clients" removed.
- Hero stats: 2+ Years of Experience, 100+ Projects delivered, 30M+ Views generated, 20+ Happy Clients.
- About skills: Long form Editing, Short form editing, Motion graphics, UI animation, Sound Design.
- "Trusted By" clients marquee section removed (Clients.jsx deleted).
- Contact: email cloudcreates7@gmail.com, Discord _cloudx1. Form emails owner via Emergent-managed Resend (OWNER_EMAIL in backend/.env); user input HTML-escaped; 502 returned if email fails.
- Project types: Motion Graphics, Gaming, Reaction, IRL, Vlogs, Podcast, Other. Budgets: Below 100$, Below 500$, Below 1000$, 1000$ or more.
- Backlog: replace placeholder video links/projects with real ones; optional admin panel to manage projects.

## Update — 2026-09-29 (Real Video Editing work)
- Stats reordered: 80+ Projects, 2+ Years, 30M+ Views, 20+ Clients. Logo font: 'gg sans' → Noto Sans 800 fallback (.font-logo).
- Motion subs: All, SaaS and UI, Mograph Edits, Viral Edits, Story Telling Edits (still placeholders).
- Video subs: All, Long Form, Short Form, Phonk Style Edits — now real embeds from VIDEO_PROJECTS (portfolio.js).
- New `VideoEmbed.jsx`: inline lazy iframes; YouTube Shorts 9:16, videos 16:9; Drive uses /preview iframe + "Open in Drive" external link (target=_blank, noopener). Masonry via CSS columns.
- Showreel label "2025" removed.

## Update — 2026-10-01 (Structure + Motion Graphics content)
- Showreel section + nav link removed (Showreel.jsx deleted). Nav: Projects · About · Let's Talk.
- New Tools.jsx "Software" marquee below About (react-fast-marquee, right-to-left, grey → white hover): After Effects, Premiere Pro, Photoshop, Adobe Podcast, Topaz, Audacity, Canva, Frame.io.
- Motion Graphics subs: All, SaaS and UI, Mograph Edits, Story Telling Edits (Viral Edits removed). 8 Vimeo embeds in MOTION_PROJECTS with real ratios (16/9, 9/16, 1/1) — fetched via Vimeo oEmbed.
- Projects.jsx rewritten: single masonry grid of VideoEmbed for both tabs; lightbox/placeholder grid removed. VideoEmbed supports youtube/vimeo/drive + ratio map.
- Contact: "Hire me on YTJobs" button (PROFILE.ytjobs) below Discord, new tab.
- Tested: test_reports/iteration_1.json — all pass. Backend tests at backend/tests/test_api.py.

## Update — 2026-10-01 (Gemini AI integration)
- Model: gemini-3-flash-preview via emergentintegrations LlmChat, using the USER'S OWN key (`GEMINI_API_KEY` in backend/.env — not the Emergent universal key).
- Backend `ai.py` (router /api/ai): POST /chat (SSE stream, history in Mongo `chat_messages` by session_id, last 20 turns replayed), GET /chat/{session_id}, POST /brief (SSE). Per-IP rate limit 30 req / 10 min. KNOWLEDGE prompt holds Diwanshu's details (19, India, Hindi/English, timelines, 50% advance, PayPal/Wise/UPI/bank, 2-3PM–6-7AM IST availability).
- Frontend: `lib/sse.js` stream helper; `ChatWidget.jsx` + `ChatMessage.jsx` floating "Ask Cloud" widget (session in localStorage `cloud-chat-session`, history restore, suggestions); Contact form "Polish with AI" + Undo. Toaster moved to bottom-left.
- Hero shifted up (pt-24/28, pb-20/24). Custom cursor disabled on <768px / touch (CSS media queries + Cursor.jsx matchMedia gate).
- Tested: test_reports/iteration_2.json — all pass. Tests: backend/tests/test_ai.py.

## Update — 2026-10-01 (File & media storage — contact attachments)
- Emergent object storage (EMERGENT_LLM_KEY in backend/.env; INTEGRATION_PROXY_URL from platform). `storage.py` router: POST /api/uploads/init (type/size validation: images+PDF ≤10MB, video ≤100MB), PUT /api/uploads/{id}/chunk (4MB chunks, assembled in /tmp/cloud-uploads), POST /api/uploads/{id}/complete (push to storage, record in db.files), GET /api/files/{id} (inline/download by UUID). Stale uploads (>1h) pruned on each init.
- Contact: `attachments: [file_id]` (max 3) validated against db.files; owner email lists each file with an "Open file" link (link text kept generic — filenames like `x.png` trip the email anti-phishing gate).
- Frontend: `lib/upload.js` (chunked uploader + validation), `FileDropzone.jsx` (drag/drop, progress, remove with abort), wired into Contact; submit disabled while uploading.
- No admin UI (user declined). Tested: test_reports/iteration_3.json — 16/16 backend + all UI flows pass. Tests: backend/tests/test_storage.py (needs REACT_APP_BACKEND_URL env).
- Backlog (from review): stream large downloads instead of buffering; send owner email as background task to cut contact latency.
