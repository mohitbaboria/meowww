const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

module.exports = (client) => {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "..", "commands");

    function loadCommands(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // 🔁 go deeper (recursion)
                loadCommands(filePath);
            } else if (file.endsWith(".js")) {
                const command = require(filePath);

                if ("data" in command && "execute" in command) {
                    client.commands.set(command.data.name, command);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }

    loadCommands(commandsPath);

    console.log("✅ Commands loaded successfully");
};

// this code loads command files from the 'commands' directory and its subdirectories, registering them in the client's command collection.