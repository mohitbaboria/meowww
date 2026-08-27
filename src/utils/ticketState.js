// utils/ticketState.js — Persists ticket data to tickets.json keyed by thread ID.
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../tickets.json');

/** @returns {{ [threadId: string]: TicketData }} */
function load() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * @typedef {Object} TicketData
 * @property {string}      threadId
 * @property {string}      messageId        — ID of the original ticket container message
 * @property {string}      creatorId
 * @property {string}      creatorTag       — username#discriminator or username
 * @property {string}      creatorAvatar    — avatar URL
 * @property {string}      context          — user's issue text
 * @property {string|null} attachmentUrl
 * @property {string}      openedAt         — ISO timestamp
 * @property {'open'|'closed'} status
 * @property {CloseInfo|null} closeInfo
 */

/**
 * @typedef {Object} CloseInfo
 * @property {string}      closedById
 * @property {string}      closedByTag
 * @property {string|null} reason
 * @property {string}      closedAt         — ISO timestamp
 */

function get(threadId) {
  return load()[threadId] ?? null;
}

function set(threadId, data) {
  const all = load();
  all[threadId] = data;
  save(all);
}

function update(threadId, patch) {
  const all = load();
  if (!all[threadId]) throw new Error(`No ticket for thread ${threadId}`);
  all[threadId] = { ...all[threadId], ...patch };
  save(all);
}

module.exports = { get, set, update };
