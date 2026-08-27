const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SectionBuilder,
    SeparatorSpacingSize,
} = require('discord.js');

const fs   = require('fs');
const path = require('path');



// ─── Data ────────────────────────────────────────────────────────────────────

const DATA_PATH = path.join(__dirname, 'data', 'card_profiles.json');

function loadData() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ─── Role Config ─────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
    pronouns: {
        label: 'Pronoun',
        emoji: '🏷️',
        multipleAllowed: false,
        roles: {
            '1490547664826142860': 'He/Him',
            '1490547732228604055': 'She/Her',
            '1490547780320628788': 'They/Them',
            '1490547846850678815': 'Any/All',
        },
    },
    personality: {
        label: 'Personality',
        emoji: '✨',
        multipleAllowed: true,
        roles: {
            '1490550485340389406': 'Creative',
            '1490551323995934821': 'Focused',
            '1490551882500800655': 'Curious',
            '1490548805202874388': 'Chill',
            '1490550973654106123': 'Calm',
            '1490548907015540876': 'Introverted',
            '1490549660907999342': 'Extroverted',
            '1490551735180071013': 'Analytical',
            '1490552156170883103': 'Supportive',
            '1490551172807921795': 'Expressive',
        },
    },
    hobbies: {
        label: 'Hobbies',
        emoji: '🎯',
        multipleAllowed: true,
        roles: {
            '1490559924529401966': 'Gaming',
            '1490560189160751236': 'Music',            
            '1490560314205540372': 'Movies',

            '1490561011038556341': 'Anime',
            '1490560455263911996': 'Coding/Tech',
            '1490560551305351279': 'Art & Design',

            '1490560671308320878': 'Fitness',
            '1490560905392553994': 'Travel',
            '1490561074909675572': 'Reading',
            '1498518326656110592': 'Writing',
            '1498514352779825313': 'Cooking', //tp ne added
   
            '1498514193996054599': 'Photography', // to be added




        },
    },
    continents: {
        label: 'Region',
        emoji: '🌍',
        multipleAllowed: false,
        roles: {
            '1490558806717894778': 'Europe',
            '1490559160775868488': 'Americas',
            '1490555880524087306': 'Asia',
            '1490558942328393910': 'Oceania',
            '1490558872883298525': 'Africa',
        },
    },
};

// ─── Social Platform Config ───────────────────────────────────────────────────

const SOCIAL_CONFIG = {
    instagram: {
        label: 'Instagram',
        emoji: '<:ea0692691904fca9:1498379676198899924>',
        buildURL: (handle) => `https://instagram.com/${handle}`,
    },
    tiktok: {
        label: 'TikTok',
        emoji: '<:b4002d11fb3b5c1c:1498380729116262410>',
        buildURL: (handle) => `https://tiktok.com/@${handle}`,
    },
    spotify: {
        label: 'Spotify',
        emoji: '<:40518c6ced9fed93:1498379836740206682>',
        buildURL: (handle) => `https://open.spotify.com/user/${handle}`,
    },
    steam: {
        label: 'Steam',
        emoji: '<:b68f2f4df4af9085:1498380665463505080>',
        buildURL: (handle) => `https://steamcommunity.com/id/${handle}`,
    },
    youtube: {
        label: 'YouTube',
        emoji: '<:c569f6e10f1fa390:1498380766093250590>',
        buildURL: (handle) => `https://youtube.com/@${handle}`,
    },
};

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a time string the user typed RIGHT NOW into an exact UTC offset
 * expressed in whole minutes.
 *
 * Why minutes, not fractional hours?
 *   Storing minutes as an integer keeps all arithmetic exact — no floating-
 *   point drift — and some real timezones (India UTC+5:30, Nepal UTC+5:45,
 *   etc.) only land on a minute boundary, not a 15-minute one.
 *
 * Rules:
 *   - Hour ≥ 13  → 24-hour format accepted without AM/PM
 *   - Hour ≤ 12  → AM/PM is REQUIRED to remove ambiguity
 *   - No rounding; the value is stored exactly as derived
 *
 * Returns:
 *   { offsetMinutes: number }  on success
 *   { error: string }          on bad input
 *   null                       if timeStr is empty
 */
