// events/interactionCreate.js
const { Events, MessageFlags }                        = require('discord.js');
const { buildReportContainer }                        = require('../utils/reportUtils');
const { getReport, updateReport, saveReport }         = require('../utils/reportStore');
const { TICKET_IDS, buildTicketModal, buildCloseModal } = require('../utils/ticketUi');
const ticketUtils                                     = require('../utils/ticketUtils');
const ticketState                                     = require('../utils/ticketState');

const REPORT_CHANNEL_ID = '1489142145398079584';

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {

    // ─── COMMAND HANDLER ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        const errorMessage = {
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
      return;
    }

    // ─── AUTOCOMPLETE HANDLER ───────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
      return;
    }

    // ─── BUTTON HANDLER ───────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const { customId, channelId, user } = interaction;

      // ── Report: Resolve / Unresolve toggle ───────────────────────────────────
      if (customId.startsWith('report_resolve_')) {
        const reportId = customId.slice('report_resolve_'.length);   // e.g. "RPT-4F3A"
        const report   = getReport(reportId);

        if (!report) {
          return interaction.reply({
            content: '❌ Report not found in storage.',
            flags: MessageFlags.Ephemeral,
          });
        }

        // Toggle status
        const nowResolved = report.status !== 'resolved';
        const updated     = updateReport(reportId, {
          status:     nowResolved ? 'resolved' : 'open',
          resolvedBy: nowResolved ? `${user.tag} (${user.id})` : null,
          resolvedAt: nowResolved ? new Date().toISOString() : null,
        });

        // Rebuild the container with the new state.
        // We reconstruct the original fields from the stored report.
        let fields, title, jumpUrl;

        if (report.type === 'message') {
          title  = '📩 Message Report';
          jumpUrl = report.messageUrl;
          fields = [
            { name: 'Reporter', value: `${report.reporterTag} (${report.reporterId})` },
            { name: 'Author',   value: `${report.authorTag} (${report.authorId})` },
            { name: 'Content',  value: report.content || 'No content' },
            { name: 'Channel',  value: `<#${report.channelId}>` },
          ];
        } else {
          // user report
          title  = '👤 User Report';
          jumpUrl = null;
          fields = [
            { name: 'Reporter', value: `${report.reporterTag} (${report.reporterId})` },
            { name: 'User',     value: `${report.reportedTag} (${report.reportedId})` },
            { name: 'Reason',   value: report.reason },
          ];
        }

        // Fetch the avatar URL for the thumbnail
        let thumbnailUrl = null;
        try {
          const targetId = report.type === 'message' ? report.authorId : report.reportedId;
          const target   = await client.users.fetch(targetId);
          thumbnailUrl   = target.displayAvatarURL();
        } catch { /* non-critical */ }

        const container = buildReportContainer({
          title,
          fields,
          thumbnailUrl,
          timestamp:  report.createdAt,
          reportId,
          status:     updated.status,
          resolvedBy: updated.resolvedBy,
          images:     report.images || [],
          jumpUrl,
        });

        // Edit the original report message in-place
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      // ── Panel "Open a Ticket" button → show ticket modal ────────────────────
      if (customId === TICKET_IDS.OPEN_PANEL_BTN) {
        return interaction.showModal(buildTicketModal());
      }

      // ── Close button (inside a ticket thread) ────────────────────────────────
      if (customId === TICKET_IDS.CLOSE_BTN) {
        const ticket = ticketState.get(channelId);
        if (!ticket) {
          return interaction.reply({
            content: '❌ Ticket data not found.',
            flags: MessageFlags.Ephemeral,
          });
        }
        return interaction.showModal(buildCloseModal());
      }

      // ── Reopen button (inside a closed ticket thread) ────────────────────────
      if (customId === TICKET_IDS.REOPEN_BTN) {
        return ticketUtils.reopenTicket(client, channelId, user, interaction);
      }

      return;
    }

    // ─── MODAL HANDLER ────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const { customId, channelId, user } = interaction;

      // ── Ticket: open modal submission ────────────────────────────────────────
      if (customId === TICKET_IDS.TICKET_MODAL) {
        const context = interaction.fields.getTextInputValue(TICKET_IDS.TICKET_CONTEXT_INPUT);

        let attachment = null;
        try {
          const files = interaction.fields.getUploadedFiles(TICKET_IDS.TICKET_FILE_INPUT);
          if (files && files.size > 0) attachment = files.first();
        } catch { /* field absent — fine */ }

        return ticketUtils.openTicket(client, context, attachment, user, interaction);
      }

      // ── Ticket: close modal submission ───────────────────────────────────────
      if (customId === TICKET_IDS.CLOSE_MODAL) {
        const reason = interaction.fields.getTextInputValue(TICKET_IDS.CLOSE_REASON_INPUT) || null;
        return ticketUtils.closeTicket(client, channelId, reason, user, interaction);
      }

      // ── Report User: modal submission ────────────────────────────────────────
      if (customId.startsWith('reportUser_')) {
        await interaction.reply({
          content:
            'Thanks for reporting! <:AkLovesZzz:1487032999697715341>\nOur moderators will review it. Please note that we cannot share any actions taken.',
          flags: MessageFlags.Ephemeral,
        });

        const reportedUserId = customId.split('_')[1];
        const reported       = await client.users.fetch(reportedUserId);
        const reason         = interaction.fields.getTextInputValue('reason');
        const channel        = await client.channels.fetch(REPORT_CHANNEL_ID);

        const fields = [
          { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: 'User',     value: `${reported.tag} (${reported.id})` },
          { name: 'Reason',   value: reason },
        ];

        // ── Persist ──
        const reportId = saveReport({
          type:        'user',
          reporterId:  interaction.user.id,
          reporterTag: interaction.user.tag,
          reportedId:  reported.id,
          reportedTag: reported.tag,
          reason,
          createdAt:   new Date().toISOString(),
        });

        const container = buildReportContainer({
          title:        '👤 User Report',
          fields,
          thumbnailUrl: reported.displayAvatarURL(),
          timestamp:    new Date(),
          reportId,
          status:       'open',
          resolvedBy:   null,
          jumpUrl:      null,
        });

        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      return;
    }
  },
};