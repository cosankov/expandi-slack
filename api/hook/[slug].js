const { buildSlackPayload } = require('../../lib/format');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Decode the Slack webhook URL from the path
  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: 'Missing webhook slug.' });
  }

  let slackUrl;
  try {
    slackUrl = Buffer.from(slug, 'base64url').toString('utf-8');
  } catch {
    return res.status(400).json({ error: 'Invalid webhook slug.' });
  }

  // Validate it's a Slack webhook URL
  if (!slackUrl.startsWith('https://hooks.slack.com/')) {
    return res.status(400).json({ error: 'Invalid Slack webhook URL.' });
  }

  // GET = health check (Expandi test webhook may send GET)
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'ready' });
  }

  // Parse the Expandi payload
  const payload = req.body;
  if (!payload || !payload.hook) {
    // Return 200 for empty/test payloads so Expandi's test passes
    return res.status(200).json({ ok: true, status: 'received', note: 'No hook object — test ping acknowledged.' });
  }

  // Format the Slack message
  const slackPayload = buildSlackPayload(payload);

  // POST to Slack
  try {
    const response = await fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Slack API error:', response.status, body);
      return res.status(502).json({
        error: 'Slack rejected the message.',
        status: response.status,
        detail: body,
      });
    }

    return res.status(200).json({
      ok: true,
      event: payload.hook.event,
      contact: [payload.contact?.first_name, payload.contact?.last_name].filter(Boolean).join(' ') || null,
    });
  } catch (err) {
    console.error('Failed to POST to Slack:', err.message);
    return res.status(502).json({ error: 'Failed to reach Slack.', detail: err.message });
  }
};