function parseTimeToUTCOffset(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.trim().toUpperCase();

    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);

    let localHour   = null;
    let localMinute = null;

    if (match12) {
        let h        = parseInt(match12[1]);
        const m      = parseInt(match12[2]);
        const period = match12[3];
        if (h < 1 || h > 12) return { error: `Hour \`${h}\` is not valid for 12-hour format. Use 1–12 with AM/PM.` };
        if (m > 59)           return { error: `Minutes \`${m}\` are out of range.` };
        if (period === 'AM' && h === 12) h = 0;
        if (period === 'PM' && h !== 12) h += 12;
        localHour   = h;
        localMinute = m;
    } else if (match24) {
        const h = parseInt(match24[1]);
        const m = parseInt(match24[2]);
        if (h > 23) return { error: `Hour \`${h}\` is out of range for 24-hour format.` };
        if (m > 59) return { error: `Minutes \`${m}\` are out of range.` };
        if (h <= 12) {
            return { error: `\`${clean}\` is ambiguous — is it AM or PM? Add AM/PM, e.g. \`${clean} AM\` or \`${clean} PM\`.` };
        }
        localHour   = h;
        localMinute = m;
    } else {
        return { error: `Could not understand \`${clean}\`. Try formats like \`8:45 PM\`, \`14:20\`, or \`11:30 AM\`.` };
    }

    // Compute difference from current UTC in exact minutes
    const now        = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const localTotal = localHour * 60 + localMinute;

    let diffMinutes = localTotal - utcMinutes;
    // Normalise into UTC-12 (−720 min) … UTC+14 (+840 min)
    if (diffMinutes > 840)  diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;

    return { offsetMinutes: diffMinutes };
}

/**
 * Given a stored UTC offset in minutes, return a Discord Unix timestamp
 * that represents the user's current local time — formatted as short time
 * (hh:mm AM/PM) using Discord's <t:UNIX:t> syntax.
 *
 * How this gives a "live" clock:
 *   We take the current UTC epoch (seconds) and add the user's offset so
 *   the resulting timestamp points to the same wall-clock minute in their
 *   timezone. Discord renders <t:X:t> in the viewer's local locale, but
 *   because we offset the epoch the displayed time equals the target user's
 *   local time regardless of who is looking.
 *
 * Returns a string like "<t:1234567890:t>  (UTC+05:30)" or null.
 */
function getUserTimeDisplay(offsetMinutes) {
    if (offsetMinutes === null || offsetMinutes === undefined) return null;

    // Derive the user's current local time purely from UTC + their offset.
    // We never use a Discord <t:> timestamp here because <t:X:t> always
    // renders in the *viewer's* local timezone — it cannot display a fixed
    // timezone's time correctly for viewers in different zones.
    const now        = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    // Wrap into [0, 1440) so we stay within a single day
    const localMinutes = ((utcMinutes + offsetMinutes) % 1440 + 1440) % 1440;

    const h24  = Math.floor(localMinutes / 60);
    const m    = localMinutes % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12    = h24 % 12 || 12;
    const mStr   = String(m).padStart(2, '0');

    // UTC label, e.g. UTC+05:30
    const sign  = offsetMinutes >= 0 ? '+' : '-';
    const absM  = Math.abs(offsetMinutes);
    const hPart = String(Math.floor(absM / 60)).padStart(2, '0');
    const mPart = String(absM % 60).padStart(2, '0');
    const utcLabel = `UTC${sign}${hPart}:${mPart}`;

    return `${h12}:${mStr} ${period} (${utcLabel})`;
}

/**
 * Compute the time difference between two stored UTC offsets (both in minutes)
 * and return a descriptive string, or null if either offset is absent.
 *
 * Precision: integer minutes, no rounding, so "5h 30m" (India vs UTC) works.
 */
