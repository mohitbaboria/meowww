// utils/ticketUtils.js — Core ticket lifecycle logic.
const { MessageFlags, ChannelType, AttachmentBuilder } = require('discord.js');
const config = require('../config/ticketConfig');
const state  = require('./ticketState');
const {
  buildOpenTicketComponents,
  buildClosedTicketComponents,
  buildTicketLogContainer,
} = require('./ticketUi');

// ─── Open a ticket ──────────────────────────────────────────────────────────────
/**
 * @param {import('discord.js').Client}                 client
 * @param {string}                                      context    — issue text from modal
 * @param {import('discord.js').Attachment|null}        attachment — from getUploadedFiles, or null
 * @param {import('discord.js').User}                   user
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function openTicket(client, context, attachment, user, interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const threadChannel = await client.channels.fetch(config.THREAD_CHANNEL_ID);
  if (!threadChannel) {
    return interaction.editReply({ content: '❌ Ticket channel not found. Contact an admin.' });
  }

  // Grant the user View Channel access on the parent channel
  await threadChannel.permissionOverwrites.create(user.id, {
    ViewChannel: true,
  }).catch(err => console.warn('[Tickets] Could not set channel permission overwrite:', err));

  // Create the private thread
  const thread = await threadChannel.threads.create({
    name: `ticket-${user.username}-${Date.now().toString(36)}`,
    type: ChannelType.PrivateThread,
    invitable: false,
    reason: `Support ticket for ${user.tag ?? user.username}`,
  });

  await thread.members.add(user.id);

  const creatorAvatar = user.displayAvatarURL({ size: 256 });
  const openedAt      = new Date().toISOString();
  const creatorTag    = user.tag ?? user.username;

  // Resolve attachment for Components V2 — use attachment:// protocol
  let resolvedAttachmentUrl = null;
  let attachmentFile = null;
  let storedAttachmentUrl = null;

  if (attachment) {
    storedAttachmentUrl   = attachment.url;
    attachmentFile        = new AttachmentBuilder(attachment.url, { name: attachment.name });
    resolvedAttachmentUrl = `attachment://${attachment.name}`;
  }

  const container = buildOpenTicketComponents({
    creatorTag,
    creatorId:    user.id,
    creatorAvatar,
    context,
    attachmentUrl: resolvedAttachmentUrl,
    openedAt,
  });

  const sendOptions = {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
  if (attachmentFile) sendOptions.files = [attachmentFile];

  const ticketMsg = await thread.send(sendOptions);

  // Notify the user (no ping)
  await thread.send({
    content: `<@${user.id}> Your ticket has been created. Staff will be with you shortly.`,
    allowedMentions: { parse: [] },
  });

await thread.send({
  content: `<@&${config.STAFF_ROLE_ID}>`,
  allowedMentions: { roles: [config.STAFF_ROLE_ID] },
});

  // Persist state — store raw CDN URL so reopen can display it without re-uploading
  state.set(thread.id, {
    threadId:      thread.id,
    messageId:     ticketMsg.id,
    creatorId:     user.id,
    creatorTag,
    creatorAvatar,
    context,
    attachmentUrl: storedAttachmentUrl,
    openedAt,
    status:        'open',
    closeInfo:     null,
  });

  await interaction.editReply({ content: `✅ Your ticket has been opened! Head to <#${thread.id}>.` });
}

// ─── Close a ticket ─────────────────────────────────────────────────────────────
/**
 * @param {import('discord.js').Client}                 client
 * @param {string}                                      threadId
 * @param {string|null}                                 reason
 * @param {import('discord.js').User}                   closedBy
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function closeTicket(client, threadId, reason, closedBy, interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = state.get(threadId);
  if (!ticket) return interaction.editReply({ content: '❌ Ticket data not found.' });
  if (ticket.status === 'closed') return interaction.editReply({ content: '⚠️ This ticket is already closed.' });

  const closedAt    = new Date().toISOString();
  const closedByTag = closedBy.tag ?? closedBy.username;

  // Edit original ticket message to closed state
  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (thread) {
    const ticketMsg = await thread.messages.fetch(ticket.messageId).catch(() => null);
    if (ticketMsg) {
      await ticketMsg.edit({
        components: [buildClosedTicketComponents({ ...ticket, closedByTag, closedById: closedBy.id, reason: reason || null, closedAt })],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }

  const closeInfo = { closedById: closedBy.id, closedByTag, reason: reason || null, closedAt };
  state.update(threadId, { status: 'closed', closeInfo });

  // Log to log channel
  const logChannel = await client.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const ts = `<t:${Math.floor(new Date(closedAt).getTime() / 1000)}:f>`;
    await logChannel.send({
      components: [buildTicketLogContainer({ action: 'closed', threadId, creatorId: ticket.creatorId, closedById: closedBy.id, closedByTag, reason: reason || null, timestamp: ts })],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  }

  // Remove user's View Channel access from the parent channel
  const threadChannel = await client.channels.fetch(config.THREAD_CHANNEL_ID).catch(() => null);
  if (threadChannel) {
    await threadChannel.permissionOverwrites.delete(ticket.creatorId)
      .catch(err => console.warn('[Tickets] Could not remove channel permission overwrite:', err));
  }

  if (thread) await thread.setArchived(true, 'Ticket closed').catch(() => {});

  await interaction.editReply({ content: '🔒 Ticket has been closed.' });
}

// ─── Reopen a ticket ────────────────────────────────────────────────────────────
/**
 * @param {import('discord.js').Client}                client
 * @param {string}                                     threadId
 * @param {import('discord.js').User}                  reopenedBy
 * @param {import('discord.js').ButtonInteraction}     interaction
 */
async function reopenTicket(client, threadId, reopenedBy, interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = state.get(threadId);
  if (!ticket) return interaction.editReply({ content: '❌ Ticket data not found.' });
  if (ticket.status === 'open') return interaction.editReply({ content: '⚠️ This ticket is already open.' });

  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (thread?.archived) await thread.setArchived(false, 'Ticket reopened').catch(() => {});

  if (thread) {
    const ticketMsg = await thread.messages.fetch(ticket.messageId).catch(() => null);
    if (ticketMsg) {
      await ticketMsg.edit({
        components: [buildOpenTicketComponents({
          creatorTag:    ticket.creatorTag,
          creatorId:     ticket.creatorId,
          creatorAvatar: ticket.creatorAvatar,
          context:       ticket.context,
          attachmentUrl: ticket.attachmentUrl,
          openedAt:      ticket.openedAt,
        })],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }

  state.update(threadId, { status: 'open', closeInfo: null });

  // Log reopen
  const logChannel = await client.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const ts = `<t:${Math.floor(Date.now() / 1000)}:f>`;
    await logChannel.send({
      components: [buildTicketLogContainer({ action: 'reopened', threadId, creatorId: ticket.creatorId, closedById: reopenedBy.id, closedByTag: reopenedBy.tag ?? reopenedBy.username, reason: null, timestamp: ts })],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  }

  await interaction.editReply({ content: '🔓 Ticket has been reopened.' });
}

module.exports = { openTicket, closeTicket, reopenTicket };