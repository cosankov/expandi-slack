# Expandi → Slack Notification Relay

Receives Expandi webhook events and forwards them as formatted Slack messages via Incoming Webhooks.

## Architecture

```
Expandi fires webhook → Vercel serverless function → Formats to Slack Block Kit → POSTs to user's Slack Incoming Webhook
```

**Zero database.** The user's Slack webhook URL is Base64url-encoded into the endpoint path. The serverless function decodes it, formats the Expandi payload into a rich Slack message, and POSTs to Slack. Fully stateless.

## Project Structure

```
expandi-slack/
├── api/
│   └── hook/
│       └── [slug].js       ← Serverless function (Vercel route: /api/hook/:slug)
├── lib/
│   └── format.js           ← Slack Block Kit message formatter (all 27 event types)
├── public/
│   └── index.html           ← Setup page (paste Slack URL → get endpoint)
├── test/
│   ├── fixture-reply.json   ← Real Expandi webhook payload (campaign_replied event)
│   └── test-local.js        ← Local test script
├── package.json
├── vercel.json              ← Vercel routing config
└── README.md
```

## How It Works (User Flow)

1. User creates a Slack Incoming Webhook (Slack API → App → Incoming Webhooks → Add to channel)
2. User visits the setup page (`/index.html`)
3. Pastes their Slack webhook URL (e.g., `https://hooks.slack.com/services/T00/B00/xxx`)
4. Page generates a unique Expandi webhook endpoint by Base64url-encoding the Slack URL into the path
5. User copies the generated endpoint URL
6. In Expandi: **LinkedIn Settings → Webhooks → Add a webhook** → paste the endpoint URL → select event type
7. Done. Events fire from Expandi → land in Slack.

Reference: https://help.expandi.io/en/articles/5405651-webhook-events

## Supported Events (27 total)

The formatter handles all Expandi webhook events with event-specific layouts:

### Reply events (full message card with conversation context)
- `linked_in_messenger.campaign_replied` — Contact replied to campaign message
- `linked_in_messenger.campaign_first_reply` — Contact replied first time since start

### Connection events (contact card with connection status)
- `linked_in_messenger.campaign_connected` — Connection request accepted (campaign)
- `linked_in_messenger.campaign_invite_sent` — Connection request sent
- `linked_in_messenger.campaign_contact_disconnected` — Contact disconnected
- `linked_in_messenger.campaign_contact_revoked` — Connection revoked

### Generic action events (contact card with action label)
- `linked_in_messenger.campaign_message_sent` — Message sent
- `linked_in_messenger.campaign_profile_visited` — Profile visited
- `linked_in_messenger.campaign_post_liked` — Post liked
- `linked_in_messenger.campaign_follow_sent` — Follow sent
- `linked_in_messenger.campaign_company_follow_sent` — Company follow sent
- `linked_in_messenger.campaign_endorsement_sent` — Endorsement sent
- `linked_in_messenger.campaign_contact_tagged` — Contact tagged
- `linked_in_messenger.campaign_finished` — Campaign finished

### Email events
- `linked_in_messenger.campaign_email_sent` — Email sent
- `linked_in_messenger.campaign_email_opened` — Email opened
- `linked_in_messenger.campaign_email_clicked` — Email link clicked
- `linked_in_messenger.campaign_email_bounced` — Email bounced

### System events (no contact, account-level alerts)
- `linked_in_messenger.no_connection_requests_scheduled`
- `linked_in_messenger.no_messages_scheduled`
- `linked_in_messenger.nothing_scheduled`

## Slack Message Layout (Reply Event)

```
┌─────────────────────────────────────────────────┐
│ 💬 New Reply                                     │
│ Campaign: ABM | Email vs LinkedIn Research       │
│ Sender: Ilija Cosic                              │
│                                                   │
│ 👤 Darren Donohoe              [profile photo]   │
│ Commercial Sales Executive at Exclaimer          │
│ Exclaimer · 201-500 employees · Farnborough, GB  │
│ ─────────────────────────────────────────────    │
│ 💬 Their reply:                                  │
│ > "Calls are always king but it helps if an      │
│ > email goes out first..."                       │
│                                                   │
│ 📤 You sent:                                     │
│ > "doing a bit of research on the side..."       │
│                                                   │
│ Steps before reply: 14 · Connected: Mar 16       │
│ · Replied: Mar 17                                │
│                                                   │
│ [LinkedIn] [Expandi Inbox] [Sales Nav] [Thread]  │
└─────────────────────────────────────────────────┘
```

