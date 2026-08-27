const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { parse } = require('twemoji-parser');

const WELCOME_CHANNEL_ID = '1486705320230387847';

// ── Twemoji text renderer ─────────────────────────────────────────────────────
async function drawTextWithTwemoji(ctx, text, x, y) {
  const emojis = parse(text, {
    assetType: 'png',
    buildUrl: (code) =>
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`,
  });

  let currentX  = x;
  let lastIndex = 0;

  for (const emoji of emojis) {
    const textPart = text.slice(lastIndex, emoji.indices[0]);
    ctx.fillText(textPart, currentX, y);
    currentX += ctx.measureText(textPart).width;

    const img  = await loadImage(emoji.url);
    const size = parseInt(ctx.font.match(/\d+/)[0]) * 1.5;
    ctx.drawImage(img, currentX, y - size * 0.7, size, size);

    currentX  += size + 4;
    lastIndex  = emoji.indices[1];
  }

  ctx.fillText(text.slice(lastIndex), currentX, y);
}

// ── Event ─────────────────────────────────────────────────────────────────────
module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    try {
      const bg     = await loadImage('./background.png');
      const width  = bg.width;
      const height = bg.height;

      const canvas = createCanvas(width, height);
      const ctx    = canvas.getContext('2d');
      ctx.drawImage(bg, 0, 0, width, height);

      // Avatar
      const avatar  = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
      const centerX = width / 2 - 6;
      const centerY = height * 0.42 - 5;
      const radius  = height * 0.17;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();

      // Main text
      ctx.textAlign  = 'left';
      ctx.fillStyle  = '#333';
      ctx.font       = `bold ${Math.floor(height * 0.055)}px sans-serif`;

      const mainText  = `Welcome to Velvet Nights ✦, ${member.displayName}!`;
      const textWidth = ctx.measureText(mainText).width;
      const mainX     = width / 2 - textWidth / 2;
      const mainY     = centerY + radius + height * 0.08 + 35;

      await drawTextWithTwemoji(ctx, mainText, mainX, mainY);

      // Sub text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#555';
      ctx.font      = `${Math.floor(height * 0.05)}px sans-serif`;
      ctx.fillText(`You're member #${member.guild.memberCount}`, width / 2, centerY + radius + height * 0.14 + 50);

      // Build attachment & embed
      const buffer     = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

      const welcomeEmbed = new EmbedBuilder()
        .setColor('#242429')
        .setTitle('welcome ♡')
        .setDescription(
          `hey ${member}, welcome to **Velvet Nights**\n` +
          `grab a seat and enjoy your stay ✦\n` +
          `<:Lines:1487779372671832247>`.repeat(22) + `\n` +
          `<:arrow:1487778652169965668>\u2002<#1486717273660981350> — read first\n` +
          `<:arrow:1487778652169965668>\u2002<#1486717419329159298> — learn more\n` +
          `<:arrow:1487778652169965668>\u2002<#1486717131398709288> — introduce yourself\n` +
          `<:arrow:1487778652169965668>\u2002<#1486718106360352888> — start chatting`
        )
        .setImage('attachment://welcome.png');

      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (channel) {
        await channel.send({
          content: `Welcome ${member}!`,
          files:   [attachment],
          embeds:  [welcomeEmbed],
        });
      }

    } catch (err) {
      console.error('[guildMemberAdd]', err);
    }
  },
};
