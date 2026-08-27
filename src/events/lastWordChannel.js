const { Events, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const LASTWORD_CHANNEL_ID = "1519239825738432592";
const WARNING_DELETE_DELAY_MS = 5_000;
const REACT_DELETE_DELAY_MS = 1_000;

// ─── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_PATH = path.join(__dirname, "..", "wordChainSettings.json");
const DEFAULT_SETTINGS = { allowWarnings: true, allowConsecutive: false, repeatWindow: 50 };

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// ─── Rules embed ──────────────────────────────────────────────────────────────

function buildRulesEmbed() {
  const s = loadSettings();
  return new EmbedBuilder()
    .setColor(0x8ea89b)
    .setTitle("word chain")
    .setDescription(
      "send a single word that starts with the last letter of the previous word.\nkeep the chain going as long as you can."
    )
    .addFields(
      {
        name: "rules",
        value: [
          "· one word only, must be a real english word",
          "· must start with the last letter of the previous word",
          `· no repeats within the last ${s.repeatWindow} words`,
          `· ${s.allowConsecutive ? "anyone can send anytime" : "you can't send two words in a row — let someone else go first"}`,
          "· invalid messages are removed quietly",
        ].join("\n"),
      },
      { name: "example", value: "apple → **e**lephant → **t**rain → **n**ight → **t**iger → ..." },
      { name: "reactions", value: "🔤 accepted  ·  ❌ invalid  ·  🔁 already used" }
    )
    .setFooter({ text: "good luck :]" });
}

// ─── Word helpers ─────────────────────────────────────────────────────────────

function extractWord(content) {
  const trimmed = content.trim().toLowerCase();
  return /^[a-z]+$/.test(trimmed) ? trimmed : null;
}

async function isValidWord(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    return true;
  } catch {
    return true;
  }
}

// ─── History reader ───────────────────────────────────────────────────────────

async function getRecentWords(channel, beforeMessageId, limit) {
  const collected = [];
  let before = beforeMessageId;

  while (collected.length < limit) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    for (const msg of batch.values()) {
      if (msg.author.bot) continue;
      if (msg.content.trim().toLowerCase() === "!send") continue;
      const word = extractWord(msg.content);
      if (word) {
        collected.push({ word, userId: msg.author.id });
        if (collected.length >= limit) break;
      }
    }
    before = batch.last()?.id;
    if (!before) break;
  }

  return collected.reverse();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

async function sendWarning(channel, content) {
  const msg = await channel.send({ content }).catch(() => null);
  if (msg && WARNING_DELETE_DELAY_MS > 0)
    setTimeout(() => msg.delete().catch(() => {}), WARNING_DELETE_DELAY_MS);
}

async function reactThenDelete(message, emoji) {
  await message.react(emoji).catch(() => {});
  setTimeout(() => message.delete().catch(() => {}), REACT_DELETE_DELAY_MS);
}

// ─── Event ────────────────────────────────────────────────────────────────────

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.id !== LASTWORD_CHANNEL_ID) return;

    const channel = message.channel;
    const settings = loadSettings();

    // ── !send ─────────────────────────────────────────────────────────────────
    if (message.content.trim().toLowerCase() === "!send") {
      await message.delete().catch(() => {});
      const sent = await channel.send({ embeds: [buildRulesEmbed()] }).catch(() => null);
      if (sent) await sent.pin().catch(() => {});
      return;
    }

    // ── Validate: single alphabetic word ─────────────────────────────────────
    const incoming = extractWord(message.content);

    if (!incoming) {
      await reactThenDelete(message, "❌");
      if (settings.allowWarnings === true)
        await sendWarning(channel, `hey ${message.author.username}, one word only — no spaces or symbols.`);
      return;
    }

    // ── Dictionary check ──────────────────────────────────────────────────────
    const valid = await isValidWord(incoming);
    if (!valid) {
      await reactThenDelete(message, "❌");
      if (settings.allowWarnings === true)
        await sendWarning(channel, `"${incoming}" doesn't seem to be a valid word, ${message.author.username}.`);
      return;
    }

    // ── Fetch history ─────────────────────────────────────────────────────────
    const recent = await getRecentWords(channel, message.id, settings.repeatWindow);
    const previous = recent[recent.length - 1] ?? null;

    // ── Consecutive check ─────────────────────────────────────────────────────
    if (settings.allowConsecutive === false && previous && previous.userId === message.author.id) {
      await reactThenDelete(message, "❌");
      if (settings.allowWarnings === true)
        await sendWarning(channel, `let someone else go first, ${message.author.username}.`);
      return;
    }

    // ── Letter chain check ────────────────────────────────────────────────────
    if (previous) {
      const lastLetter = previous.word[previous.word.length - 1];
      if (incoming[0] !== lastLetter) {
        await reactThenDelete(message, "❌");
        if (settings.allowWarnings === true)
          await sendWarning(channel, `"${incoming}" doesn't start with **${lastLetter}**, ${message.author.username}.`);
        return;
      }
    }

    // ── Repeat check ──────────────────────────────────────────────────────────
    if (recent.map((r) => r.word).includes(incoming)) {
      await reactThenDelete(message, "🔁");
      if (settings.allowWarnings === true)
        await sendWarning(channel, `"${incoming}" was already used recently, ${message.author.username}.`);
      return;
    }

    // ── All good ──────────────────────────────────────────────────────────────
    await message.react("🔤").catch(() => {});
  },
};
