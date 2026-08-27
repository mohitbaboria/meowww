// ─── One-off migration: backfill currentCount / lastUserId ────────────────────
// Run this ONCE after deploying the persisted-state version of the counting
// handlers, then delete this file. It scans existing channel/thread history
// (the old way) just once, to seed the new settings JSONs, so the count
// doesn't reset to 0 on first message after deploy.
//
// Usage:  node migrate-counting-state.js

const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const COUNTING_CHANNEL_ID = "1519239849947697162";
const COUNTING_THREAD_NAME = "counting";

const CHANNEL_SETTINGS_PATH = path.join(__dirname, "src", "countingSettings.json");
const THREAD_SETTINGS_PATH  = path.join(__dirname, "src", "countingThreadSettings.json");

function snap(n) {
  return Math.round(n * 1e10) / 1e10;
}

function evaluateExpression(raw) {
  let expr = raw
    .trim()
    .toLowerCase()
    .replace(/\bpi\b/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(
      /\b(sqrt|cbrt|abs|ceil|floor|round|log|log2|log10|sin|cos|tan|sign|trunc)\s*\(/g,
      (_, fn) => `Math.${fn}(`
    );

  if (!/^[\d\s+\-*/%.^()Math.a-z_]+$/i.test(expr)) return null;
  if (/[a-zA-Z]/.test(expr.replace(/Math\.\w+/g, ""))) return null;

  try {
    const result = Function('"use strict"; return (' + expr + ")")();
    if (typeof result !== "number" || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// Walks history newest -> oldest, stopping at the old resetMessageId if present
// (so a prior reset marker still bounds the scan correctly).
async function findLastCount(channelLike, resetMessageId) {
  let before = undefined;

  while (true) {
    const batch = await channelLike.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;

    for (const msg of batch.values()) {
      if (resetMessageId && msg.id === resetMessageId) {
        return { currentCount: 0, lastUserId: null };
      }
      if (msg.author.bot) continue;

      const result = evaluateExpression(msg.content);
      if (result !== null) return { currentCount: snap(result), lastUserId: msg.author.id };
    }

    before = batch.last()?.id;
    if (!before) break;
  }

  return { currentCount: 0, lastUserId: null };
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  console.log(`logged in as ${client.user.tag}, starting migration...`);

  try {
    // ── Channel counting ──────────────────────────────────────────────────────
    const channelSettings = readJson(CHANNEL_SETTINGS_PATH);
    const channel = await client.channels.fetch(COUNTING_CHANNEL_ID).catch(() => null);

    if (channel) {
      const { currentCount, lastUserId } = await findLastCount(channel, channelSettings.resetMessageId);
      delete channelSettings.resetMessageId;
      writeJson(CHANNEL_SETTINGS_PATH, { ...channelSettings, currentCount, lastUserId });
      console.log(`channel counting -> currentCount: ${currentCount}, lastUserId: ${lastUserId}`);
    } else {
      console.log("could not fetch counting channel, skipped.");
    }

    // ── Thread counting ───────────────────────────────────────────────────────
    const threadSettings = readJson(THREAD_SETTINGS_PATH);
    let thread = null;
    for (const guild of client.guilds.cache.values()) {
      const active = await guild.channels.fetchActiveThreads().catch(() => null);
      const found = active?.threads.find(
        (t) => t.name.toLowerCase() === COUNTING_THREAD_NAME.toLowerCase()
      );
      if (found) {
        thread = found;
        break;
      }
    }

    if (thread) {
      const { currentCount, lastUserId } = await findLastCount(thread, threadSettings.resetMessageId);
      delete threadSettings.resetMessageId;
      writeJson(THREAD_SETTINGS_PATH, { ...threadSettings, currentCount, lastUserId });
      console.log(`thread counting -> currentCount: ${currentCount}, lastUserId: ${lastUserId}`);
    } else {
      console.log("could not find counting thread (only checks active threads), skipped.");
    }

    console.log("migration done.");
  } catch (err) {
    console.error("migration failed:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.TOKEN);