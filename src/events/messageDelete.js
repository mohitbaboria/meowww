const {
  Events,
  AuditLogEvent,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require("discord.js");

const WATCHED_CHANNEL_ID = "1486718106360352888";
const LOG_CHANNEL_ID = "1490572563762642975";
const IGNORED_USER_ID = "1521965112846450728";

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (message.partial) return;
    if (message.channel.id !== WATCHED_CHANNEL_ID) return;
    if (message.author?.id === IGNORED_USER_ID) return;
    if (message.author?.bot) return;

    // ── audit log: who deleted it ──────────────────────────────────────────
    let deletedBy = null;
    try {
      const logs = await message.guild?.fetchAuditLogs({
        type: AuditLogEvent.MessageDelete,
        limit: 5,
      });
      const entry = logs?.entries.find((e) => {
        return (
          Date.now() - e.createdTimestamp < 5000 &&
          e.extra?.channel?.id === WATCHED_CHANNEL_ID &&
          e.target?.id === message.author?.id
        );
      });
      if (entry?.executor?.id === IGNORED_USER_ID) return;
      if (entry?.executor) deletedBy = entry.executor;
    } catch {}

    const logChannel = message.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const author = message.author;
    const content = message.content?.trim() || "";
    const attachments = [...message.attachments.values()];
    const images = attachments.filter((a) =>
      /\.(png|jpe?g|gif|webp)$/i.test(a.name ?? "")
    );
    const files = attachments.filter(
      (a) => !/\.(png|jpe?g|gif|webp)$/i.test(a.name ?? "")
    );

    const sentAt = Math.floor(message.createdAt.getTime() / 1000);

    // ── build components v2 ────────────────────────────────────────────────
    const container = new ContainerBuilder().setAccentColor(0xe74c3c);

    // header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🗑️ **message deleted** in <#${WATCHED_CHANNEL_ID}>`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );

    // author info
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**author** <@${author?.id ?? "unknown"}>${author ? ` \`${author.username}\`` : ""}`,
          `**sent** <t:${sentAt}:F>`,
          deletedBy
            ? `**deleted by** <@${deletedBy.id}> \`${deletedBy.username}\``
            : `**deleted by** author (or uncached)`,
        ].join("\n")
      )
    );

    // message content
    if (content) {
      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**content**\n${content}`)
      );
    }

    // images
    if (images.length > 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small)
      );
      const gallery = new MediaGalleryBuilder();
      for (const img of images.slice(0, 10)) {
        gallery.addItems(new MediaGalleryItemBuilder().setURL(img.url));
      }
      container.addMediaGalleryComponents(gallery);
    }

    // non-image files
    if (files.length > 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**files**\n${files.map((f) => `[\`${f.name}\`](${f.url})`).join("\n")}`
        )
      );
    }

    // footer
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# user id: \`${author?.id ?? "unknown"}\` • message id: \`${message.id}\``
      )
    );

    await logChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
    });
  },
};
