# GuardianSense Dashboard (Web)

The core command center of the GuardianSense ecosystem. Built with **Next.js 15**, **React 19**, and **Tailwind CSS 4**, this application serves both as the high-fidelity parent dashboard and the primary API backend for the mobile tracking client.

---

## 🚀 Technical Highlights

### 1. Fixed-Viewport Dashboard Layout
To handle high-density data (Live Maps + Timeline Events), we implemented a **Fixed-Viewport** strategy. This prevents the traditional "page scroll," ensuring that the map remains anchored as the source of truth while the sidebar and timeline scroll independently. This provides a professional, "app-like" feel common in sophisticated monitoring software.

### 2. "Instant-Apply" Settings (Notion UI)
The Settings Modal features an advanced auto-saving architecture:
- **Optimistic Syncing**: Changes are sent to the backend as soon as a field loses focus (`onBlur`) or is toggled.
- **Visual Feedback**: Real-time "Syncing..." and "Saved" status indicators provide immediate user feedback, mimicking the fluid UX of tools like Notion.
- **Unified Validation**: Uses shared Zod schemas from `@guardiansense/types` to ensure input sanitization before hitting the database.

### 3. Real-Time Data Pipeline
Leverages **Supabase Realtime (Postgres CDC)** to push location updates directly to the React state. This architecture handles device battery drops, zone transitions, and movement updates with sub-second latency, requiring zero manual refreshes from the parent.

---

## 📂 Key Architecture

- **`src/app/api`**: RESTful endpoints for child device ingestion and parent settings management.
- **`src/components/dashboard`**: A modular component library specializing in live data visualization (Maps, Status Cards, and Timelines).
- **`src/lib/dashboard`**: Specialized data loading logic optimized for Next.js Server Components.

---

## 🛠️ Environment Configuration

| Variable | Purpose | Location |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase) | Server |
| `NEXT_PUBLIC_SUPABASE_URL` | Client Integration | Both |
| `FIREBASE_*` | Admin SDK Auth | Server |
| `UPSTASH_REDIS_*` | Rate Limiting | Server |
| `TELEGRAM_BOT_TOKEN` | Alerts Logic | Server |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Dashboard Map Rendering | Client |

---

## 🏗️ Production Deployment

The app is optimized for **Vercel** with the following configuration:
1. **Framework**: Next.js (App Router).
2. **Build Command**: `npm run build`.
3. **Environment**: Ensure all secrets from `.env.local` are mirrored in the Vercel Dashboard.

After deployment, register the Telegram Webhook:
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d "url=https://<your-domain>/api/telegram/webhook"
```