function getTimeDiff(viewerOffsetMinutes, targetOffsetMinutes) {
    if (viewerOffsetMinutes === null || viewerOffsetMinutes === undefined ||
        targetOffsetMinutes === null || targetOffsetMinutes === undefined) return null;

    const diffMinutes = targetOffsetMinutes - viewerOffsetMinutes;
    if (diffMinutes === 0) return '📍 Same timezone as you';

    const absDiff = Math.abs(diffMinutes);
    const h       = Math.floor(absDiff / 60);
    const m       = absDiff % 60;
    const diffStr = (h > 0 && m > 0) ? `${h}h ${m}m`
                  : (h > 0)           ? `${h}h`
                  :                     `${m}m`;

    // Work out what time of day it currently is for the target.
    // Use the same pure UTC-minutes arithmetic as getUserTimeDisplay so there
    // is no seconds-level drift introduced by Date.now().
    const utcNow        = new Date();
    const utcMins       = utcNow.getUTCHours() * 60 + utcNow.getUTCMinutes();
    const targetMinutes = ((utcMins + targetOffsetMinutes) % 1440 + 1440) % 1440;
    const targetHour    = Math.floor(targetMinutes / 60);

    let timeOfDay;
    if      (targetHour >= 5  && targetHour < 12) timeOfDay = '🌅 morning there';
    else if (targetHour >= 12 && targetHour < 17) timeOfDay = '☀️ afternoon there';
    else if (targetHour >= 17 && targetHour < 21) timeOfDay = '🌆 evening there';
    else                                           timeOfDay = '🌙 night there';

    return diffMinutes > 0
        ? `⏱️ **${diffStr} ahead** of you — ${timeOfDay}`
        : `⏱️ **${diffStr} behind** you — ${timeOfDay}`;
}

// ─── Birthday Helpers ─────────────────────────────────────────────────────────

/**
 * Parse birthday string like "14 July", "July 14", "14/07"
 * Returns { month, day } or null.
 */
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

    // "14/07" — assume DD/MM
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (slashMatch) {
        return { month: parseInt(slashMatch[2]), day: parseInt(slashMatch[1]) };
    }

    return null;
}

