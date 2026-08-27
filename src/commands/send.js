const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
/**
 * /send command
 *
 * Takes a raw Components V2 JSON array and sends it as a message
 * in the same channel the command was used in.
 *
 * Usage:
 *   /send components:[json array] ping:[option]
 *
 * The JSON must be a valid array of top-level component objects.
 * Example: [{ "type": 17, "components": [...] }]
 *
 * Restricted to role: 1486705837425692692
 */
const ADMIN_ROLE_ID = "1486705837425692692";

// Maps the slash command "ping" choice to discord.js allowedMentions.parse
const PING_OPTIONS = {
  none:          [],
  everyone_here: ["everyone"], // covers both @everyone and @here text
  users:         ["users"],
  roles:         ["roles"],
  users_roles:   ["users", "roles"],
  all:           ["everyone", "users", "roles"],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("send a components v2 message using raw json")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt
        .setName("components")
        .setDescription("raw json array of top-level components")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("ping")
        .setDescription("which mentions in the json should actually notify people")
        .setRequired(false)
        .addChoices(
          { name: "none (default — mentions render but don't notify)", value: "none" },
          { name: "@everyone / @here", value: "everyone_here" },
          { name: "users (@user mentions in the json)", value: "users" },
          { name: "roles (@role mentions in the json)", value: "roles" },
          { name: "users + roles", value: "users_roles" },
          { name: "everyone/here + users + roles", value: "all" },
        )
    ),
  async execute(interaction) {
    // ── Role guard ────────────────────────────────────────────────────────────
    if (!interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        content: "you don't have permission to use this.",
        flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
      });
    }
    const raw = interaction.options.getString("components");
    const pingChoice = interaction.options.getString("ping") ?? "none";
    const parse = PING_OPTIONS[pingChoice] ?? [];

    // ── Parse JSON ────────────────────────────────────────────────────────────
    let components;
    try {
      components = JSON.parse(raw);
      if (!Array.isArray(components)) throw new Error("not an array");
    } catch {
      return interaction.reply({
        content: "invalid json — make sure you're passing a valid array `[...]`.",
        flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
      });
    }
    // ── Send the message ──────────────────────────────────────────────────────
    try {
      await interaction.channel.send({
        components,
        flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse },
      });
      // confirm quietly to the user
      return interaction.reply({
        content: "sent.",
        flags: MessageFlags.Ephemeral,
         allowedMentions: { parse: [] },
      });
    } catch (err) {
      return interaction.reply({
        content: `failed to send — discord rejected the components.\n\`\`\`${err.message}\`\`\``,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  },
};