// ── Configuration ─────────────────────────────────────────────────────────────
const TEMPLATE_CHANNEL_IDS = [
  '1486719769473454120',
  '1486720119655759882',
  '1486720145526096103',
  '1486720168338919455',
];

const MAX_CLONES      = 7;
const DELETE_DELAY_MS = 60_000;

// ── State ─────────────────────────────────────────────────────────────────────
/** Map<templateId, Set<cloneId>> */
const cloneMap      = new Map();
/** Map<cloneId, TimeoutId> */
const deleteTimers  = new Map();
/** Set<templateId> — guards against concurrent clone creation */
const creatingClone = new Set();

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSortedClones(templateId) {
  return [...(cloneMap.get(templateId) ?? [])];
}

function parseCloneNumber(name) {
  const m = name.match(/\[(\d+)\]$/);
  return m ? parseInt(m[1], 10) : null;
}

function baseName(channel) {
  return channel.name.replace(/\s*\[\d+\]$/, '');
}

async function renumberAndReposition(guild, templateId) {
  const template = guild.channels.cache.get(templateId);
  if (!template) return;

  const cloneIds = getSortedClones(templateId);

  const cloneChannels = cloneIds
    .map(id => guild.channels.cache.get(id))
    .filter(Boolean)
    .sort((a, b) => (parseCloneNumber(a.name) ?? 0) - (parseCloneNumber(b.name) ?? 0));

  const base = baseName(template);

  for (let i = 0; i < cloneChannels.length; i++) {
    const ch            = cloneChannels[i];
    const expectedName  = `${base} [${i + 1}]`;
    const expectedPos   = template.position + 1 + i;
    const edits         = {};

    if (ch.name !== expectedName) edits.name      = expectedName;
    if (ch.position !== expectedPos) edits.position = expectedPos;

    if (Object.keys(edits).length) {
      await ch.edit(edits).catch(console.error);
    }
  }
}

async function createCloneAndMove(guild, templateId, member) {
  if (creatingClone.has(templateId)) {
    await new Promise(res => setTimeout(res, 1500));
    const clones = getSortedClones(templateId);
    if (clones.length > 0) {
      const latestClone = guild.channels.cache.get(clones[clones.length - 1]);
      if (latestClone) await member.voice.setChannel(latestClone).catch(console.error);
    }
    return null;
  }

  creatingClone.add(templateId);

  try {
    const template = guild.channels.cache.get(templateId);
    if (!template) return null;

    const existingClones = getSortedClones(templateId);
    if (existingClones.length >= MAX_CLONES) {
      console.log(`[AutoVC] Clone limit (${MAX_CLONES}) reached for "${template.name}"`);
      return null;
    }

    const { ChannelType } = require('discord.js');
    const nextNumber = existingClones.length + 1;
    const base       = baseName(template);
    const cloneName  = `${base} [${nextNumber}]`;

    const permissionOverwrites = [...template.permissionOverwrites.cache.values()].map(o => ({
      id:    o.id,
      type:  o.type,
      allow: o.allow,
      deny:  o.deny,
    }));

    const clone = await guild.channels.create({
      name:               cloneName,
      type:               ChannelType.GuildVoice,
      parent:             template.parentId,
      bitrate:            template.bitrate,
      userLimit:          template.userLimit,
      permissionOverwrites,
      position:           template.position + nextNumber,
      reason:             'AutoVC: clone created',
    });

    if (!cloneMap.has(templateId)) cloneMap.set(templateId, new Set());
    cloneMap.get(templateId).add(clone.id);

    console.log(`[AutoVC] Created clone "${clone.name}" (${clone.id}) for template ${templateId}`);

    if (member?.voice?.channel) {
      await member.voice.setChannel(clone).catch(err =>
        console.error(`[AutoVC] Failed to move ${member.user.tag} to clone:`, err)
      );
      console.log(`[AutoVC] Moved ${member.user.tag} → "${clone.name}"`);
    }

    await renumberAndReposition(guild, templateId);
    return clone;

  } catch (err) {
    console.error('[AutoVC] Failed to create clone:', err);
    return null;
  } finally {
    creatingClone.delete(templateId);
  }
}

function scheduleDelete(guild, templateId, cloneId) {
  if (deleteTimers.has(cloneId)) return;

  const timer = setTimeout(async () => {
    deleteTimers.delete(cloneId);

    const ch = guild.channels.cache.get(cloneId);
    if (!ch || ch.members.size > 0) return;

    console.log(`[AutoVC] Auto-deleting empty clone "${ch.name}" (${cloneId})`);
    cloneMap.get(templateId)?.delete(cloneId);
    await ch.delete('AutoVC: channel empty').catch(console.error);
    await renumberAndReposition(guild, templateId);
  }, DELETE_DELAY_MS);

  deleteTimers.set(cloneId, timer);
}

function cancelDelete(cloneId) {
  const timer = deleteTimers.get(cloneId);
  if (timer) {
    clearTimeout(timer);
    deleteTimers.delete(cloneId);
    console.log(`[AutoVC] Cancelled deletion timer for clone ${cloneId}`);
  }
}

function getTemplateIdForClone(cloneId) {
  for (const [templateId, clones] of cloneMap) {
    if (clones.has(cloneId)) return templateId;
  }
  return null;
}

module.exports = {
  TEMPLATE_CHANNEL_IDS,
  cloneMap,
  createCloneAndMove,
  scheduleDelete,
  cancelDelete,
  getTemplateIdForClone,
  renumberAndReposition,
};
