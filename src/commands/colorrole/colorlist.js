// commands/colorlist.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { CONFIG } = require("../../utils/customColorRoles");

const FIELDS_PER_EMBED = 25;

module.exports = {
  data: new SlashCommandBuilder().setName("colorlist").setDescription("view every predefined custom color"),

  async execute(interaction) {
    const entries = Object.entries(CONFIG.PREDEFINED_COLORS);
    const embeds = [];

    for (let i = 0; i < entries.length; i += FIELDS_PER_EMBED) {
      const chunk = entries.slice(i, i + FIELDS_PER_EMBED);
      embeds.push(
        new EmbedBuilder()
          .setTitle(i === 0 ? "predefined colors" : "predefined colors (cont.)")
          .setColor(chunk[0][1])
          .addFields(chunk.map(([name, hex]) => ({ name, value: hex, inline: true })))
      );
    }

    return interaction.reply({ embeds, flags: MessageFlags.Ephemeral });
  },
};