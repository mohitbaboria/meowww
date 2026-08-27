const { Events } = require("discord.js");

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (
            message.guild &&
            message.author.bot &&
            message.author.id === "487328045275938828" &&
            message.channel.id === "1486718333045968926" &&
            message.content.includes("Type **/restart** to start a new turn")
        ) {
            await message.delete().catch(() => {});
        }
    }
};