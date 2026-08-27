const { Events } = require('discord.js');
const config = require('../config/showcaseConfig');
const {
  pendingReplies,
  isConfiguredChannel,
  isMediaPost,
  getExistingThread,
  getOrCreateThread,
  repostReplyIntoThread,
  sendWarning,
  sendMediaOnlyWarning,
  makeNonce,
} = require('../utils/showcaseUtils');

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    try {
      // Ignore bots (including ourselves) and system messages
      if (message.author.bot || message.system) return;

      // Only act inside configured showcase channels (thread messages have a
      // different channel.id than the parent, so this naturally lets thread
      // conversation happen freely without interference)
      if (!isConfiguredChannel(message.channel.id)) return;

      const isReply = message.reference && message.reference.messageId;

      if (isReply) {
        await handleReply(message);
        return;
      }

      // Not a reply -> treat as a fresh post
      if (!isMediaPost(message)) {
        // Text-only message with no attachment/embed/link — not allowed here
        await message.delete().catch(() => {});
        await sendMediaOnlyWarning(message.channel, message.author);
        return;
      }

      if (config.THREAD_CREATION_MODE === config.THREAD_CREATION_MODES.EAGER) {
        await getOrCreateThread(message);
      }
      // LAZY and MANUAL don't create a thread at post time — LAZY creates
      // it automatically on first reply, MANUAL waits for the button.
    } catch (err) {
      console.error('[showcase] messageCreate handler error:', err);
    }
  },
};

async function handleReply(message) {
  let originalMessage;
  try {
    originalMessage = await message.fetchReference();
  } catch {
    return; // referenced message was deleted or inaccessible
  }

  // Don't treat replies to the bot's own warning messages as discussion replies
  if (originalMessage.author.bot) return;

  // Prefer server nickname, then global display name, then username
  const authorName = message.member?.displayName
    ?? message.author.globalName
    ?? message.author.username;

  // Capture the reply content before we potentially delete it
  const replyPayload = {
    authorName,
    content: message.content,
    attachmentUrls: [...message.attachments.values()].map((a) => a.url),
    // Ping the original poster in the thread every time someone replies,
    // so they see the discussion (skip if they're replying to themselves)
    mentionUserId: originalMessage.author.id !== message.author.id
      ? originalMessage.author.id
      : undefined,
  };

  if (config.THREAD_CREATION_MODE !== config.THREAD_CREATION_MODES.MANUAL) {
    // EAGER: thread should already exist (created on post). If it somehow
    // doesn't (e.g. bot was offline), create it now.
    // LAZY: this IS the moment the thread gets created — on first reply.
    // Either way, no button needed — getOrCreateThread handles both cases.
    const thread = await getOrCreateThread(originalMessage);

    // Explicitly add the replier to the thread — more reliable than relying
    // on the @mention in repostReplyIntoThread to auto-add them.
    await thread.members.add(message.author.id).catch(() => {});

    await repostReplyIntoThread(thread, replyPayload);

    if (config.DELETE_REPLY_FROM_MAIN_CHANNEL) {
      await message.delete().catch(() => {});
    }

    await sendWarning(message.channel, {
      user: message.author,
      threadUrl: thread.url,
    });
    return;
  }

  // MANUAL mode: check if a thread already exists (maybe created earlier
  // via the button) before asking again.
  const existingThread = await getExistingThread(originalMessage);

  if (existingThread) {
    await existingThread.members.add(message.author.id).catch(() => {});

    await repostReplyIntoThread(existingThread, replyPayload);

    if (config.DELETE_REPLY_FROM_MAIN_CHANNEL) {
      await message.delete().catch(() => {});
    }

    await sendWarning(message.channel, {
      user: message.author,
      threadUrl: existingThread.url,
    });
    return;
  }

  // No thread yet (MANUAL mode, first reply) -> delete the reply, stash its
  // content, and offer a button
  if (config.DELETE_REPLY_FROM_MAIN_CHANNEL) {
    await message.delete().catch(() => {});
  }

  const nonce = makeNonce();

  const warningMessage = await sendWarning(message.channel, {
    user: message.author,
    withButton: true,
    nonce,
  });

  pendingReplies.set(nonce, {
    originalMessageId: originalMessage.id,
    originalChannelId: originalMessage.channel.id,
    replyAuthorId: message.author.id,
    content: replyPayload.content,
    attachmentUrls: replyPayload.attachmentUrls,
    warningMessageId: warningMessage.id,
  });
}
