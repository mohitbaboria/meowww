const THREAD_CREATION_MODES = {
  EAGER: 0,
  LAZY: 1,
  MANUAL: 2,
};

module.exports = {
  // Channels where this "post here, discuss in threads" system applies
  SHOWCASE_CHANNEL_IDS: [
    '1486718744985211030',
    '1520483221081424094',
    '1486718784013078608',
  ],

  THREAD_CREATION_MODES,

  // Change this single value to switch modes: 0, 1, or 2 (see above)
  THREAD_CREATION_MODE: THREAD_CREATION_MODES.LAZY,

  // Minutes of inactivity before a thread auto-archives.
  // Discord only accepts 60, 1440, 4320, or 10080 (in minutes).
  THREAD_ARCHIVE_MINUTES: 60,

  // Delete the user's reply from the main channel after it's reposted into the thread
  DELETE_REPLY_FROM_MAIN_CHANNEL: true,

  // How long (ms) the in-channel warning message stays before auto-deleting itself
  WARNING_MESSAGE_LIFETIME_MS: 10_000,
};