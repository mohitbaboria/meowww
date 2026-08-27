const { Events } = require('discord.js');
const config = require('../config/showcaseConfig');
const {
  pendingReplies,
  getOrCreateThread,
  repostReplyIntoThread,
} = require('../utils/showcaseUtils');

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction) {
    // Ignore anything that isn't our button — lets other files handle
    // slash commands, other buttons, etc. without interference.
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('create_thread:')) return;

    const nonce = interaction.customId.split(':')[1];
    const pending = pendingReplies.get(nonce);

    if (!pending) {
      await interaction.reply({
        content: 'This request has expired. Please try replying again.',
        ephemeral: true,
      });
      return;
    }

    // Only let the original replier trigger this. Remove this check if you
    // want anyone to be able to create the thread.
    if (interaction.user.id !== pending.replyAuthorId) {
      await interaction.reply({
        content: 'Only the person who tried to reply can create this thread.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferUpdate();

      const originalChannel = await interaction.guild.channels.fetch(pending.originalChannelId);
      const originalMessage = await originalChannel.messages.fetch(pending.originalMessageId);

      const thread = await getOrCreateThread(originalMessage);

      // Explicitly add the person who clicked the button to the thread —
      // more reliable than depending on the @mention below to auto-add them.
      await thread.members.add(interaction.user.id).catch(() => {});

      const authorName = interaction.member?.displayName
        ?? interaction.user.globalName
        ?? interaction.user.username;

      await repostReplyIntoThread(thread, {
        authorName,
        content: pending.content,
        attachmentUrls: pending.attachmentUrls,
        mentionUserId: originalMessage.author.id !== interaction.user.id
          ? originalMessage.author.id
          : undefined,
      });

      await interaction.editReply({
        content: `<@${pending.replyAuthorId}>, your thread is ready: ${thread.url}`,
        components: [],
      });

      // This message never had an auto-delete timer (it started as a
      // button prompt, which has to stay visible until clicked). Now that
      // it's served its purpose, clean it up like any other warning.
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, config.WARNING_MESSAGE_LIFETIME_MS);

      pendingReplies.delete(nonce);
    } catch (err) {
      console.error('[showcase] create_thread button error:', err);
      await interaction.followUp({
        content: 'Something went wrong creating the thread. Please try again.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};