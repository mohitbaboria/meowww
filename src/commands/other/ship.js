const { SlashCommandBuilder, AttachmentBuilder, ApplicationIntegrationType, InteractionContextType } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

// 🖼️ Your generated backgrounds
const BG_NORMAL = path.join(__dirname, "../../../ship_normal.png");
const BG_SELF = path.join(__dirname, "../../../ship_self.png");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ship")
        .setDescription("Ship two users ❤️")
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .setContexts(
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        )
        .addUserOption(option =>
            option.setName("user1").setDescription("First user").setRequired(true))
        .addUserOption(option =>
            option.setName("user2").setDescription("Second user").setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const user1 = interaction.options.getUser("user1");
        let user2 = interaction.options.getUser("user2");

        // If no user2, fall back to the command user
        if (!user2) user2 = interaction.user;

        const sameUser = user1.id === user2.id;

        const avatar1 = user1.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });
        const avatar2 = user2.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });

        const canvas = createCanvas(1000, 400);
        const ctx = canvas.getContext("2d");

        // 🖼️ Load correct background
        const bg = await loadImage(sameUser ? BG_SELF : BG_NORMAL);

        const scale = Math.max(
            canvas.width / bg.width,
            canvas.height / bg.height
        );

        const x = (canvas.width / 2) - (bg.width / 2) * scale;
        const y = (canvas.height / 2) - (bg.height / 2) * scale;

        ctx.drawImage(bg, x, y, bg.width * scale, bg.height * scale);

        // 👤 Draw circular avatars
        const img1 = await loadImage(avatar1);
        const img2 = await loadImage(avatar2);

        function drawCircleImage(img, x, y, size) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, x, y, size, size);
            ctx.restore();
        }

        drawCircleImage(img1, 150, 100, 200);
        drawCircleImage(img2, 650, 100, 200);

        // 💯 Percentage text
        const percent = sameUser ? 100 : Math.floor(Math.random() * 101);

        ctx.font = "40px sans-serif";
        ctx.fillStyle = "#ffffff";

        const text = `${percent}%`;
        const metrics = ctx.measureText(text);
        const textX = (canvas.width - metrics.width) / 2;

        ctx.fillText(text, textX, 330);

        const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
            name: "ship.png"
        });

        // Use globalName/username as fallback since displayName needs guild member (not available in DMs/private channels)
        const name1 = user1.globalName ?? user1.username;
        const name2 = user2.globalName ?? user2.username;

        await interaction.editReply({
            content: sameUser
                ? `💖 ${name1} × ${name1} (Self Love 100%)`
                : `💘 ${name1} × ${name2}`,
            files: [attachment]
        });
    }
};