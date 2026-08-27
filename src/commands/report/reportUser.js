const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');

const { isOnCooldown } = require('../../utils/reportUtils');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Report User')
    .setType(ApplicationCommandType.User),

  async execute(interaction) {

    if (isOnCooldown(interaction.user.id)) {
      return interaction.reply({ content: '⏳ Cooldown active.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder()
      .setCustomId(`reportUser_${interaction.targetId}`)
      .setTitle('Report User');

    const input = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
};