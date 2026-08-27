const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const ADMIN_ROLE_ID = "1486705837425692692";

// ─── Paths ────────────────────────────────────────────────────────────────────
// __dirname = src/commands/
// ".." goes up to src/
// so the JSONs live at src/countingSettings.json and src/wordChainSettings.json

const SETTINGS_FILES = {
  counting:  path.join(__dirname, "..", "countingSettings.json"),
  wordchain: path.join(__dirname, "..", "wordChainSettings.json"),
};

const DEFAULTS = {
  counting:  { allowWarnings: true, allowConsecutive: false },
  wordchain: { allowWarnings: true, allowConsecutive: false, repeatWindow: 50 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readSettings(game) {
  try {
    const raw = fs.readFileSync(SETTINGS_FILES[game], "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS[game], ...parsed };
  } catch {
    return { ...DEFAULTS[game] };
  }
}

function writeSettings(game, data) {
  fs.writeFileSync(SETTINGS_FILES[game], JSON.stringify(data, null, 2), "utf-8");
}

function formatSettings(game, s) {
  return [
    `warnings      ${s.allowWarnings    ? "on ✅"      : "off ❌"}`,
    `consecutive   ${s.allowConsecutive ? "allowed ✅" : "blocked ❌"}`,
    ...(game === "wordchain" ? [`repeat window  ${s.repeatWindow} words`] : []),
  ].join("\n");
}

// ─── Command ──────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("manage thread settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("view current settings")
        .addStringOption((opt) =>
          opt.setName("game").setDescription("which thread").setRequired(true)
            .addChoices(
              { name: "counting",   value: "counting"  },
              { name: "word chain", value: "wordchain" }
            )
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("change a setting")
        .addStringOption((opt) =>
          opt.setName("game").setDescription("which thread").setRequired(true)
            .addChoices(
              { name: "counting",   value: "counting"  },
              { name: "word chain", value: "wordchain" }
            )
        )
        .addStringOption((opt) =>
          opt.setName("key").setDescription("which setting").setRequired(true)
            .addChoices(
              { name: "allow warnings",                  value: "allowWarnings"    },
              { name: "allow consecutive",               value: "allowConsecutive" },
              { name: "repeat window (word chain only)", value: "repeatWindow"     }
            )
        )
        .addStringOption((opt) =>
          opt.setName("value").setDescription("true / false — or a number for repeat window").setRequired(true)
        )
    ),

  async execute(interaction) {
    // ── Role guard ────────────────────────────────────────────────────────────
    if (!interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "you don't have permission to use this.", ephemeral: true });
    }

    const sub   = interaction.options.getSubcommand();
    const game  = interaction.options.getString("game");
    const color = game === "counting" ? 0x9b8ea8 : 0x8ea89b;
    const title = game === "counting" ? "counting" : "word chain";

    // ── /settings view ────────────────────────────────────────────────────────
    if (sub === "view") {
      const s = readSettings(game);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(`${title} — settings`)
            .setDescription("```\n" + formatSettings(game, s) + "\n```"),
        ],
        ephemeral: true,
      });
    }

    // ── /settings toggle ──────────────────────────────────────────────────────
    if (sub === "toggle") {
      const key = interaction.options.getString("key");
      const raw = interaction.options.getString("value").trim().toLowerCase();
      const s   = readSettings(game);

      if (key === "repeatWindow") {
        if (game !== "wordchain")
          return interaction.reply({ content: "repeat window only applies to the word chain thread.", ephemeral: true });
        const num = parseInt(raw, 10);
        if (isNaN(num) || num < 1)
          return interaction.reply({ content: "please provide a valid number (e.g. 50).", ephemeral: true });
        s.repeatWindow = num;
      } else {
        if (raw !== "true" && raw !== "false")
          return interaction.reply({ content: "value should be `true` or `false`.", ephemeral: true });
        s[key] = raw === "true";
      }

      writeSettings(game, s);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(`${title} — updated`)
            .setDescription("```\n" + formatSettings(game, s) + "\n```"),
        ],
        ephemeral: true,
      });
    }
  },
};
