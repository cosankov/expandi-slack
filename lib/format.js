// Slack Block Kit message formatter for Expandi webhook events
// Docs: https://api.slack.com/block-kit

const EVENT_LABELS = {
  'linked_in_messenger.campaign_replied': { emoji: '💬', label: 'New Reply' },
  'linked_in_messenger.campaign_connected': { emoji: '🤝', label: 'Connection Accepted' },
  'linked_in_messenger.campaign_message_sent': { emoji: '📤', label: 'Message Sent' },
  'linked_in_messenger.campaign_invite_sent': { emoji: '📨', label: 'Connection Request Sent' },
  'linked_in_messenger.campaign_profile_visited': { emoji: '👁', label: 'Profile Visited' },
  'linked_in_messenger.campaign_post_liked': { emoji: '👍', label: 'Post Liked' },
  'linked_in_messenger.campaign_follow_sent': { emoji: '➕', label: 'Follow Sent' },
  'linked_in_messenger.campaign_company_follow_sent': { emoji: '🏢', label: 'Company Follow Sent' },
  'linked_in_messenger.campaign_endorsement_sent': { emoji: '⭐', label: 'Endorsement Sent' },
  'linked_in_messenger.campaign_contact_tagged': { emoji: '🏷', label: 'Contact Tagged' },
  'linked_in_messenger.campaign_contact_disconnected': { emoji: '🔌', label: 'Contact Disconnected' },
  'linked_in_messenger.campaign_contact_revoked': { emoji: '❌', label: 'Connection Revoked' },
  'linked_in_messenger.campaign_finished': { emoji: '✅', label: 'Campaign Finished' },
  'linked_in_messenger.campaign_email_sent': { emoji: '✉️', label: 'Email Sent' },
  'linked_in_messenger.campaign_email_opened': { emoji: '📬', label: 'Email Opened' },
  'linked_in_messenger.campaign_email_clicked': { emoji: '🔗', label: 'Email Link Clicked' },
  'linked_in_messenger.campaign_email_bounced': { emoji: '⚠️', label: 'Email Bounced' },
  'linked_in_messenger.campaign_first_reply': { emoji: '🎯', label: 'First Reply' },
  'linked_in_messenger.no_connection_requests_scheduled': { emoji: '📋', label: 'No Connection Requests Scheduled' },
  'linked_in_messenger.no_messages_scheduled': { emoji: '📋', label: 'No Messages Scheduled' },
  'linked_in_messenger.nothing_scheduled': { emoji: '📋', label: 'Nothing Scheduled' },
};

function getEventInfo(event) {
  return EVENT_LABELS[event] || { emoji: '🔔', label: event.split('.').pop().replace(/_/g, ' ') };
}

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('https://') || str.startsWith('http://');
}

function truncate(str, max = 300) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildContactSection(contact) {
  if (!contact) return [];

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';
  const title = contact.job_title ? truncate(contact.job_title, 100) : '';
  const company = contact.company;

  let companyLine = '';
  if (company) {
    const parts = [company.name];
    if (company.employee_count_start && company.employee_count_end) {
      parts.push(`${company.employee_count_start}-${company.employee_count_end} employees`);
    }
    if (company.location) parts.push(company.location);
    companyLine = parts.join(' · ');
  } else if (contact.company_name) {
    companyLine = contact.company_name;
  }

  const contactParts = [];
  if (contact.email) contactParts.push(`<mailto:${contact.email}|${contact.email}>`);
  if (contact.phone) contactParts.push(`<tel:${contact.phone}|${contact.phone}>`);
  const contactLine = contactParts.length > 0 ? contactParts.join('  ·  ') : '';

  let text = `*${name}*`;
  if (title) text += `\n${title}`;
  if (companyLine) text += `\n${companyLine}`;
  if (contactLine) text += `\n${contactLine}`;

  const section = {
    type: 'section',
    text: { type: 'mrkdwn', text },
  };

  if (isValidUrl(contact.image_link)) {
    section.accessory = {
      type: 'image',
      image_url: contact.image_link,
      alt_text: name,
    };
  }

  return [section];
}

function buildLinksSection(contact, messenger) {
  const buttons = [];

  if (isValidUrl(contact?.profile_link)) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'LinkedIn' },
      url: contact.profile_link,
    });
  }

  if (isValidUrl(messenger?.lead_inbox_link)) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Expandi Inbox' },
      url: messenger.lead_inbox_link,
    });
  }

  if (isValidUrl(contact?.sales_nav_link)) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Sales Nav' },
      url: contact.sales_nav_link,
    });
  }

  if (isValidUrl(messenger?.thread)) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Thread' },
      url: messenger.thread,
    });
  }

  if (buttons.length === 0) return [];
  return [{ type: 'actions', elements: buttons }];
}

