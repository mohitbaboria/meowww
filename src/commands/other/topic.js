const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ── Question bank ─────────────────────────────────────────────────────────────
const questions = [
// personality
{ q: "Do you listen to sad songs when you're feeling down, or chill songs to distract yourself?", tag: "personality" },
{ q: "Have you ever felt cringe reading your old messages?", tag: "personality" },
{ q: "What's a tiny thing someone did that you still remember for no reason?", tag: "personality" },
{ q: "Have you ever typed a long message and deleted the whole thing?", tag: "personality" },
{ q: "Do you ever miss people and then remember why you stopped talking?", tag: "personality" },
{ q: "What's something you act like you don't care about but secretly do?", tag: "personality" },
{ q: "What's your 'I shouldn't text this person right now' moment?", tag: "personality" },
{ q: "Do you replay conversations in your head after they end?", tag: "personality" },
{ q: "What's a compliment you still remember?", tag: "personality" },
{ q: "Do you think people see you the same way you see yourself?", tag: "personality" },
{ q: "Do you ever feel nostalgic for a time that wasn't actually better?", tag: "personality" },
{ q: "What's a habit you have that nobody would guess?", tag: "personality" },
{ q: "Have you ever wanted attention but acted like you didn't?", tag: "personality" },
{ q: "What's something you wish people asked you more about?", tag: "personality" },
{ q: "Do you think you're easy or difficult to understand?", tag: "personality" },

// social
{ q: "What's the weirdest reason you've instantly liked someone?", tag: "social" },
{ q: "What's an instant green flag that's oddly specific?", tag: "social" },
{ q: "What's something people do that annoys you for no logical reason?", tag: "social" },
{ q: "What's the most random thing that made you laugh really hard?", tag: "social" },
{ q: "What's a topic you can suddenly talk way too much about?", tag: "social" },
{ q: "What's something people do that instantly makes conversations feel comfortable?", tag: "social" },
{ q: "Have you ever become friends with someone you thought you'd dislike?", tag: "social" },
{ q: "What's a really small thing that makes someone more attractive as a person?", tag: "social" },
{ q: "What's the weirdest first impression you've had of someone?", tag: "social" },
{ q: "Would you rather have a lot of friends or a few people you're really close to?", tag: "social" },

// fun
{ q: "If your search history became public, what would be the most confusing thing there?", tag: "fun" },
{ q: "What's the most useless thing you somehow know a lot about?", tag: "fun" },
{ q: "What's your brain's favorite thing to think about at 2 AM?", tag: "fun" },
{ q: "What's the most random thing you've searched at 3 AM?", tag: "fun" },
{ q: "If your thoughts had subtitles, would you be embarrassed?", tag: "fun" },
{ q: "If your brain had loading screens, what tips would appear?", tag: "fun" },
{ q: "What's the weirdest thing you've become temporarily obsessed with?", tag: "fun" },
{ q: "What's your most unnecessary talent?", tag: "fun" },

// philosophy
{ q: "Do you think people miss who you were, or who they thought you were?", tag: "philosophy" },
{ q: "If memories could be deleted, would you erase some?", tag: "philosophy" },
{ q: "What's worse: losing people slowly or all at once?", tag: "philosophy" },
{ q: "Do you think loneliness is about having no people, or having no connection?", tag: "philosophy" },
{ q: "If everyone forgot you tomorrow except one person, who would you want it to be?", tag: "philosophy" },
{ q: "Do people change because they want to, or because life forces them to?", tag: "philosophy" },
{ q: "Do you think some people enter our lives only temporarily for a reason?", tag: "philosophy" },
{ q: "Would life feel more meaningful if it were shorter?", tag: "philosophy" },
{ q: "If you could relive one day forever, what kind of day would it be?", tag: "philosophy" },

// entertainment
{ q: "What's a song you avoided because it hurt too much to hear?", tag: "entertainment" },
{ q: "Have you ever gotten attached to a fictional character way too much?", tag: "entertainment" },
{ q: "What's your comfort song when life feels weird?", tag: "entertainment" },
{ q: "What's a movie or scene that stayed in your head for days?", tag: "entertainment" },
{ q: "What's a song lyric that randomly hits harder than it should?", tag: "entertainment" },
{ q: "What's a fictional world you'd actually survive in?", tag: "entertainment" },
{ q: "Have you ever liked a bad movie just because it felt comforting?", tag: "entertainment" },
{ q: "What's a character you defended like they were your friend?", tag: "entertainment" },
{ q: "What's a song you accidentally ruined by overplaying it?", tag: "entertainment" },

// gaming
{ q: "What's a game you downloaded for '5 minutes' and lost your entire day to?", tag: "gaming" },
{ q: "What's a game NPC you were more attached to than actual players?", tag: "gaming" },
{ q: "Have you ever felt genuinely sad after finishing a game?", tag: "gaming" },
{ q: "What's a game you loved but never finished?", tag: "gaming" },
{ q: "Have you ever gotten emotionally attached to a game soundtrack?", tag: "gaming" },
{ q: "What's a game mechanic you wish existed in real life?", tag: "gaming" },
{ q: "Which game made you lose track of time the hardest?", tag: "gaming" },
{ q: "What's a game you keep uninstalling and reinstalling?", tag: "gaming" },

// psychology
{ q: "Why do people suddenly miss someone after finally moving on?", tag: "psychology" },
{ q: "Why do we care more about some opinions than others?", tag: "psychology" },
{ q: "Do you think overthinkers notice things other people miss?", tag: "psychology" },
{ q: "Why do some memories feel stronger than others?", tag: "psychology" },
{ q: "Do people get attached to a person or to how they feel around them?", tag: "psychology" },

// lifestyle
{ q: "What's a tiny thing that can completely fix your mood?", tag: "lifestyle" },
{ q: "What's your ideal 'doing absolutely nothing' day?", tag: "lifestyle" },
{ q: "What's something you keep saying you'll start soon?", tag: "lifestyle" },
{ q: "What's one thing you'd remove from modern life?", tag: "lifestyle" },
{ q: "What's something you enjoy that most people find boring?", tag: "lifestyle" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getRandom    = arr => arr[Math.floor(Math.random() * arr.length)];
const normalize    = str => str.toLowerCase().replace(/[_\s]/g, '');
const randomColor  = ()  => Math.floor(Math.random() * 0xffffff);
const formatTag    = str => str.replace(/\b\w/g, c => c.toUpperCase());

const uniqueTags   = [...new Set(questions.map(q => q.tag))];
const tagChoices   = uniqueTags.map(t => ({ name: formatTag(t), value: t }));

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('Get a random discussion topic')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Topic category (optional)')
        .setRequired(false)
        .addChoices(...tagChoices)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('category');

    let pool = questions;

    if (input) {
      pool = questions.filter(q => normalize(q.tag) === normalize(input));

      if (!pool.length) {
        const tags = uniqueTags.map(formatTag);
        return interaction.reply({
          content:   `Invalid category.\nAvailable: ${tags.join(', ')}`,
          ephemeral: true,
        });
      }
    }

    const selected = getRandom(pool);

    const embed = new EmbedBuilder()
      .setTitle('Topic')
      .setDescription(selected.q)
      .setColor(randomColor())
      .setFooter({
        text:    `Category: ${formatTag(selected.tag)}`,
        iconURL: interaction.client.user.displayAvatarURL(),
      });

    return interaction.reply({ embeds: [embed] });
  },
};
