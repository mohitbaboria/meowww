// events/clientReady.js
const { Events, ActivityType } = require("discord.js");
const { startBirthdayScheduler } = require("../utils/birthdayAnnouncer");
const NEW_MEMBER_ROLE_ID = "1491791432602882159"; // Role given to members ≤ 1 week
const VETERAN_ROLE_ID    = "1491791528128155648"; // Role given to members ≥ 1 month
const GUILD_ID           = process.env.GUILD_ID;

const ONE_WEEK_MS  =  7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function daysSince(date) {
  return Date.now() - date.getTime();
}

async function evaluateMember(member) {
  if (member.user.bot || !member.joinedAt) return;

  const elapsed = daysSince(member.joinedAt);

  try {
	if (elapsed < ONE_MONTH_MS) {
  // Under 1 month → give new member role
 	 if (!member.roles.cache.has(NEW_MEMBER_ROLE_ID)) {
	    await member.roles.add(NEW_MEMBER_ROLE_ID);
 		console.log(`[roles] New-member role assigned to ${member.user.tag}`);
 		 }
} else {
  // 1 month or more → remove new member role, give veteran role
  if (member.roles.cache.has(NEW_MEMBER_ROLE_ID)) {
    await member.roles.remove(NEW_MEMBER_ROLE_ID);
  }
  if (!member.roles.cache.has(VETERAN_ROLE_ID)) {
    await member.roles.add(VETERAN_ROLE_ID);
    console.log(`[roles] Veteran role assigned to ${member.user.tag}`);
  }
}
  } catch (err) {
    console.error(`[roles] Failed on ${member.user.tag}:`, err.message);
  }
}

async function runCheck(guild) {
  console.log(`[${new Date().toISOString()}] Running member role check…`);
  const members = await guild.members.fetch();
  await Promise.allSettled(members.map(evaluateMember));
  console.log(`[roles] Check complete — ${members.size} members scanned.`);
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    client.user.setActivity("new members", {
      type: ActivityType.Watching,
    });

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return console.error("[roles] Guild not found. Check GUILD_ID in .env");

    // Run immediately on startup, then every 30 minutes
    await runCheck(guild);
    setInterval(() => runCheck(guild), 30 * 60 * 1000);
    startBirthdayScheduler(client);
      
  },
};