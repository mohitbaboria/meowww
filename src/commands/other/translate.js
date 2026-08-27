const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require("discord.js");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Translate to English")
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.deferReply(); 

    try {
      const text = interaction.targetMessage.content;
      if (!text) {
        return interaction.editReply("No text found to translate.");
      }

      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`
      );
      const data = await res.json();

      const translated = data.responseData?.translatedText; // ?. is called optional chaining. its equivalent to data.responseData == null ? undefined : data.responseData.translatedText


      const container = translated
        ? new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Translation"),
            new TextDisplayBuilder().setContent(`**\`Original\`**`),
            new TextDisplayBuilder().setContent(text),
            new TextDisplayBuilder().setContent("**`Translation`**"),
            new TextDisplayBuilder().setContent(translated)
          )
        : new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Translation Failed"),
            new TextDisplayBuilder().setContent("The translation service failed.")
          );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

    } catch (err) {
      console.error(err);

      
      await interaction.editReply("An error occurred while translating.");
    }
  },
};


// add a logic if the language is already English, then respond with a message saying "The text is already in English."
