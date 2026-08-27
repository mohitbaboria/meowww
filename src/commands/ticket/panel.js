// commands/panel.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildPanelComponents } = require('../../utils/ticketUi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the ticket panel (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.channel.send({
      components: [buildPanelComponents()],
      flags: MessageFlags.IsComponentsV2,
    });
    return interaction.reply({
      content: '✅ Panel uploaded successfully.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
