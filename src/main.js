const { Client, GatewayIntentBits} = require('discord.js');
require('dotenv').config({quiet: true});


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // This is necessary to access user avatars
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // This might also be useful if you need to handle message content in commands
    ],
});



require('./loaders/event-loader')(client);
require('./loaders/command-loader')(client);
// require('./events/interactionCreate')(client); no longer needed as event-loader handles it


client.login(process.env.TOKEN);



// read https://gemini.google.com/app/716e7b85bd331003
// https://chatgpt.com/c/695f711f-8db0-8323-aed9-5813c672569f