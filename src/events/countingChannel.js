const { Events, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const COUNTING_CHANNEL_ID = "1519239849947697162";
const WARNING_DELETE_DELAY_MS = 5_000;
const MAX_LIVES = 3;

// ─── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_PATH = path.join(__dirname, "..", "countingSettings.json");
const DEFAULT_SETTINGS = {
  allowWarnings: true,
  allowConsecutive: false,
  lives: MAX_LIVES,
  currentCount: 0,   // persisted count — source of truth instead of re-reading history
  lastUserId: null,  // who sent the last accepted count
};

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function heartsDisplay(lives) {
  return "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, MAX_LIVES - lives));
}

// ─── Rules embed ──────────────────────────────────────────────────────────────

function buildRulesEmbed() {
  const s = loadSettings();
  return new EmbedBuilder()
    .setColor(0x9b8ea8)
    .setTitle("counting")
    .setDescription(
      "count up from 1, one message at a time.\nyou can send a plain number or a math expression — as long as it equals the next one."
    )
    .addFields(
      {
        name: "a few things to keep in mind",
        value: [
          "· only numbers or expressions — no plain text",
          "· wrong numbers cost a ❤️ — you have 3 total",
          "· lose all 3 and the count resets to 1",
          `· ${s.allowConsecutive ? "anyone can count anytime" : "you can't count twice in a row — let someone else go first"}`,
          "· bot messages and commands don't affect the count",
        ].join("\n"),
      },
      {
        name: "arithmetic",
        value: ["`1 + 1`  `10 - 3`  `6 * 7`", "`20 / 4`  `2 ** 10`  `10 % 3`"].join("\n"),
        inline: true,
      },
      {
        name: "functions",
        value: [
          "`sqrt(9)`  `cbrt(27)`  `abs(-5)`",
          "`floor(3.9)`  `ceil(3.1)`  `round(2.5)`",
          "`log2(8)`  `log10(100)`  `sin(pi/2)`",
        ].join("\n"),
        inline: true,
      },
      { name: "constants & grouping", value: "`pi`  `e`  `(2 + 3) * 4`", inline: true },
      { name: "reactions", value: "🔢 count accepted  ·  ✅ expression evaluated" }
    )
    .setFooter({ text: "good luck :]" });
}

// ─── Expression evaluator ─────────────────────────────────────────────────────

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

function snap(n) {
  return Math.round(n * 1e10) / 1e10;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

async function sendWarning(channel, content) {
  const msg = await channel.send({ content }).catch(() => null);
  if (msg && WARNING_DELETE_DELAY_MS > 0)
    setTimeout(() => msg.delete().catch(() => {}), WARNING_DELETE_DELAY_MS);
}

// ─── Event ────────────────────────────────────────────────────────────────────

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    const displayName = message.member?.displayName ?? message.author.username;
    if (message.author.bot) return;
    if (message.channel.id !== COUNTING_CHANNEL_ID) return;

    const channel  = message.channel;
    const settings = loadSettings();

    // ── !send ─────────────────────────────────────────────────────────────────
    if (message.content.trim().toLowerCase() === "!send") {
      await message.delete().catch(() => {});
      const sent = await channel.send({ embeds: [buildRulesEmbed()] }).catch(() => null);
      if (sent) await sent.pin().catch(() => {});
      return;
    }

    // ── Evaluate ──────────────────────────────────────────────────────────────
    const result = evaluateExpression(message.content);

    if (result === null) {
      await message.delete().catch(() => {});
      if (settings.allowWarnings === true)
        await sendWarning(channel, `hey ${displayName}, only numbers or math expressions here.`);
      return;
    }

    const incoming = snap(result);
    const lastCount  = typeof settings.currentCount === "number" ? settings.currentCount : 0;
    const lastUserId = settings.lastUserId ?? null;
    const expectedCount = lastCount + 1;

    // ── Consecutive check ─────────────────────────────────────────────────────
    if (settings.allowConsecutive === false && lastUserId === message.author.id) {
      await message.delete().catch(() => {});
      if (settings.allowWarnings === true)
        await sendWarning(channel, `let someone else go first, ${displayName}.`);
      return;
    }

    // ── Wrong number ──────────────────────────────────────────────────────────
    if (incoming !== expectedCount) {
      await message.delete().catch(() => {});

      let lives = typeof settings.lives === "number" ? settings.lives : MAX_LIVES;
      lives = Math.max(0, lives - 1);

      if (lives === 0) {
        await channel.send(
          `💔 **${displayName}** sent **${incoming}** and the count was lost.\n` +
          `starting over from **1** — lives restored. ${heartsDisplay(MAX_LIVES)}`
        ).catch(() => null);

        saveSettings({
          ...settings,
          lives: MAX_LIVES,
          currentCount: 0,
          lastUserId: null,
        });
      } else {
        saveSettings({ ...settings, lives });

        if (settings.allowWarnings === true) {
          await sendWarning(
            channel,
            lastCount > 0
              ? `that was ${incoming}, but we're on ${expectedCount}. count's still at ${lastCount}. ${heartsDisplay(lives)}`
              : `send 1 to start the count. ${heartsDisplay(lives)}`
          );
        }
      }
      return;
    }

    // ── Correct ───────────────────────────────────────────────────────────────
    await message.react("🔢").catch(() => {});
    if (!/^\s*-?\d+\s*$/.test(message.content)) await message.react("✅").catch(() => {});

    saveSettings({ ...settings, currentCount: incoming, lastUserId: message.author.id });
  },
};