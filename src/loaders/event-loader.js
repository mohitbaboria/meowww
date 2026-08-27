const fs = require("fs");
const path = require("path");

module.exports = (client) => {

    const eventsPath = path.join(__dirname, "..", "events");

    function loadEvents(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // 🔁 go deeper
                loadEvents(filePath);
            } else if (file.endsWith(".js")) {
                const event = require(filePath);

                if (!event || !event.name || !event.execute) {
                    console.log(`⚠️ Event file ${filePath} is missing "name" or "execute"`);
                    continue;
                }

                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }

                console.log(`✔ Loaded event: ${event.name}`);
            }
        }
    }

    loadEvents(eventsPath);

    console.log("✅ All events loaded");
};