function formatBirthday(month, day) {
    const date = new Date(2000, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function isBirthdayToday(month, day) {
    const now = new Date();
    return now.getUTCMonth() + 1 === month && now.getUTCDate() === day;
}

// ─── Social Helpers ───────────────────────────────────────────────────────────

/** Strip leading @, trim whitespace. Returns null if the result is empty. */
function sanitiseHandle(raw) {
    if (!raw) return null;
    const cleaned = raw.trim().replace(/^@+/, '');
    return cleaned.length > 0 ? cleaned : null;
}

/**
 * Build the socials line for the card.
 * Returns a compact markdown string of clickable links, or null if none set.
 */
function buildSocialsLine(socials) {
    if (!socials) return null;
    const parts = [];
    for (const [key, config] of Object.entries(SOCIAL_CONFIG)) {
        const handle = socials[key];
        if (handle) {
            parts.push(`${config.emoji} [${config.label}](${config.buildURL(handle)})`);
        }
    }
    return parts.length > 0 ? parts.join('  ·  ') : null;
}

// ─── Role Helper ──────────────────────────────────────────────────────────────

function getMatchedRoles(member, categoryConfig) {
    const matched = [];
    for (const [roleId, name] of Object.entries(categoryConfig.roles)) {
        if (member.roles.cache.has(roleId)) {
            matched.push(name);
            if (!categoryConfig.multipleAllowed) break;
        }
    }
    return matched;
}

// ─── Build Card ───────────────────────────────────────────────────────────────

async function buildCard(targetMember, viewerProfile, targetProfile, isSelf) {
    const user        = targetMember.user;
    const displayName = targetMember.displayName;
    const avatarURL   = user.displayAvatarURL({ size: 256, extension: 'png' });

    // Roles
    const pronouns    = getMatchedRoles(targetMember, ROLE_CONFIG.pronouns);
    const personality = getMatchedRoles(targetMember, ROLE_CONFIG.personality);
    const hobbies     = getMatchedRoles(targetMember, ROLE_CONFIG.hobbies);
    const continents  = getMatchedRoles(targetMember, ROLE_CONFIG.continents);

    // Profile data — use offsetMinutes (new field); fall back to legacy
    // utcOffset (fractional hours) for profiles saved before this update.
    const note = targetProfile?.note || null;
    const socials = targetProfile?.socials || null;

    const targetOffsetMinutes = resolveOffsetMinutes(targetProfile);
    const viewerOffsetMinutes = resolveOffsetMinutes(viewerProfile);

    const birthday    = targetProfile?.birthday ? parseBirthday(targetProfile.birthday) : null;
    const timeDisplay = getUserTimeDisplay(targetOffsetMinutes);
    // Time diff is only meaningful when viewing someone else
    const timeDiff    = !isSelf ? getTimeDiff(viewerOffsetMinutes, targetOffsetMinutes) : null;

    // ── Build Component V2 Container ──────────────────────────────────────────

    const container = new ContainerBuilder();

    // ── Header: name + birthday + live local time + avatar ───────────────────
    const headerLines = [`## ${displayName}`];

    if (birthday) {
        const formatted = formatBirthday(birthday.month, birthday.day);
        const isToday   = isBirthdayToday(birthday.month, birthday.day);
        headerLines.push(`🎂 **Birthday** ${formatted}${isToday ? ' 🎉 Today!' : ''}`);
    }

    if (timeDisplay) {
        headerLines.push(`🕐 **Local Time** ${timeDisplay}`);
    }

    const header = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(headerLines.join('\n'))
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatarURL)
        );

    container.addSectionComponents(header);

    // ── Time difference ───────────────────────────────────────────────────────
    if (timeDiff) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${timeDiff}`)
        );
    }

    // ── Roles ─────────────────────────────────────────────────────────────────
    const roleLines = [];
    if (pronouns.length > 0)
        roleLines.push(`${ROLE_CONFIG.pronouns.emoji} **${ROLE_CONFIG.pronouns.label}** ${pronouns.join(', ')}`);
    if (personality.length > 0)
        roleLines.push(`${ROLE_CONFIG.personality.emoji} **${ROLE_CONFIG.personality.label}** ${personality.join(', ')}`);
    if (hobbies.length > 0)
        roleLines.push(`${ROLE_CONFIG.hobbies.emoji} **${ROLE_CONFIG.hobbies.label}** ${hobbies.join(', ')}`);
    if (continents.length > 0)
        roleLines.push(`${ROLE_CONFIG.continents.emoji} **${ROLE_CONFIG.continents.label}** ${continents.join(', ')}`);

    if (roleLines.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(roleLines.join('\n'))
        );
    }

    // ── Note ──────────────────────────────────────────────────────────────────
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            note ? `💬 *"${note}"*` : `-# No custom note set.`
        )
    );

    // ── Socials ───────────────────────────────────────────────────────────────
    const socialsLine = buildSocialsLine(socials);
    if (socialsLine) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(socialsLine)
        );
    }

    return container;
}

/**
 * Resolve a profile's UTC offset to whole minutes.
 *
 * New profiles store `offsetMinutes` (integer minutes, exact).
 * Profiles saved before this update store `utcOffset` (fractional hours).
 * This helper handles both so old data isn't broken.
 */
function resolveOffsetMinutes(profile) {
    if (!profile) return null;
    if (profile.offsetMinutes !== null && profile.offsetMinutes !== undefined)
        return profile.offsetMinutes;
    if (profile.utcOffset !== null && profile.utcOffset !== undefined)
        return Math.round(profile.utcOffset * 60); // convert legacy hours → minutes
    return null;
}

