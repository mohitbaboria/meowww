const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/reports.json');

// Ensure data directory + file exist
function _ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir))  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}', 'utf8');
}

function _read() {
  _ensureFile();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function _write(data) {
  _ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** Generate a short unique report ID, e.g. "RPT-4f3a" */
function generateId() {
  return 'RPT-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Save a new report.
 * @param {object} report  Plain object with all report fields.
 * @returns {string}       The assigned report ID.
 */
function saveReport(report) {
  const data = _read();
  const id   = generateId();
  data[id]   = { ...report, id, status: 'open', resolvedBy: null, resolvedAt: null };
  _write(data);
  return id;
}

/**
 * Get a single report by ID.
 * @param {string} id
 * @returns {object|null}
 */
function getReport(id) {
  return _read()[id] ?? null;
}

/**
 * Update fields of an existing report.
 * @param {string} id
 * @param {object} updates  Partial fields to merge in.
 * @returns {object|null}   Updated report, or null if not found.
 */
function updateReport(id, updates) {
  const data   = _read();
  if (!data[id]) return null;
  data[id]     = { ...data[id], ...updates };
  _write(data);
  return data[id];
}

module.exports = { saveReport, getReport, updateReport, generateId };
