# Viewable

A privacy-first, anonymous web client for viewing X/Twitter that looks, feels, and navigates like X.

---

## Key Features

- **Failsafe Fallback Chain:**
  1. **User Session (BYO):** Direct authenticated session cookies for age-restricted / sensitive content and search. Never stored on server.
  2. **Guest GraphQL:** Unauthenticated Twitter web endpoints with automatic rotating guest tokens.
  3. **Syndication CDN:** High-speed mirror of public tweets, videos, poll cards, and community notes without auth tokens.
  4. **Nitter Instances Pool:** Configurable rotating pool of open-source instances with circuit breakers.
  5. **Local LRU Cache:** Resilient cached layer served with an update timestamp when all live providers fail.
  6. **Wayback Machine:** Internet Archive lookup for recovering deleted or censored tweets.
- **Privacy & Anonymity:**
  - **Media Proxy:** Every single image, avatar, video stream, and link preview is proxied through the backend.
  - **Zero Tracking:** EXIF and metadata stripped, tracking parameters (`s`, `t`, `ref_src`, `twclid`) purged from URLs.
  - **No Telemetry / No Logging:** Zero logging of user IP addresses or search queries.
  - **Emergency Panic Purge:** One-click instant wipe (`Shift+P`) of all local caches, cookies, IndexedDB, and state.
- **On-Device Recommendation Engine:**
  - "For You" ranking runs entirely in browser memory:
    `score = w1*recency_decay + w2*topic_affinity + w3*engagement_velocity + w4*source_diversity - w5*repetition_penalty`
  - Adjustable weights in Settings + "Why am I seeing this?" transparent factor breakdown on every post.
- **Deep Thread Thinker & Fact-Checker:**
  - Integrated with Google Gemini 3.1 Pro Preview with HIGH thinking mode (`ThinkingLevel.HIGH`) to objectively break down arguments, verify claims against evidence, and surface counter-perspectives.
- **News Channel:**
  - Clustered and deduplicated RSS/Atom news feeds using TF-IDF and cosine similarity without paid ML APIs.
- **Downloads & Exports:**
  - Original quality image downloads and proxied video streams.
  - Export threads as **Markdown**, **JSON**, **Plain Text**, and **PDF** (rendered cleanly via `pdfkit`).
  - "Read as Article" reader mode.
- **Progressive Web App (PWA):**
  - Offline mode via service worker, manifest, in-app install prompt for iOS and Android.

---

## Quickstart

### Prerequisites
- Node.js 20+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/Nikoskampourakis/Viewable-.git
cd viewable
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key environment variables:
- `PORT`: Server port (default: 3000)
- `GEMINI_API_KEY`: Required for Gemini 3.1 Pro Thinking Mode
- `PROXY_URL`: Optional outbound Tor or HTTP/SOCKS proxy (e.g. `socks5://127.0.0.1:9050`)
- `NITTER_INSTANCES`: Comma-separated list of custom Nitter mirrors

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Production Run
```bash
npm run build
npm start
```

---

## Docker & Self-Hosting

### Using Docker Compose
```bash
docker compose up -d
```

### Plain Docker
```bash
docker build -t viewable .
docker run -d -p 3000:3000 --env-file .env viewable
```

---

## Posting & Free-Tier X API Limitations

Viewable allows you to connect your own X account via OAuth 2.0 PKCE or user credentials:
1. Obtain credentials from the [Twitter Developer Portal](https://developer.twitter.com/).
2. Under the Free tier, X enforces strict rate limits:
   - **Monthly Write Limit:** 1,500 posts / month
   - **Daily Limit:** ~50 tweets / 24 hours
   - **Read Limit:** Strictly zero public search API access on the Free Tier (Viewable solves this via the fallback chain + BYO cookies!).
3. All access tokens stay stored in your local browser storage. Viewable's backend acts purely as a stateless relay.

---

## Known Limitations & Fallback Coverage

| Threat / Upstream Issue | What Breaks | How Fallback Chain Covers It |
|---|---|---|
| **Guest Token Ban Wave** | Guest GraphQL returns 429/403 | Automatically routes to Syndication CDN + Nitter pool within 15 seconds via circuit breaker. |
| **Tweet Deleted / Censored** | Upstream returns 404 Not Found | Wayback Machine Provider checks archive.org snapshot snapshots to restore text and author. |
| **All Live Providers Down** | Network blackout / strict rate-limit | Cache Provider automatically serves last known version with a *"Served from cache, last updated X"* indicator. |
| **Sensitive / Age-Gated Post** | Unauthenticated endpoints return tombstone | Use BYO session cookies (`auth_token` and `ct0`) entered in Settings. Stored only in browser memory. |
| **Search Disabled on Guest** | Guest GraphQL blocked on search | Falling back to user-session, Nitter RSS search, or local cached search index. |