// ─── Command ──────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('View a profile card')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View your card or another member\'s card')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('The member to view (leave empty for yourself)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Edit your profile card info')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ── /card set ─────────────────────────────────────────────────────────
        if (sub === 'set') {
            const data            = loadData();
            const existing        = data[interaction.user.id] || {};
            const existingSocials = existing.socials || {};

            // Pre-fill socials field from saved data
            const socialsPreFill = Object.entries(existingSocials)
                .map(([platform, handle]) => `${platform}:${handle}`)
                .join(', ');

            // Single modal — 4 fields used (Discord max is 5)
            const modal = new ModalBuilder()
                .setCustomId('card_set_modal')
                .setTitle('Edit Your Profile Card');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('local_time')
                        .setLabel('Your current local time')
                        .setPlaceholder('e.g. 8:45 PM  or  14:20  or  11:30 AM')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setValue(existing.rawTime || '')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('birthday')
                        .setLabel('Your birthday')
                        .setPlaceholder('e.g. 14 July  or  July 14  or  14/07')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setValue(existing.birthday || '')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('note')
                        .setLabel('Custom note')
                        .setPlaceholder('e.g. Open to making friends.')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(150)
                        .setRequired(false)
                        .setValue(existing.note || '')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('socials')
                        .setLabel('Socials  (platform:username, comma-separated)')
                        .setPlaceholder(
                            'instagram:apple124, tiktok:kiwi424\n' +
                            'Platforms: instagram · tiktok · spotify · steam · youtube'
                        )
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(300)
                        .setRequired(false)
                        .setValue(socialsPreFill)
                ),
            );

            await interaction.showModal(modal);

            const submitted = await interaction.awaitModalSubmit({
                time: 5 * 60 * 1000,
                filter: i => i.customId === 'card_set_modal' && i.user.id === interaction.user.id,
            }).catch(() => null);

            if (!submitted) return;

            // ── Collect values ────────────────────────────────────────────────
            const rawTime     = submitted.fields.getTextInputValue('local_time').trim();
            const rawBirthday = submitted.fields.getTextInputValue('birthday').trim();
            const note        = submitted.fields.getTextInputValue('note').trim();
            const rawSocials  = submitted.fields.getTextInputValue('socials').trim();

            // Validate time
            const timeResult = rawTime ? parseTimeToUTCOffset(rawTime) : null;
            if (timeResult && timeResult.error) {
                return submitted.reply({
                    content: `❌ **Invalid time:** ${timeResult.error}`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const offsetMinutes = timeResult ? timeResult.offsetMinutes : null;
            const birthday      = parseBirthday(rawBirthday);

            // ── Parse socials ─────────────────────────────────────────────────
            const socials        = {};
            const socialWarnings = [];
            const validPlatforms = Object.keys(SOCIAL_CONFIG);

            if (rawSocials) {
                const entries = rawSocials.split(',').map(s => s.trim()).filter(Boolean);
                for (const entry of entries) {
                    const colonIdx = entry.indexOf(':');
                    if (colonIdx === -1) {
                        socialWarnings.push(`⚠️ \`${entry}\` — missing colon. Use \`platform:username\`.`);
                        continue;
                    }
                    const platform = entry.slice(0, colonIdx).trim().toLowerCase();
                    const handle   = sanitiseHandle(entry.slice(colonIdx + 1));
                    if (!validPlatforms.includes(platform)) {
                        socialWarnings.push(`⚠️ \`${platform}\` not recognised. Valid: ${validPlatforms.join(', ')}.`);
                        continue;
                    }
                    if (!handle) {
                        socialWarnings.push(`⚠️ Empty username for \`${platform}\` — skipped.`);
                        continue;
                    }
                    socials[platform] = handle;
                }
            }

            // ── Save ──────────────────────────────────────────────────────────
            const freshData = loadData();
            freshData[interaction.user.id] = {
                rawTime:       rawTime || null,
                offsetMinutes: offsetMinutes,   // exact integer minutes (new field)
                birthday:      rawBirthday || null,
                note:          note || null,
                socials:       Object.keys(socials).length > 0 ? socials : null,
            };
            saveData(freshData);

            // ── Reply ─────────────────────────────────────────────────────────
            const warnings = [];
            if (rawBirthday && birthday === null)
                warnings.push('⚠️ Could not parse your birthday — try `14 July` or `July 14`.');
            warnings.push(...socialWarnings);

            const msg = warnings.length > 0
                ? `✅ Profile saved with some issues:\n${warnings.join('\n')}`
                : '✅ Your profile card has been updated!';

            return submitted.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }

        // ── /card view ────────────────────────────────────────────────────────
        if (sub === 'view') {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user');
            const isSelf     = !targetUser || targetUser.id === interaction.user.id;

            const targetMember = isSelf
                ? interaction.member
                : await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!targetMember) {
                return interaction.editReply({ content: '❌ Could not find that member in this server.' });
            }

            const data          = loadData();
            const targetProfile = data[targetMember.user.id] || null;
            const viewerProfile = isSelf ? targetProfile : (data[interaction.user.id] || null);

            const container = await buildCard(targetMember, viewerProfile, targetProfile, isSelf);

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};