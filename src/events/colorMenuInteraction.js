// src/events/colorMenuInteraction.js
const { Events } = require('discord.js');
const colorRoles = require('../data/colorRoles');
const { removeCustomColorRoleFromMember } = require('../utils/customColorRoles');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'colorpanel_select') return;

        // acknowledge immediately so Discord doesn't time out the
        // interaction while we do role removals + JSON read/write
        await interaction.deferReply({ ephemeral: true });

        const selectedId = interaction.values[0];
        const member = interaction.member;
        const allColorRoleIds = colorRoles.map((r) => r.id);

        try {
            // strip their custom role (if any) — this also cleans up the DB
            // and deletes the shared role if no one else is using it
            await removeCustomColorRoleFromMember(member);

            // remove any other default color role the member currently has
            const rolesToRemove = member.roles.cache.filter(
                (role) => allColorRoleIds.includes(role.id) && role.id !== selectedId
            );
            for (const role of rolesToRemove.values()) {
                await member.roles.remove(role).catch(() => {});
            }

            if (!member.roles.cache.has(selectedId)) {
                await member.roles.add(selectedId).catch(() => {});
            }

            const roleLabel = colorRoles.find((r) => r.id === selectedId)?.label ?? 'that color';
            return interaction.editReply({ content: `nice pick, ${roleLabel} suits you` });
        } catch (err) {
            console.error('colorpanel_select error:', err);
            return interaction.editReply({ content: 'something went wrong setting your color, try again in a bit' });
        }
    },
};