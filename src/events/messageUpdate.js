const {
  Events,
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
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    // resolve partials
    if (oldMessage.partial) {
      try { oldMessage = await oldMessage.fetch(); } catch { return; }
    }
    if (newMessage.partial) {
      try { newMessage = await newMessage.fetch(); } catch { return; }
    }

    // only the exact channel, not threads
    if (newMessage.channel.id !== WATCHED_CHANNEL_ID) return;

    // ignore ignored user
    if (newMessage.author?.id === IGNORED_USER_ID) return;

    // ignore if content didn't actually change (embed load, pin, etc.)
    if (oldMessage.content === newMessage.content) return;

    const logChannel = newMessage.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
      
    if (newMessage.author?.bot) return;

    const author = newMessage.author;
    const oldContent = oldMessage.content?.trim() || "*empty*";
    const newContent = newMessage.content?.trim() || "*empty*";

    const editedAt = Math.floor(
      (newMessage.editedAt ?? new Date()).getTime() / 1000
    );
    const sentAt = Math.floor(newMessage.createdAt.getTime() / 1000);

    // attachments on the new message (they persist unless explicitly removed)
    const attachments = [...newMessage.attachments.values()];
    const images = attachments.filter((a) =>
      /\.(png|jpe?g|gif|webp)$/i.test(a.name ?? "")
    );
    const files = attachments.filter(
      (a) => !/\.(png|jpe?g|gif|webp)$/i.test(a.name ?? "")
    );

    // ── build components v2 ────────────────────────────────────────────────
    const container = new ContainerBuilder().setAccentColor(0xf39c12);

    // header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `✏️ **message edited** in <#${WATCHED_CHANNEL_ID}>`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );

    // author + timestamps
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**author** <@${author?.id ?? "unknown"}>${author ? ` \`${author.username}\`` : ""}`,
          `**sent** <t:${sentAt}:F>`,
          `**edited** <t:${editedAt}:F>`,
        ].join("\n")
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );

    // before / after
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**before**\n${oldContent}`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**after**\n${newContent}`
      )
    );

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

    // footer + jump link
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# user id: \`${author?.id ?? "unknown"}\` • message id: \`${newMessage.id}\` • [jump to message](${newMessage.url})`
      )
    );

    await logChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
