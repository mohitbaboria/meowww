// commands/close.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildCloseModal } = require('../../utils/ticketUi');
const state = require('../../utils/ticketState');
const config = require('../../config/ticketConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this support ticket (staff only)'),

  async execute(interaction) {
    const hasRole = interaction.member.roles.cache.has(config.STAFF_ROLE_ID);
    if (!hasRole) {
      return interaction.reply({
        content: '❌ You do not have permission to close tickets.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.channel?.isThread()) {
      return interaction.reply({
        content: '❌ This command can only be used inside a ticket thread.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = state.get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ This thread is not a ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.showModal(buildCloseModal());
  },
};
