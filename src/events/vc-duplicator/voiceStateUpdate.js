const { Events } = require('discord.js');
const {
  TEMPLATE_CHANNEL_IDS,
  createCloneAndMove,
  scheduleDelete,
  cancelDelete,
  getTemplateIdForClone,
} = require('./state');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    if (newState.member?.user.bot) return;

    const { guild } = newState;
    const joinedId  = newState.channelId;
    const leftId    = oldState.channelId;
    const member    = newState.member;

    // ── Member joined a channel ───────────────────────────────────────────────
    if (joinedId) {
      const isTemplate = TEMPLATE_CHANNEL_IDS.includes(joinedId);
      const isClone    = !isTemplate && getTemplateIdForClone(joinedId) !== null;

      // Cancel pending deletion if they joined a clone
      if (isClone) cancelDelete(joinedId);

      // Joined a template channel (fresh join or cross-channel move)
      if (isTemplate && (!leftId || leftId !== joinedId)) {
        await createCloneAndMove(guild, joinedId, member);
      }
    }

    // ── Member left a channel ─────────────────────────────────────────────────
    if (leftId && leftId !== joinedId) {
      const templateId = getTemplateIdForClone(leftId);
      if (templateId) {
        const ch = guild.channels.cache.get(leftId);
        if (ch && ch.members.size === 0) {
          scheduleDelete(guild, templateId, leftId);
        }
      }
    }
  },
};
