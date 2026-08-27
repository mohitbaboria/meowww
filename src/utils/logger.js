const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'showcase-debug.log');

function log(event, data = {}) {
  const entry = { time: new Date().toISOString(), event, ...data };
  const line = JSON.stringify(entry);
  console.log('[showcase]', line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (err) {
    console.error('[showcase] could not write log file:', err.message);
  }
}

module.exports = { log };