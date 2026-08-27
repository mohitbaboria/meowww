const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// ─── Cooldown ─────────────────────────────────────────────────────────────────
const cooldown     = new Map();
const COOLDOWN_TIME = 30 * 1000;

function isOnCooldown(userId) {
  const now     = Date.now();
  const expires = cooldown.get(userId);
  if (expires && now < expires) return true;
  cooldown.set(userId, now + COOLDOWN_TIME);
  return false;
}

// ─── Build Container ──────────────────────────────────────────────────────────
/**
 * Build the Components V2 container for a report.
 *
 * @param {object} opts
 * @param {string}        opts.title         e.g. "📩 Message Report"
 * @param {object[]}      opts.fields        Array of { name, value }
 * @param {string}        opts.thumbnailUrl
 * @param {Date|string}   opts.timestamp     Original event timestamp
 * @param {string}        opts.reportId      e.g. "RPT-4F3A"
 * @param {string}        opts.status        "open" | "resolved"
 * @param {string|null}   opts.resolvedBy    Moderator tag, or null
 * @param {string[]}      [opts.images]     Image URLs from the reported message
 * @param {string|null}   [opts.jumpUrl]     URL for "Jump to Message" button (optional)
 * @returns {ContainerBuilder}
 */
function buildReportContainer({
  title,
  fields,
  thumbnailUrl,
  timestamp,
  reportId,
  status,
  resolvedBy,
  images = [],
  jumpUrl = null,
}) {
  const container = new ContainerBuilder();

  // ── Section: title + first field + thumbnail ──
  if (thumbnailUrl && fields.length > 0) {
    const section = new SectionBuilder()
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${title}\n**${fields[0].name}**\n${fields[0].value}`
        )
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}`)
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());

  // ── Remaining fields ──
  for (const field of fields.slice(1)) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
    );
  }

  // ── Images (if any) ──
  if (images.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder());
    const gallery = new MediaGalleryBuilder();
    for (const url of images) {
      gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
    }
    container.addMediaGalleryComponents(gallery);
  }

  // ── Resolution status ──
  if (status === 'resolved' && resolvedBy) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✅ **Resolved by:** ${resolvedBy}`)
    );
  }

  // ── Timestamp + report ID ──
  if (timestamp) {
    container.addSeparatorComponents(new SeparatorBuilder());
    const ts = Math.floor(new Date(timestamp).getTime() / 1000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 🕒 <t:${ts}:R>  ·  ID: \`${reportId}\``
      )
    );
  }

  // ── Action row ──
  const row = new ActionRowBuilder();

  if (jumpUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Jump')
        .setStyle(ButtonStyle.Link)
        .setURL(jumpUrl)
    );
  }

  // Toggle button — customId encodes the report ID so the handler can look it up
  const isResolved = status === 'resolved';
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`report_resolve_${reportId}`)
      .setLabel(isResolved ? 'Unresolve' : 'Resolve')
      .setStyle(isResolved ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(isResolved ? '🔄' : '✅')
  );

  container.addActionRowComponents(row);

  return container;
}

module.exports = { isOnCooldown, buildReportContainer };