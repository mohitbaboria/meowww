// src/commands/colorrole/setcolor.js
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const {
  CONFIG,
  validateHex,
  normalizeHex,
  upsertCustomColorRole,
} = require("../../utils/customColorRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setcolor")
    .setDescription("create or update your custom color role")
    .addStringOption((option) =>
      option.setName("hex").setDescription("a hex code, e.g. #7289DA").setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("pick from the predefined color list")
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = Object.keys(CONFIG.PREDEFINED_COLORS)
      .filter((name) => name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((name) => ({ name, value: name }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    const member = interaction.member;

    if (!member.roles.cache.has(CONFIG.CUSTOM_COLOR_ACCESS_ROLE_ID)) {
      return interaction.reply({ content: "you don't have access to custom colors", flags: MessageFlags.Ephemeral });
    }

    const hexInput = interaction.options.getString("hex");
    const nameInput = interaction.options.getString("name");

    if ((hexInput && nameInput) || (!hexInput && !nameInput)) {
      return interaction.reply({
        content: "provide exactly one option — either `hex` or `name`, not both",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let hex;
    let isPredefined = false;

    if (nameInput) {
      const match = Object.keys(CONFIG.PREDEFINED_COLORS).find(
        (name) => name.toLowerCase() === nameInput.toLowerCase()
      );
      if (!match) return interaction.editReply("that's not one of the predefined colors — check `/colorlist`");
      isPredefined = true;
      hex = normalizeHex(CONFIG.PREDEFINED_COLORS[match]);
    } else {
      const validation = validateHex(hexInput);
      if (!validation.ok) return interaction.editReply(validation.reason);
      hex = validation.hex;
    }

    try {
      const result = await upsertCustomColorRole({ member, hex, isPredefined, config: CONFIG });
      if (!result.ok) return interaction.editReply(result.reason);
      return interaction.editReply(`your custom color is set to ${hex} — <@&${result.role.id}>`);
    } catch (err) {
      console.error("setcolor error:", err);
      return interaction.editReply("something went wrong setting your color, try again in a bit");
    }
  },
};