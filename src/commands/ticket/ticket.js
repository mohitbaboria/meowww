// commands/ticket.js
const { SlashCommandBuilder } = require('discord.js');
const { buildTicketModal } = require('../../utils/ticketUi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a support ticket'),

  async execute(interaction) {
    return interaction.showModal(buildTicketModal());
  },
};
