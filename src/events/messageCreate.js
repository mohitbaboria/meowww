// src/events/messageCreate.js
const { Events, MessageFlags } = require('discord.js');
const colorRoles = require('../data/colorRoles');
const colorPanelContainer = require('../data/colorPanelContainer.json');

// raw json only understands emoji as { id, name }, not the '<:name:id>' string
function parseEmoji(str) {
    if (!str) return undefined;
    const match = str.match(/^<a?:(\w+):(\d+)>$/);
    if (!match) return undefined;
    return { name: match[1], id: match[2] };
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.content.trim().toLowerCase() !== '!colorpanel') return;

        // deep clone so we never mutate the required json on repeated sends
        const components = JSON.parse(JSON.stringify(colorPanelContainer));

        const selectRow = {
            type: 1, // Action Row
            components: [
                {
                    type: 3, // String Select
                    custom_id: 'colorpanel_select',
                    placeholder: 'pick a color',
                    min_values: 1,
                    max_values: 1,
                    options: colorRoles.map((role) => ({
                        label: role.label,
                        value: role.id,
                        emoji: parseEmoji(role.emoji),
                    })),
                },
            ],
        };

        // find the placeholder in the json and swap the select menu in at that exact spot
        const targetComponents = components[0].components;
        const placeholderIndex = targetComponents.findIndex(
            (c) => c.type === 'SELECT_MENU_PLACEHOLDER'
        );
        if (placeholderIndex !== -1) {
            targetComponents.splice(placeholderIndex, 1, selectRow);
        } else {
            // no placeholder found, fall back to appending at the end
            targetComponents.push(selectRow);
        }

        await message.channel.send({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
        });
    },
};