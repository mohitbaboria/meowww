const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags,
} = require('discord.js');

const { isOnCooldown, buildReportContainer } = require('../../utils/reportUtils');
const { saveReport }                          = require('../../utils/reportStore');

const REPORT_CHANNEL_ID = '1489142145398079584';

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setType(ApplicationCommandType.Message),

  async execute(interaction, client) {
    if (isOnCooldown(interaction.user.id)) {
      return interaction.reply({
        content: '⏳ Cooldown active.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      content:
        'Thanks for reporting! <:AkLovesZzz:1487032999697715341>\nOur moderators will review it. Please note that we cannot share any actions taken.',
      flags: MessageFlags.Ephemeral,
    });

    const msg     = interaction.targetMessage;
    const channel = await client.channels.fetch(REPORT_CHANNEL_ID);

    // Collect image URLs from attachments and embeds
    const images = [
      ...msg.attachments
        .filter(a => a.contentType?.startsWith('image/'))
        .map(a => a.url),
      ...msg.embeds
        .filter(e => e.image?.url)
        .map(e => e.image.url),
    ];

    const fields = [
      { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: 'Author',   value: `${msg.author.tag} (${msg.author.id})` },
      { name: 'Content',  value: msg.content || 'No content' },
      { name: 'Channel',  value: `<#${msg.channel.id}>` },
    ];

    // ── Persist to JSON before sending so we have the ID ──
    const reportId = saveReport({
      type:        'message',
      reporterId:  interaction.user.id,
      reporterTag: interaction.user.tag,
      authorId:    msg.author.id,
      authorTag:   msg.author.tag,
      content:     msg.content || '',
      channelId:   msg.channel.id,
      messageUrl:  msg.url,
      createdAt:   msg.createdAt,
      images,
    });

    const container = buildReportContainer({
      title:        '📩 Message Report',
      fields,
      thumbnailUrl: msg.author.displayAvatarURL(),
      timestamp:    msg.createdAt,
      reportId,
      status:       'open',
      resolvedBy:   null,
      jumpUrl:      msg.url,
      images,
    });

    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};