// --- Event-specific formatters ---

function formatReply(payload) {
  const { hook, contact, messenger, campaign_instance_contact } = payload;
  const eventInfo = getEventInfo(hook.event);
  const campaign = messenger?.campaign_instance || 'Unknown Campaign';
  const sender = hook.li_account_name || 'Unknown';

  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `${eventInfo.emoji} ${eventInfo.label}` },
  });

  // Campaign + sender context
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `*Campaign:* ${campaign}  ·  *Sender:* ${sender}` },
    ],
  });

  // Contact info
  blocks.push(...buildContactSection(contact));

  // Their reply
  if (messenger?.last_received_message) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `💬 *Their reply:*\n>${truncate(messenger.last_received_message).split('\n').join('\n>')}`,
      },
    });
  }

  // What you sent
  if (messenger?.last_sent_message) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📤 *You sent:*\n>${truncate(messenger.last_sent_message).split('\n').join('\n>')}`,
      },
    });
  }

  // Stats
  const stats = [];
  if (campaign_instance_contact?.nr_steps_before_responding) {
    stats.push(`Steps before reply: *${campaign_instance_contact.nr_steps_before_responding}*`);
  }
  if (messenger?.connected_at) {
    stats.push(`Connected: *${formatDate(messenger.connected_at)}*`);
  }
  if (messenger?.last_received_message_datetime) {
    stats.push(`Replied: *${formatDate(messenger.last_received_message_datetime)}*`);
  }

  if (stats.length > 0) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: stats.join('  ·  ') }],
    });
  }

  // Action buttons
  blocks.push(...buildLinksSection(contact, messenger));

  return blocks;
}

function formatConnection(payload) {
  const { hook, contact, messenger } = payload;
  const eventInfo = getEventInfo(hook.event);
  const campaign = messenger?.campaign_instance || 'Unknown Campaign';
  const sender = hook.li_account_name || 'Unknown';

  const blocks = [];

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `${eventInfo.emoji} ${eventInfo.label}` },
  });

  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `*Campaign:* ${campaign}  ·  *Sender:* ${sender}` },
    ],
  });

  blocks.push(...buildContactSection(contact));

  if (messenger?.connected_at) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Connected: *${formatDate(messenger.connected_at)}*` }],
    });
  }

  blocks.push(...buildLinksSection(contact, messenger));

  return blocks;
}

function formatGenericAction(payload) {
  const { hook, contact, messenger } = payload;
  const eventInfo = getEventInfo(hook.event);
  const campaign = messenger?.campaign_instance || 'Unknown Campaign';
  const sender = hook.li_account_name || 'Unknown';

  const blocks = [];

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `${eventInfo.emoji} ${eventInfo.label}` },
  });

  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `*Campaign:* ${campaign}  ·  *Sender:* ${sender}` },
    ],
  });

  blocks.push(...buildContactSection(contact));
  blocks.push(...buildLinksSection(contact, messenger));

  return blocks;
}

function formatSystemEvent(payload) {
  const { hook } = payload;
  const eventInfo = getEventInfo(hook.event);
  const sender = hook.li_account_name || 'Unknown';

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${eventInfo.emoji} ${eventInfo.label}` },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Account:* ${sender}  ·  *Time:* ${formatDate(hook.fired_datetime)}` },
      ],
    },
  ];
}

// --- Main formatter ---

function formatExpandiPayload(payload) {
  const event = payload?.hook?.event || '';

  // Reply events — full message card
  if (event.includes('replied') || event.includes('first_reply')) {
    return formatReply(payload);
  }

  // Connection events
  if (event.includes('connected') || event.includes('invite_sent') || event.includes('revoked') || event.includes('disconnected')) {
    return formatConnection(payload);
  }

  // System/schedule events (no contact)
  if (event.includes('no_') || event.includes('nothing_scheduled')) {
    return formatSystemEvent(payload);
  }

  // Everything else (message sent, profile visited, post liked, etc.)
  return formatGenericAction(payload);
}

function buildSlackPayload(payload) {
  const blocks = formatExpandiPayload(payload);

  // Fallback text for notifications
  const event = payload?.hook?.event || 'unknown';
  const eventInfo = getEventInfo(event);
  const contactName = [payload?.contact?.first_name, payload?.contact?.last_name].filter(Boolean).join(' ');
  const campaign = payload?.messenger?.campaign_instance || '';

  let text = `${eventInfo.emoji} ${eventInfo.label}`;
  if (contactName) text += ` — ${contactName}`;
  if (campaign) text += ` (${campaign})`;

  return {
    text,
    blocks,
    username: 'Expandi Responses',
    icon_url: 'https://app.expandi.io/favicon.ico',
  };
}

module.exports = { buildSlackPayload, getEventInfo };
