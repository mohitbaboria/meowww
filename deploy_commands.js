const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({quiet: true});

const commands = [];

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const command = require(fullPath);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(`[WARNING] ${fullPath} is missing "data" or "execute".`);
      }
    }
  }
}

loadCommands(path.join(__dirname, "src", "commands"));

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();