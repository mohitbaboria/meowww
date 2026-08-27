const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const config = require('../config/showcaseConfig');

/**
 * In-memory store for reply payloads awaiting a "Create Thread" button click.
 * Keyed by a short nonce (customIds have a 100-char limit, so we don't stuff
 * full message content into the customId itself).
 *
 * Shape: { originalMessageId, originalChannelId, replyAuthorId, content, attachmentUrls, warningMessageId }
 *
 * NOTE: this is in-memory and will be lost on restart. Swap for a DB/cache
 * (Redis, sqlite, etc.) if you need persistence across restarts.
 */
const pendingReplies = new Map();

/**
 * Map of originalMessageId -> threadId, so we don't have to re-resolve
 * message.thread repeatedly. Also lost on restart; message.thread on a
 * freshly-fetched message covers most of what this is used for, this is
 * just a fast-path cache.
 */
const threadCache = new Map();

function isConfiguredChannel(channelId) {
  return config.SHOWCASE_CHANNEL_IDS.includes(channelId);
}

/**
 * Decide if a message counts as a valid showcase "post" — i.e. it has
 * actual media: an attachment, an embed, or a link that Discord will turn
 * into an embed shortly after (embeds for links don't exist yet at the
 * moment messageCreate fires, they arrive later via messageUpdate).
 *
 * Plain text with no attachment/embed/link does NOT count — that should be
 * deleted and the user told this channel is for media posts only.
 */
const URL_PATTERN = /https?:\/\/\S+/i;

function isMediaPost(message) {
  const hasAttachment = message.attachments.size > 0;
  const hasEmbed = message.embeds.length > 0;
  const hasUrl = URL_PATTERN.test(message.content ?? '');
  return hasAttachment || hasEmbed || hasUrl;
}

/**
 * Get the thread attached to a post, if one exists, without creating one.
 *
 * IMPORTANT: this fetches directly from Discord rather than relying only on
 * the client's cache. `message.thread` only works if the thread happens to
 * already be cached (e.g. created earlier in this same bot session) — after
 * a restart, or for threads the bot didn't just create, that cache can be
 * empty even though the thread genuinely exists. Since a thread created
 * from a message always shares that message's ID, we can fetch it directly
 * by ID via the channel's ThreadManager, which checks Discord itself.
 */
async function getExistingThread(originalMessage) {
  const cachedId = threadCache.get(originalMessage.id);
  if (cachedId) {
    try {
      const cached = await originalMessage.guild.channels.fetch(cachedId);
      if (cached && !cached.archived) return cached;
    } catch {
      // cached channel no longer resolvable, fall through to a real fetch
    }
  }

  try {
    // Threads share their ID with the message that started them, so this
    // fetches the exact thread for this post (archived or not) if it exists.
    const thread = await originalMessage.channel.threads.fetch(originalMessage.id);
    if (thread) {
      threadCache.set(originalMessage.id, thread.id);
      return thread;
    }
  } catch {
    // no thread exists for this message
  }

  return null;
}

/**
 * Get the thread on a post, creating it if it doesn't exist yet.
 */
async function getOrCreateThread(originalMessage) {
  const existing = await getExistingThread(originalMessage);
  if (existing) return existing;

  const threadName = buildThreadName(originalMessage);

  const thread = await originalMessage.startThread({
    name: threadName,
    autoArchiveDuration: minutesToArchiveEnum(config.THREAD_ARCHIVE_MINUTES),
    reason: 'Showcase discussion thread',
  });

  threadCache.set(originalMessage.id, thread.id);

  // Archive right away to keep the channel tidy. This doesn't delete or lock
  // anything — the thread still exists and Discord auto-unarchives it the
  // moment anyone sends a message in it (e.g. via repostReplyIntoThread).
  await thread.setArchived(true, 'Archiving immediately after creation').catch(() => {});

  return thread;
}

function buildThreadName(originalMessage) {
  const displayName = originalMessage.member?.displayName
    ?? originalMessage.author.globalName
    ?? originalMessage.author.username;
  return `${displayName}'s post`;
}

function minutesToArchiveEnum(minutes) {
  // Discord API only accepts these exact values (in minutes).
  const valid = [60, 1440, 4320, 10080];
  return valid.includes(minutes) ? minutes : ThreadAutoArchiveDuration.OneHour;
}

/**
 * Repost a user's reply content into the correct thread, preserving context.
 * Sent as a plain message (not an embed) so it reads naturally, like the
 * person just typed it in the thread themselves.
 */
async function repostReplyIntoThread(thread, { authorName, content, attachmentUrls, mentionUserId }) {
  const text = content && content.trim().length > 0
    ? content.trim()
    : '*(no text, just an attachment)*';

  const mentionPrefix = mentionUserId ? `<@${mentionUserId}> ` : '';

  await thread.send({
    content: `${mentionPrefix}**${authorName}:** ${text}`,
    files: attachmentUrls ?? [],
  });
}

/**
 * Send a temporary warning in the main channel telling the user discussion
 * belongs in the thread. Optionally attaches a "Create Thread" button.
 */
async function sendWarning(channel, { user, threadUrl, withButton, nonce }) {
  let text;

  if (threadUrl) {
    text = `Hey ${user}! Let's keep the chat going in the thread instead 🧵 Hop in here: ${threadUrl}`;
  } else if (withButton) {
    text = `Hey ${user}! Mind moving this over to a thread instead of the main channel? Tap the button below and I'll set one up for you.`;
  } else {
    text = `Hey ${user}! This channel's just for posts — let's keep discussion in the thread instead.`;
  }

  const payload = { content: text };

  if (withButton) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_thread:${nonce}`)
        .setLabel('Create Discussion Thread')
        .setStyle(ButtonStyle.Primary),
    );
    payload.components = [row];
  }

  const warningMessage = await channel.send(payload);

  // Auto-cleanup the warning message after a while so the channel stays tidy,
  // but only if it has no live button (a button warning should persist until used).
  if (!withButton) {
    setTimeout(() => {
      warningMessage.delete().catch(() => {});
    }, config.WARNING_MESSAGE_LIFETIME_MS);
  }

  return warningMessage;
}

/**
 * Warn a user that their text-only message was removed because this
 * channel requires an actual image/attachment/link.
 */
async function sendMediaOnlyWarning(channel, user) {
  const warningMessage = await channel.send({
    content: `Hey ${user}! This channel's for sharing images, attachments, or links — mind adding one to your post? Text on its own doesn't quite fit here 🙂`,
  });

  setTimeout(() => {
    warningMessage.delete().catch(() => {});
  }, config.WARNING_MESSAGE_LIFETIME_MS);

  return warningMessage;
}

function makeNonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  pendingReplies,
  threadCache,
  isConfiguredChannel,
  isMediaPost,
  getExistingThread,
  getOrCreateThread,
  repostReplyIntoThread,
  sendWarning,
  sendMediaOnlyWarning,
  makeNonce,
};