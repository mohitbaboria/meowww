// utils/customColorRoles.js
//
// Everything for the custom color roles feature in one place: config,
// hex validation/normalization, the JSON store, and the role create/edit
// logic. Merge CONFIG's keys into your existing config file if you'd
// rather keep config centralized — everything else can stay here as-is.

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------
// config — replace placeholder IDs before deploying
// ---------------------------------------------------------------------
const CONFIG = {
  CUSTOM_COLOR_ACCESS_ROLE_ID: "1522174692876615771",
  CUSTOM_COLOR_ANCHOR_ROLE_ID: "1522951951568998543",


DEFAULT_COLOR_ROLE_IDS: [
  "1525078374970560584",
  "1525078377243873343",
  "1525078389357019136",
  "1525078379806851154",
  "1525078398047748106",
  "1525078395979829379",
  "1525078393756979310",
  "1525078391735193772",
  "1525078382629617744",
  "1525078400123801610",
  "1525078402162360542",
  "1525078406256001105",
  "1525078404150460478",
  "1525078408516730880",
  "1525078384265400381",
  "1525216637907632259",
  "1525217063965036634",
  "1525078412534874284",
  "1525078410504704120",
  "1525078415282012190"
],

  BLOCKED_COLORS: [
    "#5865F2", // discord blurple
    "#2F3136", // dark theme embed background
    "#36393F", // dark theme chat background
    "#000000",
    "#FFFFFF",
    "#FF0000", // reserved for admin/mod alerts — adjust to your server
  ],

  PREDEFINED_COLORS: {
    Lavender: "#B57EDC",
    Sakura: "#FFB7C5",
    Mint: "#98FF98",
    Magenta: "#FF00FF",
    Coral: "#FF7F50",
    Ocean: "#1CA9C9",
    Peach: "#FFDAB9",
    Rose: "#FF66CC",
    Plum: "#8E4585",
    Emerald: "#50C878",
    Orchid: "#DA70D6",
    Periwinkle: "#CCCCFF",
    Sage: "#9CAF88",
    Sky: "#87CEEB",
    Steel: "#4682B4",
    Amber: "#FFBF00",
    Crimson: "#DC143C",
    Aqua: "#00FFFF",
    Ivory: "#FFFFF0",
    Sunset: "#FD5E53",
    Lilac: "#C8A2C8",
    Blush: "#FFC0CB",
    Teal: "#008080",
    Indigo: "#4B0082",
    Gold: "#FFD700",
    Slate: "#708090",
  },
};

// ---------------------------------------------------------------------
// hex helpers
// ---------------------------------------------------------------------
const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
 
function normalizeHex(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!HEX_RE.test(trimmed)) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}
 
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}
 
function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
 
function colorDistance(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
}
 
// Only flags colors that are visually indistinguishable from pure black
// or pure white — not merely "dark" or "light" in general (navy, maroon,
// forest green, etc. should all pass fine).
function isUnreadable(hex, threshold = 20) {
  return colorDistance(hex, "#000000") < threshold || colorDistance(hex, "#FFFFFF") < threshold;
}
 
function isBlocked(hex, blockedColors, threshold = 20) {
  return blockedColors.some((blocked) => {
    const normalizedBlocked = normalizeHex(blocked);
    if (!normalizedBlocked) return false;
    if (normalizedBlocked === hex) return true;
    return colorDistance(hex, normalizedBlocked) < threshold;
  });
}
 
function validateHex(input, blockedColors = CONFIG.BLOCKED_COLORS) {
  const normalized = normalizeHex(input);
  if (!normalized) {
    return { ok: false, reason: "that doesn't look like a valid hex code — try something like #7289DA" };
  }
  if (isUnreadable(normalized)) {
    return { ok: false, reason: "that color's too close to pure black or white to be readable, pick something with a bit more contrast" };
  }
  if (isBlocked(normalized, blockedColors)) {
    return { ok: false, reason: "that color's reserved and can't be used, try a different shade" };
  }
  return { ok: true, hex: normalized };
}
 
// ---------------------------------------------------------------------
// JSON store
// ---------------------------------------------------------------------
const DB_PATH = path.join(__dirname, "..", "data", "customColors.json");
 
function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { users: parsed.users ?? {}, colors: parsed.colors ?? {} };
  } catch (err) {
    return { users: {}, colors: {} };
  }
}
 
function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
 
function getUserEntry(userId) {
  return readDb().users[userId] ?? null;
}
 
