const {
  SlashCommandBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Display a user profile")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to view the profile of")
        .setRequired(false)
    ),

  async execute(interaction) {
    /* ───── Resolve user & member ───── */

    const user = interaction.options.getUser("user") ?? interaction.user;

    const member =
      interaction.options.getMember("user") ?? interaction.member ?? null;

    /* ───── Badges ───── */

    const badgeEmojis = {
      Staff: "<:discordstaff:1489276934742343700>",
      Partner: "<:discordpartner:1489276932360110211>",
      Hypesquad: "<:hypesquadevents:1489277000198914190>",
      BugHunterLevel1: "<:discordbughunter1:1489277008973135995>",
      BugHunterLevel2: "<:discordbughunter2:1489277045467779255>",
      HypeSquadOnlineHouse1: "<:hypesquadbravery:1489276940291674252>",
      HypeSquadOnlineHouse2: "<:hypesquadbrilliance:1489276997342597263>",
      HypeSquadOnlineHouse3: "<:hypesquadbalance:1489276937275707452>",
      PremiumEarlySupporter: "<:earlysupporter:1489277060701618186>",
      VerifiedDeveloper: "<:discordbotdev:1489276929092882556>",
      CertifiedModerator: "<:discordmod:1489277048462774352>",
      VerifiedBot: "<:app1:1489275548206371017><:app2:1489275342840533153>"
    };

    const badgeDisplay = user.flags
      ? " " +
        user.flags
          .toArray()
          .map((flag) => badgeEmojis[flag])
          .filter(Boolean)
          .join(" ")
      : "";

    /* ───── Roles ───── */

    const rolesText = member
      ? (() => {
          let roles = [];

          if (Array.isArray(member.roles)) {
            // Resolved member
            roles = member.roles
              .filter((id) => id !== interaction.guildId)
              .map((id) => `<@&${id}>`);
          } else if (member.roles?.cache) {
            // GuildMember
            roles = member.roles.cache
              .filter((r) => r.id !== interaction.guildId)
              .sort((a, b) => b.position - a.position)
              .map((r) => `<@&${r.id}>`);
          }

          if (!roles.length) return "None";

          const joined = roles.join(", ");
          return joined.length > 1000 ? joined.slice(0, 1000) + "…" : joined;
        })()
      : "Roles not available";

    /* ───── Display name & clan ───── */

    const clanTag = user.primaryGuild?.tag
      ? ` \`${user.primaryGuild.tag}\``
      : "";

    const displayName =
      member?.nickname ?? // server nickname
      user.globalName ?? // account display name (new feature)
      user.username; // fallback

    /* ───── Dates ───── */

    const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

    let joinedText = "Join date not available";

    if (member?.joinedTimestamp) {
      // GuildMember
      joinedText = `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;
    } else if (member?.joined_at) {
      // Resolved member
      joinedText = `<t:${Math.floor(
        new Date(member.joined_at).getTime() / 1000
      )}:R>`;
    }

    /* ───── UI ───── */

    const title = `### ${displayName} User Info`;

    const identity =
      `${user.username}${clanTag}${badgeDisplay}\n` + `-# ID: ${user.id}`;

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(title),
        new TextDisplayBuilder().setContent(`<@!${user.id}>`),
        new TextDisplayBuilder().setContent(identity)
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder().setURL(user.displayAvatarURL())
      );

    const container = new ContainerBuilder()
      .addSectionComponents(section)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Account created: ${created}`),
        new TextDisplayBuilder().setContent(`Server joined: ${joinedText}`),
        new TextDisplayBuilder().setContent(`Roles: ${rolesText}`)
      );

    await interaction.reply({
      components: [container],
      flags: 1 << 15,
      allowedMentions: { parse: [] },
    });
  },
};


