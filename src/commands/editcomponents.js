const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
/**
 * /editcomponents command
 *
 * Takes a message link + a raw Components V2 JSON array and edits
 * that message's components in place.
 *
 * Usage:
 *   /editcomponents message:[discord message link] components:[json array] ping:[option]
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

// Matches https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
// (also allows canary/ptb subdomains and discordapp.com)
const MESSAGE_LINK_REGEX =
  /discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editcomponents")
    .setDescription("edit an existing components v2 message using raw json")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("link to the message you want to edit")
        .setRequired(true)
    )
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

    const link       = interaction.options.getString("message");
    const raw        = interaction.options.getString("components");
    const pingChoice = interaction.options.getString("ping") ?? "none";
    const parse      = PING_OPTIONS[pingChoice] ?? [];

    // ── Parse message link ───────────────────────────────────────────────────
    const match = link.match(MESSAGE_LINK_REGEX);
    if (!match) {
      return interaction.reply({
        content: "invalid message link — paste a full discord message link.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
    const [, guildId, channelId, messageId] = match;

    if (guildId !== interaction.guildId) {
      return interaction.reply({
        content: "that message link is from a different server.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

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

    // ── Fetch channel + message ──────────────────────────────────────────────
    const targetChannel = await interaction.guild.channels
      .fetch(channelId)
      .catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.reply({
        content: "couldn't find that channel — make sure the bot can see it.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    const targetMessage = await targetChannel.messages
      .fetch(messageId)
      .catch(() => null);

    if (!targetMessage) {
      return interaction.reply({
        content: "couldn't find that message — check the link and try again.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    if (targetMessage.author.id !== interaction.client.user.id) {
      return interaction.reply({
        content: "that message wasn't sent by this bot — can't edit it.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    // ── Edit the message ──────────────────────────────────────────────────────
    try {
      await targetMessage.edit({
        components,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse },
      });

      return interaction.reply({
        content: "edited.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      return interaction.reply({
        content: `failed to edit — discord rejected the components.\n\`\`\`${err.message}\`\`\``,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  },
};