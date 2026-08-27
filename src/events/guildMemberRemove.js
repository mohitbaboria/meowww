// events/guildMemberRemove.js
// If you already have a guildMemberRemove handler, merge this call into it
// instead of adding a second listener.
const { Events } = require("discord.js");
const { getUserEntry, deleteUserCustomRole } = require("../utils/customColorRoles");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!getUserEntry(member.id)) return;
    try {
      await deleteUserCustomRole(member.guild, member.id);
    } catch (err) {
      console.error("failed to clean up custom color role on member leave:", err);
    }
  },
};
