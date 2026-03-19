// Run: node test/test-local.js
// Tests the formatter locally and optionally sends to a real Slack webhook

const { buildSlackPayload } = require('../lib/format');
const fixture = require('./fixture-reply.json');

// Format the payload
const slackPayload = buildSlackPayload(fixture);

console.log('=== Slack Payload ===');
console.log(JSON.stringify(slackPayload, null, 2));

// If you want to test against a real Slack webhook, pass it as an argument:
// node test/test-local.js https://hooks.slack.com/services/T00/B00/xxx
const slackUrl = process.argv[2];
if (slackUrl) {
  console.log(`\nSending to: ${slackUrl}`);
  fetch(slackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackPayload),
  })
    .then((res) => {
      console.log(`Slack responded: ${res.status}`);
      return res.text();
    })
    .then((body) => console.log('Body:', body))
    .catch((err) => console.error('Error:', err.message));
} else {
  console.log('\nTo send to Slack: node test/test-local.js https://hooks.slack.com/services/T00/B00/xxx');
}