// true if any *other* user still references this roleId
function roleStillUsed(db, roleId, excludeUserId) {
  return Object.entries(db.users).some(
    ([uid, entry]) => uid !== excludeUserId && entry.roleId === roleId
  );
}
 
// ---------------------------------------------------------------------
// role management
// ---------------------------------------------------------------------
async function removeDefaultColorRoles(member, config = CONFIG) {
  const toRemove = (config.DEFAULT_COLOR_ROLE_IDS ?? []).filter((id) => member.roles.cache.has(id));
  if (toRemove.length > 0) {
    await member.roles.remove(toRemove, "assigning custom color role");
  }
}
 
// C • 7289DA for a freehand hex, P • B57EDC for a predefined pick
function buildRoleName(hex, isPredefined) {
  return `${isPredefined ? "P" : "C"} • ${hex.replace("#", "")}`;
}
 
function getTargetPosition(guild, anchorRoleId) {
  const anchor = guild.roles.cache.get(anchorRoleId);
  if (!anchor) return undefined;
  return Math.max(anchor.position - 1, 1);
}
 
/**
 * Creates or reuses a shared-per-hex color role for a member, removing
 * them from any previous custom role they held (deleting it if no one
 * else is still using it).
 *
 * @returns {Promise<{ok: true, role} | {ok: false, reason: string}>}
 */
async function upsertCustomColorRole({ member, hex, isPredefined, config = CONFIG }) {
  const guild = member.guild;
  const db = readDb();
  const userId = member.id;
  const previousEntry = db.users[userId];
 
  await removeDefaultColorRoles(member, config);
 
  // reuse an existing role for this hex if one exists and is still valid
  let role = db.colors[hex] ? guild.roles.cache.get(db.colors[hex]) ?? null : null;
 
  if (!role) {
    role = await guild.roles.create({
      name: buildRoleName(hex, isPredefined),
      color: hex,
      position: getTargetPosition(guild, config.CUSTOM_COLOR_ANCHOR_ROLE_ID),
      reason: "creating shared custom color role",
    });
    db.colors[hex] = role.id;
  }
 
  // drop the member from their previous custom role if it's a different one
  if (previousEntry && previousEntry.roleId !== role.id) {
    if (member.roles.cache.has(previousEntry.roleId)) {
      await member.roles.remove(previousEntry.roleId, "switching custom color").catch(() => {});
    }
    if (!roleStillUsed(db, previousEntry.roleId, userId)) {
      const oldRole = guild.roles.cache.get(previousEntry.roleId);
      if (oldRole) await oldRole.delete("no longer used by anyone").catch(() => {});
      if (previousEntry.hex) delete db.colors[previousEntry.hex];
    }
  }
 
  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, "assigning custom color role");
  }
 
  db.users[userId] = { roleId: role.id, hex, predefined: !!isPredefined };
  writeDb(db);
 
  return { ok: true, role };
}
 
/** Used on member leave — removes their record and deletes the role if unused. */
async function deleteUserCustomRole(guild, userId) {
  const db = readDb();
  const entry = db.users[userId];
  if (!entry) return;
 
  delete db.users[userId];
 
  if (!roleStillUsed(db, entry.roleId, userId)) {
    const role = guild.roles.cache.get(entry.roleId);
    if (role) await role.delete("custom color role no longer used").catch(() => {});
    if (entry.hex) delete db.colors[entry.hex];
  }
 
  writeDb(db);
}
 
 /**
 * Used when a member picks a default color role — strips their custom
 * role off them, removes their DB entry, and deletes the shared role
 * if no one else is still using it.
 */
async function removeCustomColorRoleFromMember(member) {
  const db = readDb();
  const userId = member.id;
  const entry = db.users[userId];
  if (!entry) return { removed: false };

  delete db.users[userId];

  if (member.roles.cache.has(entry.roleId)) {
    await member.roles.remove(entry.roleId, "switching to a default color role").catch(() => {});
  }

  if (!roleStillUsed(db, entry.roleId, userId)) {
    const role = member.guild.roles.cache.get(entry.roleId);
    if (role) await role.delete("no longer used by anyone").catch(() => {});
    if (entry.hex) delete db.colors[entry.hex];
  }

  writeDb(db);
  return { removed: true, roleId: entry.roleId };
}
    
module.exports = {
  CONFIG,
  normalizeHex,
  validateHex,
  getUserEntry,
  removeDefaultColorRoles,
  buildRoleName,
  upsertCustomColorRole,
  deleteUserCustomRole,
  removeCustomColorRoleFromMember, 
};
 