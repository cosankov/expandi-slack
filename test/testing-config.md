# Testing Configuration

## Vercel Deployment
- **URL:** https://expandi-slack.vercel.app
- **Project:** cosankovs-projects/expandi-slack
- **Dashboard:** https://vercel.com/cosankovs-projects/expandi-slack/settings

## Test Slack Incoming Webhook
- **Slack URL:** `<your-slack-webhook-url>`
- **Base64url slug:** `<base64url-encoded-slack-url>`

## Webhook Endpoint (for Expandi / Clay)
```
https://expandi-slack.vercel.app/api/hook/<your-base64url-slug>
```

## Clay HTTP API Request Configuration

**Method:** POST

**URL:**
```
https://expandi-slack.vercel.app/api/hook/<your-base64url-slug>
```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
See test/fixture-reply.json
```

## Quick Test (curl)
```bash
curl -X POST "https://expandi-slack.vercel.app/api/hook/<your-base64url-slug>" \
  -H "Content-Type: application/json" \
  -d @test/fixture-reply.json
```

## Phase 2 Plan
Users won't need to generate URLs manually. Inside Expandi app:
1. User enters their Slack Incoming Webhook URL in Expandi settings
2. Selects which event(s) to notify on (starting with "Message Replied")
3. Expandi stores the webhook URL and auto-configures the relay endpoint
4. Later: "Add to Slack" OAuth button replaces manual webhook URL entry
