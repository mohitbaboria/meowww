// utils/ticketUi.js — Builds Component V2 containers for the ticket system.
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  FileUploadBuilder,
} = require('discord.js');

// ─── Custom IDs ────────────────────────────────────────────────────────────────
const TICKET_IDS = {
  CLOSE_BTN:            'ticket_close_btn',
  REOPEN_BTN:           'ticket_reopen_btn',
  OPEN_PANEL_BTN:       'ticket_open_panel_btn',
  CLOSE_MODAL:          'ticket_close_modal',
  CLOSE_REASON_INPUT:   'ticket_close_reason',
  TICKET_MODAL:         'ticket_modal',
  TICKET_CONTEXT_INPUT: 'ticket_context_input',
  TICKET_FILE_INPUT:    'ticket_file_input',
};

// ─── Ticket container (open state) ─────────────────────────────────────────────
function buildOpenTicketComponents({ creatorTag, creatorId, creatorAvatar, context, attachmentUrl, openedAt }) {
  const ts = `<t:${Math.floor(new Date(openedAt).getTime() / 1000)}:f>`;
  const container = new ContainerBuilder();

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🎫 Support Ticket\n**Opened by:** <@${creatorId}> (${creatorTag})\n**Opened at:** ${ts}`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(creatorAvatar))
  );

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 📋 Issue\n${context}`)
  );

  if (attachmentUrl) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(attachmentUrl)
      )
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Status:** 🟢 Open')
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_IDS.CLOSE_BTN)
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    )
  );

  return container;
}

// ─── Ticket container (closed state) ───────────────────────────────────────────
function buildClosedTicketComponents({ creatorTag, creatorId, creatorAvatar, context, attachmentUrl, openedAt, closedByTag, closedById, reason, closedAt }) {
  const tsOpen  = `<t:${Math.floor(new Date(openedAt).getTime() / 1000)}:f>`;
  const tsClose = `<t:${Math.floor(new Date(closedAt).getTime() / 1000)}:f>`;
  const container = new ContainerBuilder();

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🎫 Support Ticket\n**Opened by:** <@${creatorId}> (${creatorTag})\n**Opened at:** ${tsOpen}`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(creatorAvatar))
  );

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 📋 Issue\n${context}`)
  );

  if (attachmentUrl) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(attachmentUrl)
      )
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Status:** 🔴 Resolved`,
        `**Closed by:** <@${closedById}> (${closedByTag})`,
        `**Closed at:** ${tsClose}`,
        reason ? `**Reason:** ${reason}` : null,
      ].filter(Boolean).join('\n')
    )
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_IDS.REOPEN_BTN)
        .setLabel('Reopen Ticket')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Success)
    )
  );

  return container;
}

// ─── Panel container ────────────────────────────────────────────────────────────
function buildPanelComponents() {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
  new TextDisplayBuilder().setContent(`## <:anime_girlthink:1522719570094456934> Support`),
  new TextDisplayBuilder().setContent(`If you need help, click the button below or use the </ticket:1498511880153731293> command in any channel.\nA member of our staff will assist you shortly.`),
);
  container.addSeparatorComponents(new SeparatorBuilder());
  container.setAccentColor(0xC8A27A)
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_IDS.OPEN_PANEL_BTN)
        .setLabel('Open a Ticket')
        .setEmoji('📩')
        .setStyle(ButtonStyle.Primary)
    )
  );
  return container;
}

// ─── Close-reason modal ─────────────────────────────────────────────────────────
function buildCloseModal() {
  return new ModalBuilder()
    .setCustomId(TICKET_IDS.CLOSE_MODAL)
    .setTitle('Close Ticket')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Reason (optional)')
        .setDescription('Provide context for closing this ticket.')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(TICKET_IDS.CLOSE_REASON_INPUT)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500)
            .setPlaceholder('Enter a reason for closing, or leave blank.')
        )
    );
}

// ─── Ticket modal ───────────────────────────────────────────────────────────────
function buildTicketModal() {
  return new ModalBuilder()
    .setCustomId(TICKET_IDS.TICKET_MODAL)
    .setTitle('Open a Support Ticket')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Describe your issue')
        .setDescription('Describe the issue briefly so staff can help.')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(TICKET_IDS.TICKET_CONTEXT_INPUT)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Describe what you need help with...')
        ),
      new LabelBuilder()
        .setLabel('Attachment (optional)')
        .setDescription('Upload a screenshot or file related to your issue.')
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(TICKET_IDS.TICKET_FILE_INPUT)
            .setRequired(false)
            .setMaxValues(1)
        )
    );
}

// ─── Log container ──────────────────────────────────────────────────────────────
function buildTicketLogContainer({ action, threadId, creatorId, closedById, closedByTag, reason, timestamp }) {
  const emoji = action === 'closed' ? '🔴' : '🟢';
  const verb  = action === 'closed' ? 'Closed' : 'Reopened';

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `## ${emoji} Ticket ${verb}`,
        `**Thread:** <#${threadId}>`,
        `**User:** <@${creatorId}>`,
        `**${verb} by:** <@${closedById}> (${closedByTag})`,
        `**Time:** ${timestamp}`,
        reason ? `**Reason:** ${reason}` : null,
      ].filter(Boolean).join('\n')
    )
  );
  return container;
}

module.exports = {
  TICKET_IDS,
  buildOpenTicketComponents,
  buildClosedTicketComponents,
  buildPanelComponents,
  buildCloseModal,
  buildTicketModal,
  buildTicketLogContainer,
};