Every reply message includes:
- Header with event type emoji + label
- Campaign name + sender (which LinkedIn account sent the message)
- Contact section: name, job title, company (name, size, location), profile photo
- Their reply (quoted)
- What you sent (quoted)
- Stats: steps before reply, connected date, replied date
- Action buttons: LinkedIn profile, Expandi Inbox, Sales Navigator, LinkedIn Thread

## Expandi Webhook Payload Structure

The payload Expandi sends has 4 top-level objects:

```json
{
  "hook": {
    "id": 93993,
    "name": "Clay Responses",
    "event": "linked_in_messenger.campaign_replied",
    "li_account": 151890,
    "fired_datetime": "2026-03-17 17:29:48.635563+00:00",
    "li_account_name": "Ilija Cosic"
  },
  "contact": {
    "id": 28551940,
    "first_name": "Darren",
    "last_name": "Donohoe",
    "job_title": "Commercial Sales Executive at Exclaimer",
    "company": {
      "name": "Exclaimer",
      "website": "https://exclaimer.com/",
      "location": "Farnborough, GB",
      "employee_count_start": 201,
      "employee_count_end": 500
    },
    "profile_link": "https://www.linkedin.com/in/darren-donohoe-22b91727/",
    "sales_nav_link": "https://www.linkedin.com/sales/lead/...",
    "image_link": "https://media.licdn.com/...",
    "follower_count": 2845
  },
  "messenger": {
    "campaign_instance": "ABM | Email vs LinkedIn Research",
    "last_received_message": "Calls are always king...",
    "last_sent_message": "doing a bit of research...",
    "lead_inbox_link": "https://app.expandi.io/inbox?...",
    "thread": "https://www.linkedin.com/messaging/thread/...",
    "connected_at": "2026-03-16T15:41:17Z",
    "conversation_status": "Replied"
  },
  "campaign_instance_contact": {
    "id": 454772406,
    "nr_steps_before_responding": 14,
    "first_reply_datetime": "2026-03-16T17:04:35Z",
    "actions": {
      "pause": "https://api.liaufa.com/.../pause/",
      "resume": "https://api.liaufa.com/.../resume/"
    }
  }
}
```

## URL Encoding Scheme

The Slack webhook URL is encoded using Base64url (RFC 4648 §5) — URL-safe Base64 with `-` and `_` instead of `+` and `/`, no padding.

```
Slack URL:  https://hooks.slack.com/services/T00/B00/xxx
Encoded:    aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvVDAwL0IwMC94eHg
Endpoint:   https://<domain>/api/hook/aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvVDAwL0IwMC94eHg
```

The serverless function at `api/hook/[slug].js`:
1. Extracts the `slug` from the path
2. Base64url-decodes it to get the Slack webhook URL
3. Validates it starts with `https://hooks.slack.com/`
4. Formats the Expandi payload using `lib/format.js`
5. POSTs the formatted Slack Block Kit message to the decoded URL
6. Returns `200 OK` with event type and contact name

## Local Testing

```bash
# Test the formatter (prints formatted Slack payload to console)
cd expandi/tools/expandi-slack
node test/test-local.js

# Test with a real Slack webhook
node test/test-local.js https://hooks.slack.com/services/T00/B00/xxx
```

## Deploy to Vercel

```bash
cd expandi/tools/expandi-slack
vercel
```

Then point a domain (e.g., `slack.expandi.io`) to the Vercel deployment.

## Testing from Clay

Since the endpoint accepts any HTTP POST with the Expandi payload format, you can test directly from Clay:
1. Generate the endpoint URL using the setup page (or manually Base64url-encode your Slack webhook URL)
2. In Clay, use an HTTP API action → POST → paste the endpoint URL
3. Send the payload from the test fixture or a live Expandi webhook

## Phase Plan

### Phase 1 (Current) — Incoming Webhook Relay
- User creates Slack Incoming Webhook manually
- Pastes URL on setup page → gets endpoint
- Pastes endpoint into Expandi webhook settings
- No auth, no database, no app store review
- Same model as Instantly's Slack integration

### Phase 2 (Future) — Native Slack App
- OAuth 2.0 "Add to Slack" button (no manual webhook creation)
- Channel picker in the setup flow
- Event type filtering (choose which events go to Slack)
- Slack App Directory listing (marketplace distribution)
- Per-workspace configuration stored in database (Supabase or Vercel KV)
- Requires: landing page, privacy policy, Slack app review submission

## Tech Stack

| Layer | Tool |
|---|---|
| Hosting | Vercel (serverless) |
| Runtime | Node.js 18+ (single serverless function) |
| Frontend | Static HTML (no framework) |
| Message format | Slack Block Kit |
| Database | None (Phase 1) / Supabase or Vercel KV (Phase 2) |
| Domain | TBD (subdomain on expandi.io or standalone) |
