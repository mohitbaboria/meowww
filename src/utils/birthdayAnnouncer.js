const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

// ─── Constants ────────────────────────────────────────────────────────────────

const BIRTHDAY_CHANNEL_ID = '1486718106360352888';
const DATA_PATH  = path.join(__dirname, '..', 'commands', 'other', 'data', 'card_profiles.json');
const STATE_PATH = path.join(__dirname, '..', 'commands', 'other', 'data', 'birthday_state.json');

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function loadProfiles() {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function loadState() {
    if (!fs.existsSync(STATE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
}

function saveState(state) {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Birthday Parsing ─────────────────────────────────────────────────────────

function parseBirthday(str) {
    if (!str) return null;
    const clean = str.trim();
    const months = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
        jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
        sep: 9, oct: 10, nov: 11, dec: 12,
    };

    const wordMatch =
        clean.match(/^(\d{1,2})\s+([a-zA-Z]+)$/) ||
        clean.match(/^([a-zA-Z]+)\s+(\d{1,2})$/);
    if (wordMatch) {
        const dayStr   = wordMatch[1].match(/\d/) ? wordMatch[1] : wordMatch[2];
        const monthStr = wordMatch[1].match(/\d/) ? wordMatch[2] : wordMatch[1];
        const month    = months[monthStr.toLowerCase()];
        if (month) return { month, day: parseInt(dayStr) };
    }

    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (slashMatch) {
        return { month: parseInt(slashMatch[2]), day: parseInt(slashMatch[1]) };
    }

    return null;
}

function resolveOffsetMinutes(profile) {
    if (!profile) return null;
    if (profile.offsetMinutes !== null && profile.offsetMinutes !== undefined)
        return profile.offsetMinutes;
    if (profile.utcOffset !== null && profile.utcOffset !== undefined)
        return Math.round(profile.utcOffset * 60);
    return null;
}

function getLocalDateInfo(offsetMinutes) {
    const now = new Date();

    if (offsetMinutes === null || offsetMinutes === undefined) {
        return {
            month: now.getUTCMonth() + 1,
            day:   now.getUTCDate(),
            key:   `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`,
        };
    }

    const localTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    return {
        month: localTime.getUTCMonth() + 1,
        day:   localTime.getUTCDate(),
        key:   `${localTime.getUTCFullYear()}-${localTime.getUTCMonth() + 1}-${localTime.getUTCDate()}`,
    };
}

// ─── Core Check ───────────────────────────────────────────────────────────────

async function checkBirthdays(client) {
    const profiles = loadProfiles();
    const state    = loadState(); // { [userId]: lastSentDateKey }

    const toAnnounce = [];

    for (const [userId, profile] of Object.entries(profiles)) {
        const bday = parseBirthday(profile?.birthday);
        if (!bday) continue;

        const offsetMinutes = resolveOffsetMinutes(profile);
        const { month, day, key } = getLocalDateInfo(offsetMinutes);

        if (month !== bday.month || day !== bday.day) continue;
        if (state[userId] === key) continue;

        toAnnounce.push(userId);
        state[userId] = key;
    }

    if (toAnnounce.length > 0) {
        const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);

        if (channel && channel.isTextBased()) {
            for (const userId of toAnnounce) {
                // Keep the real <@id> mention so the birthday person still
                // gets tagged/pinged, but also include their plain username
                // as a fallback in case the mention renders as "invalid-user"
                // client-side (happens when Discord hasn't cached that user).
                const user = await client.users.fetch(userId).catch(() => null);
                const username = user ? user.username : userId;

                await channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: ['everyone', 'users'] }, // 'everyone' enables @here; 'users' lets <@userId> actually notify the birthday person
                    components: [
                        {
                            type: 17,
                            accent_color: 16738740,
                            spoiler: false,
                            components: [
                                {
                                    type: 10,
                                    content: `**Happy Birthday,** <@${userId}>\n(\`@${username}\`) !! <:1509812659384483951:1525421426176426056> :cake:`,
                                },
                            ],
                        },
                        {
                            type: 10,
                            content: '@here',
                        },
                    ],
                }).catch(() => {});
            }
        }

        saveState(state);
    }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function startBirthdayScheduler(client) {
    checkBirthdays(client).catch(() => {});
    setInterval(() => checkBirthdays(client).catch(() => {}), 60 * 60 * 1000);
}

module.exports = { startBirthdayScheduler };