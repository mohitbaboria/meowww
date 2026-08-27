const { Events } = require('discord.js');
const {
  cloneMap,
  cancelDelete,
  getTemplateIdForClone,
  renumberAndReposition,
} = require('./state');

module.exports = {
  name: Events.ChannelDelete,

  async execute(channel, client) {
    const templateId = getTemplateIdForClone(channel.id);
    if (!templateId) return;

    console.log(`[AutoVC] Clone "${channel.name}" was manually deleted — renumbering…`);

    cancelDelete(channel.id);
    cloneMap.get(templateId)?.delete(channel.id);

    const guild = client.guilds.cache.find(g => g.channels.cache.has(templateId));
    if (guild) await renumberAndReposition(guild, templateId);
  },
};
