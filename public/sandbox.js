// Sandbox: a replica of the KUDO screens a scenario needs, rebuilt from an expert's screen recording.
// The trainee does the task here instead of in a test account. Everything they do is recorded (clicks, fields,
// screens, time, detours, hints) and the run is scored: outcome first, then path, then time.
// Eleven exercises (see SCENARIOS); scenarios with a brief start with a client call. Test data only.
import { h, api, toast, svg, metaRow, mark } from './ui.js';
// Line icons (stroke) in the style of the KUDO screens.
const I = {
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lang: '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 7M11 6c-.6 3.4-3 6.4-6 8M13 20l4-9 4 9M14.5 17h5"/>', play: '<path d="M8 5l11 7-11 7z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>', restart: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2 .6 3.5 2.4 3.5 6"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  doc: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', plus: '<path d="M12 5v14M5 12h14"/>', speaker: '<path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6"/>', cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10a2 2 0 100 4M17 10a2 2 0 100 4"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.3-1.5 2.5M12 17v.01"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', warn: '<path d="M12 4l9 16H3zM12 10v4M12 17v.01"/>',
};
const ic = (n, size = 16) => svg(`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`);


const SPEAKER = ['Arabic', 'Basque', 'Bulgarian', 'Cantonese', 'Catalan', 'Chinese', 'Dutch', 'English', 'Estonian', 'Filipino', 'Finnish', 'French', 'Galician', 'Georgian', 'German', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish'];
const TRANSLATION = ['Afrikaans', 'Arabic', 'Bulgarian', 'Dutch', 'English (UK)', 'English (US)', 'Estonian', 'Filipino', 'Finnish', 'French (Canada)', 'French (France)', 'Galician', 'Georgian', 'German', 'Italian', 'Japanese', 'Korean', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Russian', 'Spanish (Mexico)', 'Spanish (Spain)'];
const SIGN = ['American Sign Language', 'British Sign Language', 'French Sign Language', 'International Sign', 'German Sign Language'];
const HOST = 'host@client-demo.com';
const NAME = 'Quarterly Partner Update';
const fr = (l) => /^French/.test(l), de = (l) => l === 'German', es = (l) => /^Spanish/.test(l);

export const SCENARIOS = {
  'platform-1': {
    module: 'platform', title: 'Run a meeting, add a language live, find the recording',
    request: `A client runs "${NAME}" with AI Translation. Create the meeting with English as the speaker language and French and German as translation languages. Add the Host (${HOST}) and make sure the meeting is recorded. Start it. While it is live, the client asks for Spanish: add it. Then end the meeting and show where the client will find the recordings.`,
    expert: ['Log in with the Client account', 'New meeting, AI speech translation', 'Name, date and time', 'Speaker language English; translation languages French and German', 'Tick "Automatically record this meeting when it starts"', 'Save', 'Users, Participants', 'Add participant: the Host\'s email, Next', 'Make host', 'Start meeting', 'Edit meeting: add Spanish, Update', 'Restart translation service', 'End meeting', 'Content, Recordings & transcripts', 'Download: one file per language'],
    expertSeconds: 180, num: 1, replaces: true,
    // Screens the task needs. Anything else is fully built but logged as a detour.
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'participants', 'users', 'edit', 'recordings'],
  },
  'hi-1': {
    module: 'hi', num: 5, title: 'Set up a Human Interpretation meeting and book the interpreters',
    request: 'A client holds "Board Meeting" on Monday 30 November 2026, in English and French, with interpreters. Create the Human interpretation meeting for that day, then book the interpreters: the subject matter is Banking / Finance and the interpreters should know the topic "Annual results". The client accepts the cost. Finally, open the place where the client will add the agenda and slides for the interpreters.',
    expert: ['Log in with the Client account', 'New meeting, Human interpretation', 'Name "Board Meeting"', 'Start date: Monday 30 November 2026', 'Spoken languages English and French', 'Save', 'Book Interpreters on the Overview', 'Subject matter: Banking / Finance', 'Specific topic: Annual results', 'Tick "I agree to this additional non-refundable cost"', 'Complete Booking', 'Add preparation materials'],
    expertSeconds: 150,
    screens: ['login', 'home', 'meetings', 'new-hi', 'meeting', 'edit', 'interpreters'],
  },
  'rtmp-1': {
    module: 'rtmp', num: 11, title: 'Stream a meeting to YouTube in two languages (RTMP)', apps: ['studio'],
    request: 'Build what the client needs from your notes: the KUDO meeting "Product Day" and its live streams. Then start it and check in the client\'s channel studio that viewers get each language.',
    brief: {
      who: 'Social media manager at the client', event: '"Product Day", today',
      opening: 'Hi! Product Day goes live today on our YouTube channel, and we want it in other languages. Can you set it up?',
      questions: [
        { id: 'plat', key: true, q: 'Where will people watch, and on which platform?', a: 'On our YouTube channel, live.', note: 'Viewers watch live on the client\'s YouTube channel', why: 'A video platform like YouTube receives KUDO through RTMP.' },
        { id: 'lang', key: true, q: 'Which language do the speakers use, and which languages do viewers need?', a: 'Our speakers present in English. Viewers need French and German.', note: 'Speakers in English; viewers need French and German', why: 'Without it you cannot set the speaker and translation languages, or know how many streams to create.' },
        { id: 'per', key: true, q: 'One live stream per language, or one stream for everyone?', a: 'One live stream per language, so each audience has its own.', note: 'One YouTube live stream per language', why: 'YouTube carries one language per stream, three streams at most.' },
        { id: 'keys', key: true, q: 'Can we create the stream keys in your channel?', a: 'Yes, we gave you access to our channel studio: it is the "Video studio" tab.', note: 'Access to the channel studio: the "Video studio" tab', why: 'Each language needs its own stream key from their channel; a shared key interrupts the stream.' },
        { id: 'acct', key: true, q: 'Is there a Broadcast tab in your meeting settings?', a: 'Yes, our account has it.', note: 'The account has the Broadcast tab (RTMP enabled)', why: 'No Broadcast tab means RTMP is not enabled: that is a request to customer service, and it is today.' },
        { id: 'ai', key: true, q: 'Interpreters, or AI speech translation?', a: 'AI speech translation is fine.', note: 'AI speech translation', why: 'It decides the meeting type, and whether interpreters must be booked days ahead.' },
        { id: 'when', key: true, q: 'When does it start, and how long does it run?', a: 'Today at 15:00, for about an hour.', note: 'Today at 15:00, about an hour', why: 'Today leaves no time to fix a missing Broadcast tab, and the meeting must be running before the broadcast starts.' },
        { id: 'budget', q: 'What is your budget for this event?', a: 'That is agreed with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'thumb', q: 'Do you want a thumbnail for the YouTube video?', a: 'Our social team handles that.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'one', label: 'One RTMP stream carrying every language', why: 'YouTube takes one language per stream: each language needs its own stream and key.' },
        { id: 'rtmp', ok: true, label: 'RTMP: one stream per language to their YouTube channel, each with its own key', why: 'They watch on YouTube, one live stream per language: one RTMP stream and one stream key per language.' },
        { id: 'hls', label: 'HLS broadcast with the code on their website', why: 'They want it on their YouTube channel, not on a web page.' },
        { id: 'iframe', label: 'The KUDO language widget next to their YouTube video', why: 'The widget sits on the client\'s own web page. They want separate live streams per language on YouTube.' },
      ],
    },
    expert: ['Ask the client the seven questions that decide the set-up (platform, languages, one stream per language, access to the channel, Broadcast tab, AI or interpreters, timing)', 'Choose RTMP: one stream and one key per language', 'Log in with the Client account', 'New meeting, AI speech translation: "Product Day", English; French and German; Save', 'Video studio: create a stream key "French", copy the stream URL and the key', 'KUDO: Settings, Broadcast, RTMP Stream on, + Add RTMP stream: YouTube Live, paste URL and key, French; Save', 'Video studio: create "German", copy its key', 'KUDO: + Add RTMP stream for German; Save', 'Overview, Start meeting, confirm', 'Settings, Broadcast, Start broadcast', 'Video studio: each stream key shows Live'],
    expertSeconds: 390,
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'broadcast', 'rtmp'],
  },

  'hls-1': {
    module: 'hls', num: 12, title: 'Broadcast to the client\'s web page (HLS)', apps: ['site'],
    request: 'Build what the client needs from your notes: the KUDO meeting "Investor Day" and the client\'s event page. Then start it and check on the published page that viewers get the event in their language.',
    // The call: the brief starts incomplete. Seven questions decide the set-up; two do not. Only what was asked shows in the notes.
    brief: {
      who: 'Event manager at the client', event: '"Investor Day", today',
      opening: 'Hi, thanks for taking this. Our "Investor Day" is today and we want it on our own website, in several languages. Can you set it up for us?',
      questions: [
        { id: 'aud', key: true, q: 'Who will watch, how many, and do they need to register?', a: 'About 2,000 investors and analysts. No registration: anyone who opens our event page should be able to watch.', note: 'About 2,000 viewers on the client\'s event page, no registration', why: 'A large audience with no registration points to a broadcast, not a link per person.' },
        { id: 'lang', key: true, q: 'Which language do the speakers use, and which languages do viewers need?', a: 'Our speakers present in English. Viewers need French and German.', note: 'Speakers in English; viewers need French and German', why: 'Without it you cannot set the speaker and translation languages.' },
        { id: 'talk', key: true, q: 'Do viewers need to speak, appear on camera or vote?', a: 'No, they only watch and listen. Questions come in by email.', note: 'Viewers only watch and listen', why: 'Watch-only viewers can use a broadcast; people who speak need to join the meeting.' },
        { id: 'plat', key: true, q: 'Do you already stream the video somewhere, for example on YouTube?', a: 'No, we have no streaming platform and do not want one. Everything should be on our page.', note: 'No video platform: the stream has to play on the page itself', why: 'With no platform of their own, RTMP and the language widget next to their video are out.' },
        { id: 'len', key: true, q: 'How long does it last?', a: 'It starts at 14:00 and should be over by 16:30.', note: 'From 14:00 to about 16:30', why: 'The HLS stream duration must cover the whole event.' },
        { id: 'site', key: true, q: 'Who can change your event page, and can it take embed code?', a: 'Our site builder has an embed element. We gave you access: it is the "Client website" tab.', note: 'The page has an embed element; access in the "Client website" tab', why: 'The broadcast code goes on their page: you need to know who puts it there and how.' },
        { id: 'ai', key: true, q: 'Interpreters, or AI speech translation?', a: 'AI speech translation: it is in our plan and fine for this audience.', note: 'AI speech translation', why: 'It decides the meeting type, and whether interpreters must be booked days ahead.' },
        { id: 'budget', q: 'What is your budget for this event?', a: 'That is already agreed with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'brand', q: 'Should the player match your brand colours?', a: 'Not important today.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'iframe', label: 'The KUDO language widget next to their own video', why: 'The widget adds languages next to a video the client already streams. They have none.' },
        { id: 'viewer', label: 'Send every viewer the Viewer-only link', why: 'Viewers would leave the client\'s page for the KUDO room, and the client wants it on their page.' },
        { id: 'hls', ok: true, label: 'HLS broadcast: the KUDO broadcasting code on their page', why: 'Viewers watch on the page without registering, nobody speaks, and there is no video platform: HLS plays KUDO\'s own stream on the page.' },
        { id: 'rtmp', label: 'Stream to a video platform (RTMP), then embed that player', why: 'They have no platform and do not want one; it adds a channel, keys and a second player.' },
      ],
    },
    expert: ['Ask the client the seven questions that decide the set-up (audience and registration, languages, interaction, video platform, length, access to the page, AI or interpreters)', 'Choose HLS: viewers watch on the page, no registration, no platform', 'Log in with the Client account', 'New meeting, AI speech translation: "Investor Day", English; French and German; Save', 'Settings, Broadcast: HLS Stream on, Stream Duration 3 hours', 'Viewer-Only, Copy widget code, Broadcasting', 'Client website: Enter code in the embed element, paste, Apply, Publish', 'KUDO: Overview, Start meeting, confirm', 'Settings, Broadcast, Start broadcast, Start HLS broadcast', 'Client website: View site, the player is live with the language selector'],
    expertSeconds: 330,
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'broadcast'],
  },

  'platform-2': {
    module: 'platform', num: 2, title: 'Send the right link to each person', links: true,
    request: 'The client runs "Partner Summit" tomorrow (already scheduled in the account). Give each person the right access: (1) the two speakers, who speak on camera; (2) the 300 attendees, who only watch and listen in their browser; (3) the client\'s event producer, who runs the polls and the recording; (4) the client\'s web team, who will put KUDO on their own event page; (5) the 80 people in the room, who listen on their phones. Copy what each one needs in the KUDO portal, then use "Reply to the client" to give it to them.',
    expert: ['Log in with the Client account', 'Open "Partner Summit"', 'Copy the Participant/Speaker link', 'Copy the Viewer-Only link', 'Copy the Operator link', 'Copy the iframe widget', 'Copy the Mobile Link (or download the QR code)', 'Reply to the client: one item per person'],
    expertSeconds: 120,
    screens: ['login', 'home', 'meetings', 'meeting', 'preview'],
    reply: [{ id: 'speakers', label: 'The two speakers' }, { id: 'attendees', label: 'The 300 browser attendees' }, { id: 'producer', label: 'The event producer' }, { id: 'web', label: 'The web team' }, { id: 'room', label: 'The 80 people in the room' }],
    setup: ({ base }) => { const m = base({ name: 'Partner Summit', date: 'Fri, Nov 27, 2026', time: '10:00 - 12:00', dur: '2 hours', speakers: ['English'], translations: ['English (US)', 'French (France)', 'German'], status: 'scheduled' }); return { list: [m], mine: m }; },
  },
  'widget-1': {
    module: 'widget', num: 10, title: 'Put the KUDO widget on the client\'s event page', links: true, apps: ['site'],
    request: 'Build what the client needs from your notes: the KUDO language access on the client\'s event page. Then publish the page and check that viewers see it.',
    brief: {
      who: 'Event manager at the client', event: '"Global Summit", Day 2 tomorrow',
      opening: 'Hi! We stream our two-day Global Summit on our own event page, and we want languages right next to our video. Can you set that up for Day 2?',
      questions: [
        { id: 'vid', key: true, q: 'Where does your video play, and whose stream is it?', a: 'On our own event page, in our own player. The stream is ours.', note: 'Their own player on their own event page', why: 'They already have video on their page: KUDO adds languages next to it, it does not replace it.' },
        { id: 'day', key: true, q: 'Is each day a separate KUDO session?', a: 'Yes, Day 1 and Day 2 are both already in our account.', note: 'Day 1 and Day 2 are separate KUDO sessions, already in the account', why: 'Each session has its own code: Day 2 needs the Day 2 code.' },
        { id: 'av', key: true, q: 'Who can send the event audio into KUDO?', a: 'Our AV operator: they capture the stream with OBS Studio and can join KUDO.', note: 'Their AV operator captures the audio (OBS Studio) and joins KUDO as a Participant', why: 'The widget does not hear their player: someone has to send the event audio into KUDO.' },
        { id: 'site', key: true, q: 'Who can put code on the event page?', a: 'Our site builder has an embed element. We gave you access: it is the "Client website" tab.', note: 'The page has an embed element; access in the "Client website" tab', why: 'The code goes beside the player: you need to know who places it and how.' },
        { id: 'talk', key: true, q: 'Do viewers need to speak or appear on camera?', a: 'No, they watch and listen.', note: 'Viewers only watch and listen', why: 'Watch-only viewers need language access next to the video, not a seat in the meeting.' },
        { id: 'lang', key: true, q: 'Which languages do viewers need?', a: 'The ones already set for Day 2: English, Spanish and Japanese.', note: 'English, Spanish and Japanese, already set on Day 2', why: 'The widget offers the session\'s languages: they must be right before the day.' },
        { id: 'test', key: true, q: 'Can your AV operator and web team join one test together before Day 2?', a: 'Yes, tomorrow at 8:00.', note: 'Joint test with the AV operator and the web team, tomorrow 8:00', why: 'One full test with the AV operator, the web team and KUDO at the same time catches what separate tests miss.' },
        { id: 'budget', q: 'What is your budget for this event?', a: 'That is agreed with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'brand', q: 'Should the widget match your brand colours?', a: 'Nice to have, not important.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'hls', label: 'HLS broadcast: the KUDO broadcasting code on their page', why: 'They already stream their own video in their own player. The widget adds languages next to it.' },
        { id: 'viewer', label: 'Send every viewer the Viewer-only link', why: 'Viewers would leave the event page for the KUDO room.' },
        { id: 'rtmp', label: 'Stream each language to a video platform (RTMP)', why: 'They stream on their own page, not to a platform: RTMP would add channels and keys they do not need.' },
        { id: 'iframe', ok: true, label: 'The KUDO widget (iframe) beside their player, with the Day 2 code', why: 'Their video, their page, watch-only viewers: the widget gives language access next to the player, fed by their AV operator.' },
      ],
    },
    expert: ['Ask the client the seven questions that decide the set-up (where the video plays, sessions per day, who sends the audio, who edits the page, interaction, languages, a joint test)', 'Choose the KUDO widget with the Day 2 code', 'Log in with the Client account', 'My meetings: open "Global Summit - Day 2"', 'KUDO language access: copy the iframe widget', 'Client website: Enter code in the embed element, paste, Apply', 'Publish, View site: the widget shows "Welcome! Global Summit - Day 2"'],
    expertSeconds: 210,
    screens: ['login', 'home', 'meetings', 'meeting', 'preview'],
    setup: ({ base }) => { const d1 = base({ name: 'Global Summit - Day 1', date: 'Thu, Nov 26, 2026', time: '09:00 - 17:00', dur: '8 hours', speakers: ['English'], translations: ['English (US)', 'Spanish (Spain)', 'Japanese'], status: 'scheduled' });
      const d2 = base({ name: 'Global Summit - Day 2', date: 'Fri, Nov 27, 2026', time: '09:00 - 17:00', dur: '8 hours', speakers: ['English'], translations: ['English (US)', 'Spanish (Spain)', 'Japanese'], status: 'scheduled' }); return { list: [d1, d2], mine: d2 }; },
  },
  'ringcentral-1': {
    module: 'ringcentral', num: 15, title: 'Give the RingCentral producer the Widget ID', links: true,
    request: 'The client runs "Sales Town Hall" on RingCentral Events with KUDO AI translation; the KUDO session is already in the account. Their event producer asks for the KUDO Widget ID to add the KUDO app to the event. Find it and give it to them with "Reply to the client".',
    expert: ['Log in with the Client account', 'Open "Sales Town Hall"', 'Copy the Mobile Link', 'Take the 12-digit meeting ID at the end of the Mobile Link', 'Reply to the client: the ID only'],
    expertSeconds: 75,
    screens: ['login', 'home', 'meetings', 'meeting', 'preview'],
    reply: [{ id: 'wid', label: 'Widget ID for the producer', type: 'text', placeholder: 'The ID only, not the whole link' }],
    setup: ({ base }) => { const m = base({ name: 'Sales Town Hall', date: 'Mon, Nov 30, 2026', time: '16:00 - 17:30', dur: '1 hour 30 minutes', speakers: ['English'], translations: ['English (US)', 'Portuguese (Brazil)', 'Spanish (Mexico)'], status: 'scheduled' }); return { list: [m], mine: m }; },
  },
  'teams-1': {
    module: 'teams', num: 4, title: 'Add KUDO to the client\'s Teams meeting and follow it as an attendee', apps: ['teams'], startTab: 'teams',
    request: 'Build what the client needs from your notes in their meetings app: KUDO in their Teams meeting, set before the start. Then join, let the KUDO bot in and check the translation the way their Madrid lead wants it.',
    brief: {
      who: 'Internal events lead at the client', event: '"Quarterly All-hands", a scheduled Teams meeting today',
      opening: 'Hi! Our Quarterly All-hands is a scheduled Teams meeting today. Our leaders present in English, and our teams in Madrid and Dubai would like it in their language. Can KUDO do that inside Teams?',
      questions: [
        { id: 'type', key: true, q: 'Is it a scheduled Teams meeting, a town hall or a webinar?', a: 'A normal scheduled meeting in our calendar. I gave you access: it is the "Team meetings app" tab.', note: 'A scheduled Teams meeting; access in the "Team meetings app" tab', why: 'The KUDO app works in scheduled meetings. Town halls and webinars need a manual setup with the Mobile Link.' },
        { id: 'it', key: true, q: 'Has your IT approved the KUDO app in Teams?', a: 'Yes, our Teams admin approved it last week.', note: 'KUDO app approved by their Teams admin', why: 'Without IT approval nobody can add KUDO, and approval can take 24 hours or more.' },
        { id: 'time', key: true, q: 'Is the time final?', a: 'Not quite: we are moving it to 14:00 today, same length. Could you move it in the calendar?', note: 'Move the meeting to 14:00 today, same length', why: 'KUDO takes its time from Teams. If Teams moves after KUDO is added, Sync meeting.' },
        { id: 'lang', key: true, q: 'Which language do the presenters speak, and which do the teams need?', a: 'Presenters speak English. Madrid needs Spanish, Dubai needs Arabic.', note: 'Speaker: English. Translation: Spanish and Arabic', why: 'Speaker language English, translation languages Spanish and Arabic.' },
        { id: 'follow', key: true, q: 'How will people follow: voice, captions, or both?', a: 'Our Madrid lead wants to hear Spanish but read English captions. Please check that works before the start.', note: 'Madrid lead: Spanish voice, English captions; check it', why: 'Voice and captions are chosen separately in the KUDO panel: you can show exactly that.' },
        { id: 'region', key: true, q: 'Where must meeting data be processed?', a: 'In the EU: we are a European company.', note: 'Meeting data processed in the European Union', why: 'You choose the data region when you log in to KUDO in Teams: European Union (live.kudoway.eu).' },
        { id: 'end', key: true, q: 'Do you need a recording, and should KUDO stop with Teams?', a: 'Yes to both: a recording, and nothing running after we leave.', note: 'Recording on; KUDO ends with Teams', why: 'Recording and Transcript on, and Force Close KUDO Meeting so KUDO ends with Teams.' },
        { id: 'budget', q: 'What is your budget for this event?', a: 'That is with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'logo', q: 'Would you like your logo on the KUDO page?', a: 'Not needed.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'app', ok: true, label: 'The KUDO app in their Teams meeting: AI Translation, with the bot admitted from the lobby', why: 'A scheduled Teams meeting with the app approved: KUDO runs inside Teams, attendees follow in the KUDO panel or on the Mobile Link.' },
        { id: 'manual', label: 'The manual town hall setup: send everyone the Mobile Link', why: 'It is a scheduled meeting, not a town hall: the app gives voice and captions inside Teams.' },
        { id: 'move', label: 'Move the All-hands into a KUDO meeting and send the Participant link', why: 'They want to stay in Teams, and a Participant link gives everyone a microphone and camera.' },
        { id: 'rtmp', label: 'Stream the meeting to a video platform (RTMP)', why: 'Everyone is in Teams: a one-way stream does not fit.' },
      ],
    },
    expert: ['Ask the client the seven questions that decide the set-up (meeting type, IT approval, time, languages, voice and captions, data region, recording and end)', 'Choose the KUDO app in their Teams meeting', 'Team meetings app: open "Quarterly All-hands", move it to 14:00, Save and close', 'Open it again: Apps, search KUDO, Add', 'Log in, Meeting data processed in: European Union, Save', 'KUDO tab: AI Translation, NEXT, AI Speech and Captions', 'Speaker English; translation Spanish and Arabic', 'Force Close KUDO Meeting on; keep Recording and Transcript and Mobile Link on; SAVE', 'Join the meeting and Admit the KUDO AI Translator bot from the waiting room', 'Chat: the bot posted the Mobile Link', 'KUDO in the toolbar: OK, Voice Spanish, Captions English, and keep the panel open'],
    expertSeconds: 300,
    screens: ['login', 'home', 'meetings', 'meeting', 'preview'],
  },
  'meet-1': {
    module: 'external', num: 7, title: 'Bring KUDO AI translation into the client\'s Google Meet call', apps: ['vmeet'],
    request: 'Build what the client needs from your notes: create the call in their calendar app and link it in KUDO. Run it: join the call (KUDO starts with it), let the bot in, check what attendees get. Afterwards, get the translated recordings from KUDO.',
    vm: 'meet', want: { name: 'benefits briefing', label: 'Benefits Briefing', time: '11:00', langs: [[de, 'German'], [(l) => l === 'Italian', 'Italian']] },
    brief: {
      who: 'HR lead at the client', event: '"Benefits Briefing", today 11:00 to 12:00',
      opening: 'Hi! HR runs a Benefits Briefing on Google Meet today at 11:00 for an hour. Our teams in Germany and Italy would follow it better in their language. Can KUDO help?',
      questions: [
        { id: 'plat', key: true, q: 'Which platform is it on, and who creates the call?', a: 'Google Meet, from my calendar. I gave you access: it is the "Calendar and video app" tab.', note: 'Google Meet, created from the client\'s calendar; access in the "Calendar and video app" tab', why: 'KUDO joins Google Meet as a bot: you need the call\'s link from the calendar event.' },
        { id: 'stay', key: true, q: 'Do attendees stay in the call, and do they speak?', a: 'Yes, everyone stays in Meet. Questions at the end, in English.', note: 'Attendees stay in Meet; questions in English', why: 'They stay in Meet: the bot listens there, attendees follow on the Mobile Link.' },
        { id: 'lang', key: true, q: 'Which language do the speakers use, and which do attendees need?', a: 'English on stage. German and Italian for the teams.', note: 'Speakers: English. Translation: German and Italian', why: 'Speaker language English, translation languages German and Italian.' },
        { id: 'sec', key: true, q: 'How do you control who can join your calls?', a: 'Restricted to invited people, and we turned off asking to join to stop note-taker bots.', note: 'Default: Restricted, asking to join turned off', why: 'With asking to join off, every bot that asks is denied automatically, KUDO\'s too: allow asking to join (or Open) and admit the bot.' },
        { id: 'rec', key: true, q: 'Do you need a recording?', a: 'Yes, with the translations.', note: 'Recording with the translations', why: 'KUDO records the translations: automatic recording on before the start, downloaded from KUDO afterwards.' },
        { id: 'end', key: true, q: 'Should the translation stop when you end the call?', a: 'Yes, nothing should run after.', note: 'KUDO must end with Meet', why: '"Force close meeting" ends KUDO with Meet; otherwise the 1-hour grace period.' },
        { id: 'budget', q: 'What is the budget?', a: 'That is with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'brand', q: 'Do you want your logo on the KUDO page?', a: 'Not today.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'meet', ok: true, label: 'An AI speech translation meeting linked to their Google Meet (External meeting, platform Google Meet, their link)', why: 'They stay in Meet: the bot joins, listens and gives attendees the Mobile Link, with the recording in KUDO.' },
        { id: 'move', label: 'Move the briefing into KUDO and send the Participant link', why: 'They want to stay in Meet, and a Participant link gives everyone a microphone and camera.' },
        { id: 'rtmp', label: 'Stream the call to a video platform (RTMP)', why: 'Attendees are in the call and ask questions: a one-way stream does not fit.' },
        { id: 'widget', label: 'The KUDO widget (iframe) on their intranet', why: 'Attendees are in Meet, not on a web page.' },
      ],
    },
    expert: ['Ask the client the six questions that decide the set-up', 'Choose an AI speech translation meeting linked to their Google Meet', 'Calendar and video app: Create "Benefits Briefing", today 11:00, 1 hour, Add video conferencing', 'Host controls: keep Restricted but tick "Anyone with the meeting link can ask to join" (or choose Open), Save', 'Copy the link', 'KUDO: New meeting, AI speech translation meeting, the same name, Force close meeting, English to German and Italian', 'External meeting on: platform Google Meet, paste the link; automatic recording; Save', 'Join the call (KUDO starts by itself) and Admit the bot when it asks to join', 'Open the chat: the bot posted the Mobile Link', 'End the call: KUDO closes with it', 'KUDO: Content, Recordings & transcripts, Download'],
    expertSeconds: 300,
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'preview', 'recordings'],
  },
  'webex-1': {
    module: 'external', num: 8, title: 'Bring KUDO AI translation into the client\'s Webex meeting', apps: ['vmeet'],
    request: 'Build what the client needs from your notes: schedule the meeting in their conferencing app and link it in KUDO. Run it: start the meeting (KUDO starts with it), let the bot in, check what attendees get. Afterwards, get the translated recordings from KUDO.',
    vm: 'webex', want: { name: 'sales kickoff', label: 'Sales Kickoff', time: '15:00', langs: [[(l) => l === 'Japanese', 'Japanese'], [(l) => /^Portuguese/.test(l), 'Portuguese']] },
    brief: {
      who: 'Sales operations manager at the client', event: '"Sales Kickoff", today 15:00 to 16:00',
      opening: 'Hi! Our Sales Kickoff is a Webex meeting today at 15:00, for an hour. Our teams in Japan and Brazil asked for their language. Can KUDO do it?',
      questions: [
        { id: 'plat', key: true, q: 'Which platform is it on, and who schedules the meeting?', a: 'Webex, on our company site. I schedule it, and you have access: the "Web conferencing app" tab.', note: 'Webex, scheduled by the client; access in the "Web conferencing app" tab', why: 'KUDO joins Webex as a bot: you need the meeting\'s join link.' },
        { id: 'stay', key: true, q: 'Do attendees stay in Webex, and do they speak?', a: 'They stay in Webex. A short Q&A at the end, in English.', note: 'Attendees stay in Webex; Q&A in English', why: 'They stay in Webex: the bot listens there, attendees follow on the Mobile Link.' },
        { id: 'lang', key: true, q: 'Which language do the speakers use, and which do attendees need?', a: 'English. Japanese and Portuguese for the teams.', note: 'Speakers: English. Translation: Japanese and Portuguese', why: 'Speaker language English, translation languages Japanese and Portuguese.' },
        { id: 'sec', key: true, q: 'What are your Webex security settings?', a: 'Guests can\'t join, and meetings lock automatically after 10 minutes.', note: 'Default: guests can\'t join; automatic lock after 10 minutes', why: 'The bot joins as a guest: guests must be let in (directly or through the lobby), and an automatic lock keeps the bot out if it has to rejoin.' },
        { id: 'admin', key: true, q: 'Has your Webex admin blocked any external email domains?', a: 'Not that I know. Our admin can check if needed.', note: 'Blocked email domains: the admin checks if the bot never appears', why: 'A blocked domain in the admin settings stops the bot before the lobby: the admin checks it if the bot never appears.' },
        { id: 'rec', key: true, q: 'Do you need a recording, and should KUDO stop with Webex?', a: 'Yes, a recording, and nothing running after we end.', note: 'Recording on; KUDO ends with Webex', why: 'Automatic recording, and Force close meeting so KUDO ends with Webex; recordings come from KUDO afterwards.' },
        { id: 'budget', q: 'What is the budget?', a: 'That is with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
      ],
      options: [
        { id: 'webex', ok: true, label: 'An AI speech translation meeting linked to their Webex (External meeting, platform Webex, their join link)', why: 'They stay in Webex: the bot joins, listens and gives attendees the Mobile Link, with the recording in KUDO.' },
        { id: 'move', label: 'Move the kickoff into KUDO and send the Participant link', why: 'They want to stay in Webex, and a Participant link gives everyone a microphone and camera.' },
        { id: 'rtmp', label: 'Stream the meeting to a video platform (RTMP)', why: 'Attendees are in the meeting and ask questions: a one-way stream does not fit.' },
        { id: 'hls', label: 'HLS broadcast on their intranet', why: 'Attendees are in Webex, not on a web page.' },
      ],
    },
    expert: ['Ask the client the seven questions that decide the set-up', 'Choose an AI speech translation meeting linked to their Webex', 'Web conferencing app: Schedule "Sales Kickoff", today 15:00, 1 hour', 'Advanced options, Security: let guests in (directly or through the lobby), turn off the automatic lock, Save', 'Copy the join link', 'KUDO: New meeting, AI speech translation meeting, the same name, Force close meeting, English to Japanese and Portuguese', 'External meeting on: platform Webex, paste the link; automatic recording; Save', 'Start the meeting (KUDO starts by itself) and admit the bot if it waits in the lobby', 'Open the chat: the bot posted the Mobile Link', 'End the meeting: KUDO closes with it', 'KUDO: Content, Recordings & transcripts, Download'],
    expertSeconds: 300,
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'preview', 'recordings'],
  },
  'zoom-1': {
    module: 'zoom', num: 6, title: 'Bring KUDO AI translation into the client\'s Zoom meeting', apps: ['vmeet'],
    request: 'Build what the client needs from your notes: schedule the meeting in their video-meeting app and link it in KUDO. Run it: start the meeting (KUDO starts with it), let the bot in, check what attendees get. Afterwards, get the translated recordings from KUDO.',
    vm: 'zoom', want: { name: 'leadership q&a', label: 'Leadership Q&A', time: '14:00', langs: [[fr, 'French'], [es, 'Spanish']] },
    brief: {
      who: 'Internal communications manager at the client', event: '"Leadership Q&A", today 14:00 to 15:00',
      opening: 'Hi! Our leadership team hosts a Q&A for all staff today at 14:00, for an hour, on our usual video-meeting app. Many colleagues would follow better in French or Spanish. Can KUDO help?',
      questions: [
        { id: 'plat', key: true, q: 'Which platform is it on, and who schedules the meeting?', a: 'Zoom, on our company account. I schedule it, and I gave you access: it is the "Video meeting app" tab.', note: 'Zoom, scheduled by the client; access in the "Video meeting app" tab', why: 'KUDO joins Zoom as a bot: you need a Zoom meeting scheduled for it, and its join link.' },
        { id: 'stay', key: true, q: 'Do attendees stay in Zoom, and do they speak?', a: 'Everyone stays in Zoom. Staff ask questions at the end, in English.', note: 'Attendees stay in Zoom; questions at the end, in English', why: 'They stay in Zoom: the bot listens there, and attendees follow the translation on the Mobile Link next to Zoom.' },
        { id: 'lang', key: true, q: 'Which language do the speakers use, and which do attendees need?', a: 'Everyone speaks English. Attendees need French and Spanish.', note: 'Speakers: English. Translation: French and Spanish', why: 'Speaker language English, translation languages French and Spanish, nothing extra.' },
        { id: 'sec', key: true, q: 'How are your Zoom meetings secured by default?', a: 'End-to-end encryption, a passcode and the waiting room, for every meeting.', note: 'Default: end-to-end encryption, passcode, waiting room', why: 'The bot cannot join an end-to-end encrypted meeting, and a waiting room holds it at the door: Enhanced encryption, passcode on, waiting room off.' },
        { id: 'rec', key: true, q: 'Do you need a recording?', a: 'Yes, with the translations, for colleagues who miss it.', note: 'Recording with the translations', why: 'KUDO records the translations: turn on automatic recording before the start.' },
        { id: 'end', key: true, q: 'Should the translation stop when you close Zoom?', a: 'Yes. Nothing should keep running once we end the meeting.', note: 'KUDO must end with Zoom', why: '"Force close meeting" ends KUDO with Zoom; otherwise it stays open for the 1-hour grace period.' },
        { id: 'budget', q: 'What is the budget for this event?', a: 'That is with our account manager.', why: 'Pricing is the account manager\'s: it does not change the set-up.' },
        { id: 'brand', q: 'Would you like your logo on the KUDO page?', a: 'Not needed today.', why: 'It does not change what you build.' },
      ],
      options: [
        { id: 'zoom', ok: true, label: 'An AI speech translation meeting linked to their Zoom (External meeting, platform Zoom, their join link)', why: 'They stay in Zoom: the KUDO bot joins, listens and gives attendees the Mobile Link, with the recording in KUDO.' },
        { id: 'move', label: 'Move the Q&A into KUDO and send everyone the Participant link', why: 'They want to stay in their Zoom, and a Participant link gives everyone a microphone and camera.' },
        { id: 'rtmp', label: 'Stream the Zoom meeting to a video platform (RTMP)', why: 'Attendees are in Zoom and ask questions: a one-way stream does not fit.' },
        { id: 'widget', label: 'The KUDO widget (iframe) on their intranet', why: 'Attendees are in Zoom, not on a web page: the bot brings the Mobile Link into Zoom.' },
      ],
    },
    expert: ['Ask the client the six questions that decide the set-up (platform, attendees, languages, Zoom security, recording, the end)', 'Choose an AI speech translation meeting linked to their Zoom', 'Video meeting app: Schedule "Leadership Q&A", today 14:00, 1 hour', 'Keep the passcode, untick the waiting room, choose Enhanced encryption, Save', 'Copy the join link from the invitation', 'KUDO: log in, New meeting, AI speech translation meeting, the same name; tick Force close meeting', 'Speaker language English with Detect language automatically; translation languages French and Spanish', 'External meeting on: platform Zoom, paste the join link', 'Tick "Automatically record this meeting when it starts", Save', 'Video meeting app: Start the meeting (the KUDO meeting starts by itself) and Approve the bot\'s recording request', 'Open the chat: the bot posted the Mobile Link', 'End the meeting: KUDO closes with it (Force close)', 'KUDO: Content, Recordings & transcripts, Download'],
    expertSeconds: 300,
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'preview', 'recordings'],
  },
};

// ------------------------------------------------------------------ the run

export function sandboxView(key, { onExit } = {}) {
  const sc = SCENARIOS[key]; if (!sc) return h('div', { class: 'page' }, h('div', { class: 'card empty' }, 'Unknown sandbox'));
  // Everything a trainee can see in the replica. Screens the scenario does not need are fully built too, so the
  // replica never hints at the path; entering one is logged silently as a detour and shows only in the report.
  const S = { screen: 'login', menu: null, modal: null, meeting: null, form: null, picker: null, t0: Date.now(), events: [], hints: 0, flags: {}, finished: false,
    glossaries: [['Default Glossary', 120, 14, 0, 0, 106, 0], ['Acme Launch', 64, 20, 10, 2, 30, 2], ['Board Meetings', 41, 12, 0, 4, 25, 0], ['Product Names', 88, 30, 8, 0, 50, 0], ['Medical Terms', 37, 37, 0, 0, 0, 0]].map(([name, terms, rec, tr, block, dnt, rep], i) => ({ name, terms, rec, tr, block, dnt, rep, def: i === 0 })) };
  const RELEVANT = new Set(sc.screens || []);
  // Flags score the trainee's own meeting only; actions on the sample meetings go to a scratch object.
  const F = () => (S.meeting && S.meeting === S.mine ? S.flags : (S.scratch = S.scratch || {}));
  const log = (type, what, extra = {}) => S.events.push({ t: Math.round((Date.now() - S.t0) / 1000), screen: S.screen, type, what, ...extra });
  const detour = (what) => { log('detour', what); S.flags.detours = (S.flags.detours || 0) + 1; };
  const root = h('div', { class: 'sbx' });
  const app = h('div', { class: 'sbx-app' });
  const timer = h('span', { class: 'sbx-timer' }, '0:00');
  const tick = setInterval(() => { if (!document.body.contains(root)) return clearInterval(tick); const s = Math.round((Date.now() - S.t0) / 1000); timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000);
  const replyPanel = h('div', { class: 'sbx-reply', hidden: true });
  const taskBox = h('div', { class: 'sbx-task' }, h('b', null, 'Your task'), h('p', null, sc.request));
  // The client call (exercises with a brief): ask, choose the solution, then build from your notes.
  S.call = sc.brief ? { asked: [], done: false, choice: null, stage: 'talk' } : null;
  const callBox = h('div', { class: 'sbx-call' });
  const callScore = () => {
    if (!S.call) return null;
    const qs = sc.brief.questions, keys = qs.filter((q) => q.key), askedKey = keys.filter((q) => S.call.asked.includes(q.id)).length, noise = qs.filter((q) => !q.key && S.call.asked.includes(q.id)).length;
    const opt = sc.brief.options.find((o) => o.id === S.call.choice);
    return { discovery: Math.max(0, Math.min(100, Math.round((100 * askedKey) / keys.length) - 10 * noise)), solution: opt?.ok ? 100 : 0, confidence: Math.max(0, Math.min(100, 50 + Math.round((50 * askedKey) / keys.length) - 10 * noise)), askedKey, keys: keys.length, noise };
  };
  function drawCall() {
    const b = sc.brief, c = S.call, cs = callScore();
    const meter = h('div', { class: 'sbx-meter' }, h('small', null, 'Client confidence'), h('i', { class: 'ph-bar' }, h('i', { style: `width:${cs.confidence}%` })), h('b', null, `${cs.confidence}%`));
    const chat = h('div', { class: 'sbx-chat' }, h('div', { class: 'bub them' }, h('small', null, b.who), b.opening),
      ...c.asked.flatMap((id) => { const q = b.questions.find((x) => x.id === id); return [h('div', { class: 'bub me' }, q.q), h('div', { class: 'bub them' }, q.a)]; }));
    if (c.stage === 'talk') {
      const left = b.questions.filter((q) => !c.asked.includes(q.id));
      callBox.replaceChildren(h('div', { class: 'sbx-call-h' }, h('div', null, h('b', null, 'Client call'), h('p', { class: 'muted small' }, 'Ask what you need before you build anything. Each question you ask is noted; questions that do not change the set-up cost the client\'s confidence.')), meter), chat,
        h('div', { class: 'sbx-asks' }, left.map((q) => h('button', { class: 'sbx-ask', type: 'button', on: { click: () => { c.asked.push(q.id); log('ask', `Asked: ${q.q}`); drawCall(); chat.scrollTop = chat.scrollHeight; } } }, q.q))),
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' }, h('button', { class: 'btn primary', type: 'button', on: { click: () => { c.stage = 'choose'; log('click', `Ended the call (${c.asked.length} question${c.asked.length === 1 ? '' : 's'})`); drawCall(); } } }, 'I have what I need: choose the solution')));
      const ch = callBox.querySelector('.sbx-chat'); ch.scrollTop = ch.scrollHeight; return;
    }
    callBox.replaceChildren(h('div', { class: 'sbx-call-h' }, h('div', null, h('b', null, 'Which solution do you build?'), h('p', { class: 'muted small' }, 'You build what you choose. It cannot be changed once you start.')), meter),
      h('div', { class: 'sbx-notes' }, h('b', null, 'Your notes'), notesList()),
      h('div', { class: 'sbx-opts' }, b.options.map((o) => h('label', { class: `sbx-opt ${c.choice === o.id ? 'on' : ''}` }, h('input', { type: 'radio', name: 'sbx-opt', checked: c.choice === o.id, on: { change: () => { c.choice = o.id; drawCall(); } } }), o.label))),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:12px' }, h('button', { class: 'btn', type: 'button', on: { click: () => { c.stage = 'talk'; drawCall(); } } }, 'Back to the call'),
        h('button', { class: 'btn primary', type: 'button', disabled: !c.choice, on: { click: () => { const o = b.options.find((x) => x.id === c.choice); log('choose', `Solution: ${o.label}`); c.done = true; startBuild(); } } }, 'Confirm and start building')));
  }
  const notesList = () => { const n = sc.brief.questions.filter((q) => q.note && S.call.asked.includes(q.id)); return n.length ? h('ul', null, h('li', null, `Event: ${sc.brief.event}`), n.map((q) => h('li', null, q.note))) : h('p', { class: 'muted small' }, 'Nothing noted: you did not ask anything.'); };
  function startBuild() {
    const o = sc.brief.options.find((x) => x.id === S.call.choice);
    taskBox.replaceChildren(h('b', null, 'Your task'), h('p', null, sc.request), h('div', { class: 'sbx-notes' }, h('b', null, `You chose: ${o.label}`), notesList()));
    callBox.hidden = true; root.querySelector('.sbx-browser').hidden = false; taskBox.hidden = false; draw();
  }
  const bar = h('div', { class: 'sbx-bar' },
    h('div', { class: 'sbx-bar-l' }, h('span', { class: 'sbx-pill' }, 'Sandbox'), h('b', null, `Scenario ${sc.num}: ${sc.title}`), timer),
    h('div', { class: 'sbx-bar-r' },
      h('button', { class: 'btn sm', type: 'button', on: { click: () => { taskBox.hidden = !taskBox.hidden; } } }, 'Task'),
      h('button', { class: 'btn sm', type: 'button', on: { click: hint } }, 'Hint'),
      sc.reply ? h('button', { class: 'btn sm', type: 'button', on: { click: () => { replyPanel.hidden = !replyPanel.hidden; drawReply(); } } }, 'Reply to the client') : null,
      h('button', { class: 'btn sm primary', type: 'button', on: { click: () => finish() } }, 'I am done'),
      h('button', { class: 'btn sm', type: 'button', on: { click: () => { if (confirm('Leave the sandbox? This run is not saved.')) { clearInterval(tick); onExit?.(); } } } }, 'Leave')));
  root.append(bar, callBox, taskBox, replyPanel, h('div', { class: 'sbx-browser' }, h('div', { class: 'sbx-tabs-wrap' }), h('div', { class: 'sbx-url' }, ic('lock', 13), h('span', { class: 'sbx-url-t' }), h('span', { class: 'sbx-note' }, 'Replica for training, test data only')), app));

  // Navigation. Entering a screen the scenario does not need is a detour (silent).
  const go = (screen, what, extra = {}) => {
    S.screen = screen; S.menu = null; S.modal = null; S.picker = null; Object.assign(S, extra);
    log('nav', what || screen);
    if (!RELEVANT.has(screen)) detour(what || screen);
    draw(); app.scrollTop = 0; app.querySelector('.k-main')?.scrollTo?.(0, 0);
  };
  const URL = { login: 'users/sign_in', home: '', meetings: 'sessions', glossaries: 'glossaries', usage: 'usage', 'new-ai': 'sessions/new?ai_interpretation=true', 'new-hi': 'sessions/new', meeting: 'sessions/800212907037', users: 'sessions/800212907037/users', participants: 'sessions/800212907037/participants', operators: 'sessions/800212907037/operators', viewers: 'sessions/800212907037/viewers', edit: 'sessions/800212907037/edit', polls: 'sessions/800212907037/polls', 'poll-new': 'sessions/800212907037/polls/new', poll: 'sessions/800212907037/polls/2', files: 'sessions/800212907037/documents', messages: 'sessions/800212907037/messages', recordings: 'sessions/800212907037/recordings', av: 'sessions/800212907037/configurations', features: 'sessions/800212907037/security', mglossaries: 'sessions/800212907037/meeting_glossaries', stats: 'sessions/800212907037/report', broadcast: 'sessions/800212907037/broadcasts', rtmp: 'sessions/800212907037/broadcasts/new?str=rtmp', interpreters: 'sessions/800212907037/interpreters' };
  const url = () => `live.kudoway.eu/${URL[S.screen] ?? ''}`;

  // ---------------------------------------------------------------- shared pieces
  const toastK = (msg) => { const t = h('div', { class: 'k-toast' }, h('span', { class: 'k-dot' }), msg); app.append(t); setTimeout(() => t.remove(), 2600); };
  const toggle = (on, label, fn, disabled) => h('label', { class: `k-toggle ${on ? 'on' : ''} ${disabled ? 'off' : ''}` }, h('input', { type: 'checkbox', checked: on, disabled, on: { change: (e) => fn(e.target.checked) } }), h('span', { class: 'k-sw' }), label ? h('span', null, label) : null);
  const radio = (name, opts, val, fn, disabled) => h('div', { class: 'k-radios' }, opts.map(([v, l, note]) => h('label', { class: 'k-check' }, h('input', { type: 'radio', name, checked: val === v, disabled, on: { change: () => fn(v) } }), ' ', l, note ? h('small', { class: 'k-mini' }, ` ${note}`) : null)));
  const check = (on, label, fn, disabled) => h('label', { class: 'k-check' }, h('input', { type: 'checkbox', checked: on, disabled, on: { change: (e) => fn(e.target.checked) } }), ' ', label);
  const select = (opts, val, fn, cls = '') => h('select', { class: `k-in k-sel ${cls}`, on: { change: (e) => fn(e.target.value) } }, opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(val) }, l); }));
  const warn = (t) => h('div', { class: 'k-warn' }, ic('warn', 13), t);
  const row = (label, ...body) => h('div', { class: 'k-frow' }, h('div', { class: 'k-flabel' }, label), h('div', { class: 'k-fbody' }, ...body));
  const set = (obj, k, label) => (v) => { obj[k] = v; log('change', `${label}: ${v}`); draw(); };
  const pager = (n) => h('div', { class: 'k-pager' }, h('span', { class: 'k-mini' }, `Showing ${n ? 1 : 0} to ${n} of ${n} entries`), h('span', { class: 'k-mini' }, '‹  1  ›   10 per page ▾'));

  const sidebar = () => h('aside', { class: 'k-side' },
    h('div', { class: 'k-newwrap' }, h('button', { class: 'k-new', type: 'button', on: { click: () => { S.menu = S.menu === 'new' ? null : 'new'; log('click', 'New meeting'); draw(); } } }, ic('plus'), ' New meeting ▾'),
      S.menu === 'new' ? h('div', { class: 'k-menu' }, h('button', { type: 'button', on: { click: () => startForm('hi') } }, 'Human interpretation'), h('button', { type: 'button', on: { click: () => startForm('ai') } }, 'AI speech translation')) : null),
    ...[['home', 'Home'], ['meetings', 'My meetings'], ['glossaries', 'My glossaries', 'New'], ['usage', 'Usage & analytics']].map(([k, l, badge]) => h('button', { class: `k-nav ${S.screen === k || (k === 'meetings' && S.meeting && !['home', 'glossaries', 'usage', 'login', 'new-ai', 'new-hi'].includes(S.screen)) ? 'on' : ''}`, type: 'button', on: { click: () => go(k, l) } }, l, badge ? h('span', { class: 'k-badge' }, badge) : null)),
    h('div', { class: 'k-acct' }, h('span', { class: 'k-av' }, 'DN'), 'Demo NDK ▾'));
  const top = () => h('header', { class: 'k-top' }, h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-logo' }), h('span', { class: 'k-top-r' }, ic('help', 20), ic('bell', 20)));
  const shell = (...main) => h('div', { class: 'k-shell' }, top(), h('div', { class: 'k-body' }, sidebar(), h('main', { class: 'k-main' }, ...main)));

  // ---------------------------------------------------------------- account-level screens
  function loginScreen() {
    return h('div', { class: 'k-login' }, h('div', { class: 'k-login-card' },
      h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-login-logo' }),
      h('div', { class: 'k-seg' }, h('span', { class: 'on' }, 'Log In'), h('span', null, 'Join a Meeting')),
      h('h3', null, 'Log into your KUDO account'),
      h('input', { type: 'email', value: 'client-demo@kudoway.com', readonly: true }), h('input', { type: 'password', value: '••••••••••', readonly: true }),
      h('label', { class: 'k-check' }, h('input', { type: 'checkbox' }), ' Remember me'),
      h('button', { class: 'k-yellow', type: 'button', on: { click: () => { go('home', 'Log in'); toastK('Logged in successfully.'); } } }, 'Log In'),
      h('p', { class: 'k-mini' }, 'Sandbox account: the Client role, filled in for you')));
  }
  const baseMeeting = (o) => ({ kind: 'ai', type: 'speech', speakers: ['English'], translations: [], sign: [], recording: true, autoRecord: true, external: false, adv: advDefaults(), prep: '0 minutes', aiAssist: false,
    participants: [{ email: 'speaker@client-demo.com', name: 'Speaker Demo', role: 'Host' }], operators: [], viewers: [], polls: [], files: [], glossary: null,
    av: { res: 'Auto (adaptive)', fps: 'Auto (adaptive)', bitrate: 'Auto (adaptive)', stereo: false, level: 50, processing: true },
    features: { lobby: false, lobbyP: false, lobbyV: false, users: true, docs: true, msg: true, polls: true, request: false, share: true }, ...o });
  // Other meetings in the demo account, with generic names. Opening one is a detour; nothing done there counts.
  const samples = () => (S.samples = S.samples || [
    ['Weekly Partner Sync', 'Fri, Nov 27, 2026', '10:00 - 10:30', '30 minutes', ['English'], ['Italian'], 'ai', 'scheduled'],
    ['Customer Advisory Board', 'Fri, Nov 20, 2026', '14:08 - 15:08', '1 hour', ['Chinese', 'English', 'French'], ['English (US)', 'French (France)', 'German', 'Spanish (Spain)', 'Japanese'], 'ai', 'finished'],
    ['Q3 Board Review', 'Mon, Nov 16, 2026', '15:34 - 18:34', '3 hours', ['English', 'French', 'Spanish'], ['English (US)', 'French (France)', 'Spanish (Spain)'], 'ai', 'finished'],
    ['Partner Webinar', 'Fri, Oct 30, 2026', '10:15 - 12:15', '2 hours', ['English'], ['English (UK)'], 'captions', 'finished'],
    ['Medical Symposium', 'Thu, Oct 15, 2026', '07:00 - 11:55', '4 hours 55 minutes', ['Chinese', 'English', 'French', 'German'], [], 'hi', 'finished'],
    ['Multilingual Town Hall', 'Wed, Oct 14, 2026', '17:00 - 18:00', '1 hour', ['Arabic', 'Chinese', 'English'], ['Arabic', 'English (US)', 'French (France)', 'German', 'Italian', 'Korean', 'Russian', 'Spanish (Spain)'], 'ai', 'finished'],
    ['Interpreter Briefing', 'Mon, Oct 12, 2026', '15:59 - 16:59', '1 hour', ['Amharic', 'English'], [], 'hi', 'finished'],
    ['Sales Kick-off', 'Mon, Oct 05, 2026', '10:35 - 11:35', '1 hour', ['English', 'French'], [], 'hi', 'finished'],
    ['Product Day rehearsal', 'Mon, Oct 05, 2026', '10:31 - 11:31', '1 hour', ['English'], ['French (France)'], 'ai', 'finished'],
    ['Press Briefing', 'Thu, Sep 24, 2026', '12:53 - 13:53', '1 hour', ['English', 'French'], [], 'hi', 'finished'],
    ['Investor Call', 'Tue, Sep 22, 2026', '16:00 - 17:00', '1 hour', ['English'], ['German'], 'ai', 'canceled'],
  ].map(([name, date, time, dur, speakers, translations, k, status]) => baseMeeting({ name, date, time, dur, speakers, translations, kind: k === 'hi' ? 'hi' : 'ai', type: k === 'hi' ? 'hi' : k === 'captions' ? 'captions' : 'speech', status, sample: true })));
  const powered = (m) => (m.kind === 'hi' ? 'Human interpretation' : m.type === 'captions' ? 'AI captions only' : 'AI speech & captions');
  const langsOf = (m) => { const all = [...new Set([...m.speakers, ...m.translations.map((l) => l.replace(/ \(.*\)$/, ''))])]; return all.length > 3 ? `${all.slice(0, 3).join(', ')} +${all.length - 3}` : all.join(', '); };
  const mineRow = () => (S.own ? S.own : S.mine ? [S.mine] : []);
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dt = (iso) => new Date(`${iso}T12:00:00`);
  const fmtLong = (iso) => { const d = dt(iso); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`; };
  const fmtForm = (iso) => { const d = dt(iso); return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const TODAY = '2026-11-26';
  const dOf = (m) => (m.date ? m : { date: fmtLong(m.day || TODAY), time: '14:00 - 15:00', dur: '1 hour' });
  const notYetBox = () => h('div', { class: 'k-note' }, 'This page is not available in the sandbox yet');
  const openMeeting = (m) => { S.meeting = m; S.ovAdv = false; if (!m.sample) go('meeting', `Open ${m.name}`); else { go('meeting', `Open ${m.name}`); detour(`Opened another meeting: ${m.name}`); } };
  function homeScreen() {
    const card = (m) => { const d = dOf(m); return h('button', { class: 'k-mcard', type: 'button', on: { click: () => openMeeting(m) } },
      h('b', null, m.name, ' ›'), h('div', null, ic('cal', 14), d.date), h('div', null, ic('clock', 14), d.time, ' CET'), h('div', null, ic('lang', 14), langsOf(m)), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase())); };
    const list = [...mineRow(), ...samples()].filter((m) => m.status === 'scheduled' || m.status === 'live').slice(0, 3);
    const empty = (i) => h('div', { class: 'k-mcard empty' }, ic('help', 16), h('span', null, 'No more meetings scheduled'), i === 0 ? h('button', { class: 'k-btn soft', type: 'button', on: { click: (e) => { e.stopPropagation(); S.menu = 'new'; log('click', 'New meeting (home card)'); draw(); } } }, 'New meeting ▾') : null);
    const stat = (k, v) => h('div', null, h('small', null, k), h('b', null, v));
    return shell(h('h1', { class: 'k-h1' }, 'Welcome back, Demo'), h('h3', { class: 'k-h3' }, 'Upcoming meetings'), h('div', { class: 'k-cards' }, list.map(card), ...Array.from({ length: 3 - list.length }, (_, i) => empty(i))),
      h('button', { class: 'k-link', type: 'button', on: { click: () => go('meetings', 'View all my meetings', { mtab: 'upcoming' }) } }, 'View all my meetings'),
      h('div', { class: 'k-grid2' },
        h('div', { class: 'k-panel' }, h('h3', null, 'Usage & analytics'), h('div', { class: 'k-rowsp' }, h('b', null, 'Platform hours'), h('div', { class: 'k-big' }, '412.5', h('small', null, ' / 500 available'))), h('div', { class: 'k-bar' }, h('i', { style: 'width:82%' })),
          h('div', { class: 'k-stats' }, stat('Completed', '38'), stat('Upcoming', String(list.length)), stat('Booked', '52 h 30 m'), stat('Consumed', '41 h 10 m')),
          h('div', { class: 'k-rowsp' }, h('button', { class: 'k-link', type: 'button', on: { click: () => go('usage', 'View all my data') } }, 'View all my data'), h('small', { class: 'k-mini' }, '214 days left this billing cycle'))),
        h('div', { class: 'k-panel' }, h('h3', null, 'Your productivity gain'), h('div', { class: 'k-roi' }, h('small', null, 'Index ROI'), h('div', { class: 'k-big green' }, '41.2'), h('small', null, 'Of your KUDO plan')),
          h('button', { class: 'k-link', type: 'button', on: { click: () => go('usage', 'View my ROI analysis') } }, 'View my ROI analysis'))));
  }
  function meetingsScreen() {
    const tab = S.mtab || 'upcoming';
    const all = [...mineRow(), ...samples()];
    const list = all.filter((m) => (tab === 'upcoming' ? ['scheduled', 'live'].includes(m.status) : tab === 'previous' ? m.status === 'finished' : m.status === 'canceled'));
    const total = tab === 'previous' ? 602 : list.length;
    const tabBtn = (k, l) => h('button', { class: `k-tab ${tab === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.mtab = k; log('nav', `My meetings: ${l}`); if (k === 'canceled' || (k === 'previous' && S.mine?.status !== 'finished')) detour(`My meetings: ${l}`); draw(); } } }, l);
    const statsBtn = (m) => h('button', { class: 'k-ic', type: 'button', title: 'Meeting statistics', 'aria-label': 'Meeting statistics', on: { click: (e) => { e.stopPropagation(); S.meeting = m; go('stats', `Meeting statistics: ${m.name}`); if (m !== S.mine) detour(`Opened another meeting: ${m.name}`); } } }, ic('doc', 14));
    const row = (m) => { const d = dOf(m); return h('tr', { class: 'k-click', on: { click: () => openMeeting(m) } },
      h('td', null, h('span', { class: `k-dot ${m.status}` }), m.status === 'finished' ? h('span', { class: 'k-chip finished k-hoverchip' }, 'FINISHED') : null, h('span', { class: 'k-link' }, m.name)), h('td', null, d.date), h('td', null, d.time, h('small', { class: 'k-mini' }, ' CET')), h('td', null, d.dur), h('td', null, langsOf(m)), h('td', null, powered(m)),
      h('td', null, m.status === 'finished' && m.type !== 'captions' ? statsBtn(m) : null)); };
    return shell(h('div', { class: 'k-rowsp' }, h('div', null, h('h1', { class: 'k-h1' }, 'My meetings'), h('nav', { class: 'k-tabs' }, tabBtn('upcoming', 'Upcoming'), tabBtn('previous', 'Previous'), tabBtn('canceled', 'Canceled'))), h('input', { class: 'k-in k-search', placeholder: 'Search' })),
      h('section', { class: 'k-card' }, h('div', { class: 'k-row end' }, h('button', { class: 'k-ic', type: 'button', title: 'Columns', on: { click: () => { log('click', 'Columns'); toastK('Choose the columns to show'); } } }, ic('doc', 14))),
        h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Meeting name', 'Date', 'Time', 'Duration', 'Languages', 'Powered by', ''].map((x) => h('th', null, x)))),
          h('tbody', null, list.length ? list.map(row) : h('tr', null, h('td', { colspan: 7, class: 'k-empty' }, 'No meetings to show')))),
        h('div', { class: 'k-pager' }, h('span', { class: 'k-mini' }, `Showing ${list.length ? 1 : 0} to ${list.length} of ${total} meetings`), h('span', { class: 'k-mini' }, tab === 'previous' ? '‹  1  2  3  4  5  …  61  ›   10 per page ▾' : '‹  1  ›   10 per page ▾'))));
  }
  function glossaryTable(inMeeting) {
    const m = S.meeting;
    const used = inMeeting ? (m.glossary || S.glossaries.find((g) => g.def).name) : null;
    const menu = (g) => S.menu === `g:${g.name}` ? h('div', { class: 'k-menu right' }, ...(inMeeting ? [h('button', { type: 'button', on: { click: () => { S.modal = { kind: 'gconfirm', g, def: false }; S.menu = null; draw(); } } }, 'Use for this meeting')] : []),
      h('button', { type: 'button', on: { click: () => { S.modal = { kind: 'gconfirm', g, def: true }; S.menu = null; draw(); } } }, 'Set as default for all meetings'), h('button', { type: 'button', on: { click: () => { log('click', `View terms: ${g.name}`); toastK(`${g.name}: ${g.terms} terms`); S.menu = null; draw(); } } }, 'View terms')) : null;
    const chip = (n, label) => h('span', { class: 'k-gchip' }, `${label} ${n}`);
    return [h('div', { class: 'k-gfilter' }, chip(5, 'All actions'), chip(5, 'Recognize'), chip(1, 'Translate as'), chip(2, 'Block'), chip(4, 'Do-not-translate'), chip(1, 'Replace'), h('input', { class: 'k-in k-search', placeholder: 'Search glossaries...' })),
      inMeeting ? h('div', { class: 'k-mini', style: 'margin:6px 0 10px' }, 'Terms in this meeting   0 / 500   0 / 2,000   0 / 500   0 / 1,000   0 / 500') : null,
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Glossary name', 'Terms', 'Actions', ''].map((x) => h('th', null, x)))),
        h('tbody', null, S.glossaries.map((g) => h('tr', null, h('td', null, h('b', null, g.name), inMeeting && used === g.name ? h('span', { class: 'k-tag green' }, 'Use for this meeting') : null, g.def ? h('span', { class: 'k-tag' }, 'Default glossary') : null),
          h('td', null, String(g.terms)), h('td', null, h('span', { class: 'k-gchip sm' }, `◉ ${g.rec}`), h('span', { class: 'k-gchip sm' }, `⊘ ${g.dnt}`)),
          h('td', { class: 'k-rel' }, h('button', { class: 'k-dots', type: 'button', on: { click: () => { S.menu = S.menu === `g:${g.name}` ? null : `g:${g.name}`; log('click', `Glossary menu: ${g.name}`); draw(); } } }, '⋮'), menu(g)))))),
      pager(S.glossaries.length)];
  }
  function glossariesScreen() { return shell(h('div', { class: 'k-rowsp' }, h('h1', { class: 'k-h1' }, 'My glossaries'), h('button', { class: 'k-btn', type: 'button', on: { click: () => { log('click', 'Create glossary'); toastK('Glossary creation is not part of this sandbox yet'); } } }, '+ Create glossary')), h('section', { class: 'k-card' }, ...glossaryTable(false))); }
  function usageScreen() {
    return shell(h('h1', { class: 'k-h1' }, 'Usage & analytics'), h('div', { class: 'k-grid2' }, h('div', { class: 'k-panel' }, h('h3', null, 'Platform hours'), h('div', { class: 'k-big' }, '412.5', h('small', null, ' / 500 available')), h('div', { class: 'k-bar' }, h('i', { style: 'width:82%' }))),
      h('div', { class: 'k-panel' }, h('h3', null, 'This billing cycle'), h('div', { class: 'k-stats' }, ...[['Completed', '38'], ['Upcoming', '4'], ['Booked', '52 h 30 m'], ['Consumed', '41 h 10 m']].map(([k, v]) => h('div', null, h('small', null, k), h('b', null, v)))))),
      h('section', { class: 'k-card', style: 'margin-top:14px' }, h('b', null, 'Meetings this cycle'), h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Meeting', 'Date', 'Duration', 'Languages'].map((x) => h('th', null, x)))), h('tbody', null, [['Q3 Board Review', '19 Nov 2026', '1 h 02 m', '2'], ['Weekly Partner Sync', '20 Nov 2026', '31 m', '2'], ['Sales Kick-off', '12 Nov 2026', '2 h 15 m', '4']].map((r) => h('tr', null, r.map((c) => h('td', null, c))))))));
  }

  // ---------------------------------------------------------------- the meeting form (new AI, new HI, edit)
  function startForm(kind) {
    S.menu = null; log('click', `New meeting: ${kind === 'ai' ? 'AI speech translation' : 'Human interpretation'}`);
    S.form = { day: TODAY, kind, name: '', type: 'speech', speakers: [], translations: [], sign: [], detect: false, recording: true, autoRecord: false, hosts: [], external: false, platform: '', link: '', recurring: false, every: 1, unit: 'day(s)', prep: '0 minutes', aiAssist: false, adv: advDefaults(), advOpen: false, defaults: false };
    go(kind === 'ai' ? 'new-ai' : 'new-hi', kind === 'ai' ? 'New AI speech translation meeting' : 'New Human interpretation meeting');
  }
  const advDefaults = () => ({ size: 'small', desktop: 'off', widget: true, autoFloor: true, projection: false, speaking: 'open', mics: 1, poo: false, raise: true, camera: true, stream: 'av', invite: 'links', viewerAuth: false, pin: false, pinSend: 'link', audioMgr: false, audioMode: 'both', pro: false });
  function picker(id, list, selected, { locked = false, onChange } = {}) {
    const open = S.picker === id;
    const input = h('input', { class: 'k-pick-in', placeholder: selected.length ? '' : 'Select an option', disabled: locked, on: { input: (e) => { S.pq = e.target.value; drawList(); } } });
    const listBox = h('div', { class: 'k-pick-list' });
    const drawList = () => listBox.replaceChildren(...list.filter((l) => !selected.includes(l) && l.toLowerCase().includes((S.pq || '').toLowerCase())).map((l) => h('button', { type: 'button', on: { mousedown: (e) => { e.preventDefault(); selected.push(l); S.pq = ''; log('pick', `${id}: ${l}`); onChange?.(l); draw(); } } }, l)));
    drawList();
    const box = h('div', { class: `k-pick ${locked ? 'locked' : ''} ${open ? 'open' : ''}`, 'data-pick': id, on: { click: () => { if (locked) { log('locked', `${id} is locked`); S.flags[`locked_${id}`] = true; toastK('This setting cannot be changed once the meeting has started'); return; } if (S.picker !== id) { S.picker = id; draw(); app.querySelector(`[data-pick="${id}"] input`)?.focus(); } } } },
      h('div', { class: 'k-pick-chips' }, selected.map((l) => h('span', { class: 'k-lchip' }, locked ? null : h('button', { type: 'button', on: { click: (e) => { e.stopPropagation(); selected.splice(selected.indexOf(l), 1); log('remove', `${id}: ${l}`); draw(); } } }, '×'), l)), input), h('span', { class: 'k-caret' }, '▾'));
    return h('div', { class: 'k-pick-wrap' }, box, open && !locked ? listBox : null, selected.length && !locked ? h('button', { class: 'k-link small', type: 'button', on: { click: () => { selected.length = 0; draw(); } } }, 'Clear all languages') : null);
  }
  function advancedBlock(f, editing, live) {
    const a = f.adv, created = 'This setting cannot be changed once the meeting has been created', starts = 'This setting cannot be changed once the meeting starts';
    const lockC = editing, lockS = live;
    return h('div', { class: 'k-adv' },
      warn(created), row('Meeting type', radio('size', [['small', 'Small - Optimised for interactive meetings'], ['large', 'Large - Optimised for broadcasting']], a.size, set(a, 'size', 'Meeting type'), lockC)),
      warn(created), row('Language Access Desktop App', radio('desk', [['on', 'On'], ['off', 'Off']], a.desktop, set(a, 'desktop', 'Language Access Desktop App'), lockC)),
      row('Mobile link and iframe widget', toggle(a.widget, null, set(a, 'widget', 'Mobile link and iframe widget')), a.widget ? h('div', null, check(a.autoFloor, 'Enable auto-floor', set(a, 'autoFloor', 'Auto-floor')), check(a.projection, 'Enable horizontal screen projection', set(a, 'projection', 'Horizontal screen projection'))) : null),
      warn(starts), row('Your logo', h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Upload logo'); a.logo = true; toastK('Logo uploaded'); draw(); } } }, a.logo ? 'logo.png  ×' : '↑ Upload logo')),
      row('Speaking mode', radio('speak', [['open', 'Open microphone'], ['rts', 'Request-to-speak']], a.speaking, set(a, 'speaking', 'Speaking mode'), lockS),
        a.speaking === 'rts' ? h('div', { class: 'k-sub' }, h('span', null, 'Number of active mics '), select(Array.from({ length: 20 }, (_, i) => i + 1), a.mics, set(a, 'mics', 'Number of active mics'), 'sm'), h('span', null, '  Point of order request '), toggle(a.poo, null, set(a, 'poo', 'Point of order request'))) : null),
      row('Raise hand', toggle(a.raise, null, set(a, 'raise', 'Raise hand'))),
      row('Mobile application settings', h('div', { class: 'k-sub' }, h('span', null, "Participants' camera access "), toggle(a.camera, null, set(a, 'camera', 'Camera access'))), h('div', { class: 'k-sub' }, h('span', null, "Participant's live stream "), radio('stream', [['av', 'Deliver audio and video'], ['a', 'Deliver audio only']], a.stream, set(a, 'stream', 'Live stream')))),
      warn(starts), row('Invite method', radio('invite', [['links', 'Shareable links and user invites'], ['pre', 'Pre-approved users']], a.invite, set(a, 'invite', 'Invite method'), lockS), a.invite === 'pre' ? h('div', { class: 'k-sub' }, h('span', null, 'Viewer authentication '), toggle(a.viewerAuth, null, set(a, 'viewerAuth', 'Viewer authentication'))) : null),
      warn("You can't enable it after the meeting starts. Once enabled, it can't be turned off"), row('PIN protection', toggle(a.pin, null, set(a, 'pin', 'PIN protection'), lockS), a.pin ? radio('pinsend', [['link', 'Send PIN with the invite link'], ['sep', 'Send PIN separately']], a.pinSend, set(a, 'pinSend', 'Send PIN')) : null),
      warn(created), row('Audio manager', toggle(a.audioMgr, null, set(a, 'audioMgr', 'Audio manager'), lockC), h('small', { class: 'k-mini' }, 'Enable on-site and online participants to join the meeting'),
        a.audioMgr ? h('div', null, h('div', { class: 'k-warn strong' }, 'Remember to add an Audio manager (in the Users tab) before the start of your meeting.'), radio('amode', [['both', 'On-Site And Online Participants Join Via KUDO'], ['online', 'Online Participants Only Join Via KUDO']], a.audioMode, set(a, 'audioMode', 'Audio manager mode'), lockC), h('small', { class: 'k-mini' }, 'Suitable for when you have a mix of online and on-site participants')) : null),
      row('Professional services', toggle(a.pro, null, set(a, 'pro', 'Professional services'))));
  }
  function calendar(f) {
    const [y, mo] = S.cal.split('-').map(Number), first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
    const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    const iso = (d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shift = (n) => { const d = new Date(y, mo - 1 + n, 1); S.cal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; draw(); };
    return h('div', { class: 'k-cal' }, h('div', { class: 'k-rowsp' }, h('button', { type: 'button', on: { click: () => shift(-1) } }, '‹'), h('b', null, `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mo - 1]} ${y}`), h('button', { type: 'button', on: { click: () => shift(1) } }, '›')),
      h('div', { class: 'k-calgrid' }, ...['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => h('small', null, d)), ...cells.map((d) => (d ? h('button', { type: 'button', disabled: iso(d) < TODAY, class: iso(d) === f.day ? 'on' : '', on: { click: () => { f.day = iso(d); S.cal = null; log('change', `Date: ${fmtForm(f.day)}`); draw(); } } }, String(d)) : h('span')))));
  }
  function formScreen(mode) {
    const editing = mode === 'edit', f = S.form, live = editing && S.meeting.status === 'live', hi = f.kind === 'hi';
    const name = h('input', { class: 'k-in', value: f.name, placeholder: 'Enter your meeting title', on: { input: (e) => { f.name = e.target.value; }, change: (e) => log('input', `Meeting name: ${e.target.value}`) } });
    const hostEmail = h('input', { class: 'k-in', placeholder: 'Email' });
    const created = 'This setting cannot be changed once the meeting has been created', starts = 'This setting cannot be changed once the meeting starts';
    const form = h('div', { class: 'k-form' }, h('h2', null, editing ? 'Edit a meeting' : hi ? 'Human interpretation meeting' : 'AI speech translation meeting'),
      row('Meeting name *', name, h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Add description'))),
      row(hi ? 'Date/Time *' : 'Date/time *', h('div', { class: 'k-dt' }, h('div', null, h('small', null, 'Start date/time'), h('button', { class: 'k-in fake k-click', type: 'button', on: { click: () => { S.cal = S.cal ? null : (f.day || TODAY).slice(0, 7); log('click', 'Start date'); draw(); } } }, ic('cal', 14), fmtForm(f.day || TODAY)), h('span', { class: 'k-in fake' }, ic('clock', 14), '2:00 PM'), S.cal ? calendar(f) : null), h('div', null, h('small', null, 'End date/time'), h('span', { class: 'k-in fake' }, ic('cal', 14), fmtForm(f.day || TODAY)), h('span', { class: 'k-in fake' }, ic('clock', 14), '3:00 PM'))),
        h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Change time zone (CET)'), '   ', check(!!f.force, 'Force close meeting', set(f, 'force', 'Force close meeting')))),
      editing ? null : row('Recurring meeting', toggle(f.recurring, null, set(f, 'recurring', 'Recurring meeting')), f.recurring ? h('div', { class: 'k-sub' }, h('span', null, 'Repeat every '), select([1, 2, 3, 4], f.every, set(f, 'every', 'Repeat every'), 'sm'), select(['day(s)', 'week(s)', 'month(s)'], f.unit, set(f, 'unit', 'Repeat unit'), 'sm'), h('span', null, '  Ends '), select(['On this day', 'After'], 'On this day', set(f, 'ends', 'Ends'), 'sm'), h('span', { class: 'k-in fake' }, ic('cal', 14), 'Select date')) : null),
      hi ? row(h('span', null, 'Preparation time', h('small', { class: 'k-mini' }, ' Optional')), select(['0 minutes', '15 minutes', '30 minutes', '45 minutes', '60 minutes', '2 hours'], f.prep, set(f, 'prep', 'Preparation time'), 'sm')) : null,
      hi ? null : warn(created),
      hi ? null : row('Translation type', ...[['speech', 'AI speech & captions', 'Offer multilingual audio, captions, recording, transcriptions, and AI customization for greater accuracy.'], ['captions', 'AI captions only', 'Supports multilingual closed captioning only, with enhanced display speed. This mode does not support AI customization features.']].map(([k, t, d]) =>
        h('label', { class: `k-type ${f.type === k ? 'on' : ''} ${editing ? 'dis' : ''}` }, h('input', { type: 'radio', name: 'ttype', checked: f.type === k, disabled: editing, on: { change: () => { f.type = k; log('choose', `Translation type: ${t}`); draw(); } } }), h('span', { class: 'k-type-ic' }, ic(k === 'speech' ? 'speaker' : 'cc', 22)), h('span', null, h('b', null, t), h('small', null, d))))),
      hi ? row('Languages', h('small', null, 'Spoken language(s)'), picker('Spoken language', SPEAKER, f.speakers, { locked: live }), h('small', null, 'Sign language(s)'), picker('Sign language', SIGN, f.sign, { locked: live }))
        : row('Languages', h('small', null, 'Speaker language(s)'), picker('Speaker language', SPEAKER, f.speakers, { locked: live, onChange: (l) => { if (l === 'English' && !f.translations.includes('English (US)')) f.translations.unshift('English (US)'); } }),
          toggle(f.detect, 'Detect language automatically', set(f, 'detect', 'Detect language automatically'), live), h('small', { class: 'k-mini' }, 'Up to 10 speaker languages, accuracy may be affected'), h('small', null, 'Translation language(s)'), picker('Translation language', TRANSLATION, f.translations)),
      warn(created),
      row('External meeting: Using KUDO on another platform?', toggle(f.external, null, set(f, 'external', 'External meeting'), editing),
        f.external ? h('div', null, h('small', null, 'Meeting platform *'), select([['', 'Please select'], 'Microsoft Teams', 'Google Meet', 'Zoom', 'Webex'], f.platform, set(f, 'platform', 'Meeting platform')), h('div', { class: 'k-rowsp' }, h('small', null, 'Meeting link *'), sc.apps?.includes('vmeet') ? pasteSel((t) => { f.link = t; log('input', 'Meeting link'); draw(); }) : null), h('input', { class: 'k-in', placeholder: 'Enter your meeting link', value: f.link, on: { change: (e) => { f.link = e.target.value; log('input', 'Meeting link'); } } })) : null),
      hi ? warn(starts) : null, hi ? row('AI Assist & Transcripts', toggle(f.aiAssist, null, (v) => { if (v) { S.modal = { kind: 'aiassist' }; log('click', 'AI Assist & Transcripts on'); draw(); } else set(f, 'aiAssist', 'AI Assist & Transcripts')(false); }, live)) : null,
      editing || f.external ? null : row(h('span', null, 'Host', h('small', { class: 'k-mini' }, ' Optional')), ...f.hosts.map((x) => h('div', { class: 'k-hostrow' }, ic('user', 14), x)), h('button', { class: 'k-link', type: 'button', on: { click: () => { S.modal = { kind: 'addhost' }; log('click', '+ Add host'); draw(); } } }, '+ Add host'), h('small', { class: 'k-mini' }, 'Max. 2 hosts per meeting')),
      warn(starts),
      row(hi ? 'Recording' : 'Recording and transcript', toggle(f.recording, null, set(f, 'recording', 'Recording'), live), check(f.autoRecord, 'Automatically record this meeting when it starts', (v) => { f.autoRecord = v; log('toggle', `Automatically record: ${v}`); }, live || !f.recording)),
      f.advOpen ? advancedBlock(f, editing, live) : null,
      h('div', { class: 'k-formfoot' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { f.advOpen = !f.advOpen; log('click', f.advOpen ? 'Advanced settings' : 'Less settings'); if (f.advOpen && !RELEVANT.has('advanced')) detour('Advanced settings'); draw(); } } }, f.advOpen ? 'Less settings ▴' : 'Advanced settings ▾'),
        h('div', { class: 'k-row' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { log('click', 'Cancel'); go(editing ? 'meeting' : 'home', 'Cancel'); } } }, 'Cancel'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => (editing ? update() : save()) } }, editing ? 'Update' : 'Save'))),
      editing ? null : h('div', { class: 'k-defaults' }, toggle(f.defaults, 'Save settings as default for future meetings', set(f, 'defaults', 'Save settings as default')), h('small', { class: 'k-mini' }, 'Meeting name, description, date/time, recurrence, host, logo, and meeting integration settings are not saved as default.')));
    const extra = S.modal?.kind === 'aiassist' ? modal('AI Assist & Transcripts disclaimer', [h('p', { class: 'k-mini' }, 'AI Assist & Transcripts provides real-time captions in the source language to support interpreters. These captions are automatically generated and may contain inaccuracies. KUDO and its interpreters are not responsible for any errors or omissions.')], [['Cancel', () => { S.modal = null; log('click', 'AI Assist disclaimer: Cancel'); draw(); }, 'ghost'], ['Ok', () => { f.aiAssist = true; S.modal = null; log('toggle', 'AI Assist & Transcripts: true'); draw(); }]])
      : S.modal?.kind === 'editconfirm' ? modal('Are you sure you want to edit this meeting?', [h('div', { class: 'k-kv' }, ...[['Meeting title', f.name], ['Start date', `${fmtForm(f.day || TODAY)}, 02:00 PM`], ['End date', `${fmtForm(f.day || TODAY)}, 03:00 PM`], ['Timezone', 'Brussels']].map(([k, v]) => h('div', null, h('b', null, k), h('span', null, v)))),
        h('p', { class: 'k-mini' }, "If you invited attendees by sending invite links or through calendar don't forget to let them know about the update."), check(S.modal.notify !== false, 'Send a notification email about the update to the users who were added to the meeting in KUDO interface', (v) => { S.modal.notify = v; })],
        [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['Edit Meeting', () => { log('click', `Edit Meeting (notify: ${S.modal.notify !== false})`); S.modal = null; update(true); }]]) : null;
    return shell(form, h('div', { class: 'k-terms' }, ic('help', 14), ' By continuing to use KUDO, you agree to our ', h('span', { class: 'k-link' }, 'Terms and Conditions')), extra, S.modal?.kind === 'addhost' ? modal('Add host', [row('Email', hostEmail)], [['Close', () => { S.modal = null; draw(); }, 'ghost'], ['Next', () => { const v = hostEmail.value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toastK('Enter a valid email'); if (f.hosts.length >= 2) return toastK('Max. 2 hosts per meeting'); f.hosts.push(v); S.modal = null; log('input', `Host added in the form: ${v}`); draw(); }]]) : null);
  }
  const modal = (title, body, actions) => h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, title), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')), ...body,
    h('div', { class: 'k-row end' }, actions.map(([l, fn, cls]) => h('button', { class: `k-btn ${cls || ''}`, type: 'button', on: { click: fn } }, l)))));
  function save() {
    const f = S.form;
    if (!f.name.trim()) return toastK('Meeting name is required');
    if (!f.speakers.length || (f.kind === 'ai' && !f.translations.length)) return toastK('Choose the languages');
    if (f.external && (!f.platform || !f.link)) return toastK('Choose the meeting platform and paste the meeting link');
    S.meeting = { day: f.day || TODAY, kind: f.kind, name: f.name.trim(), type: f.kind === 'ai' ? f.type : 'hi', speakers: [...f.speakers], translations: f.kind === 'ai' ? [...f.translations] : [], sign: [...f.sign], recording: f.recording, autoRecord: f.autoRecord, external: f.external, platform: f.external ? f.platform : '', link: f.external ? f.link.trim() : '', force: !!f.force, detect: !!f.detect, adv: { ...f.adv }, prep: f.prep, aiAssist: f.aiAssist,
      participants: f.hosts.map((e) => ({ email: e, name: e.split('@')[0], role: 'Host', via: 'form' })), operators: [], viewers: [], polls: [], files: [], status: 'scheduled', glossary: null,
      av: { res: 'Auto (adaptive)', fps: 'Auto (adaptive)', bitrate: 'Auto (adaptive)', stereo: false, level: 50, processing: true },
      features: { lobby: false, lobbyP: false, lobbyV: false, users: true, docs: true, msg: true, polls: true, request: false, share: true } };
    S.mine = S.meeting; S.flags.created = [...(S.flags.created || []), f.kind];
    log('save', 'Save: meeting created', { meeting: { kind: f.kind, name: S.meeting.name, speakers: S.meeting.speakers, translations: S.meeting.translations, autoRecord: f.autoRecord } });
    go('meeting', 'Meeting created'); toastK('Meeting scheduled successfully');
  }
  function update(confirmed) {
    const f = S.form, m = S.meeting;
    if (m.status === 'scheduled' && !confirmed) { S.modal = { kind: 'editconfirm' }; log('click', 'Update'); draw(); return; }
    const added = f.translations.filter((l) => !m.translations.includes(l)), removed = m.translations.filter((l) => !f.translations.includes(l));
    m.translations = [...f.translations]; m.name = f.name.trim() || m.name; Object.assign(m.adv, f.adv);
    if (m.status !== 'live') { m.speakers = [...f.speakers]; m.autoRecord = f.autoRecord; m.recording = f.recording; m.sign = [...f.sign]; m.aiAssist = f.aiAssist; m.prep = f.prep; m.force = !!f.force; m.detect = !!f.detect; if (m.external) { m.platform = f.platform; m.link = (f.link || '').trim(); } if (f.day && f.day !== m.day) log('change', `Meeting moved to ${fmtForm(f.day)}`); m.day = f.day; }
    if (added.length && m.status === 'live') { m.pendingRestart = true; F().liveAdded = [...(F().liveAdded || []), ...added]; }
    if (added.length && m.status === 'scheduled') F().addedBeforeStart = [...(F().addedBeforeStart || []), ...added];
    if (removed.length) F().removed = [...(F().removed || []), ...removed];
    log('save', `Update: ${added.length ? `added ${added.join(', ')}` : 'no new language'}${removed.length ? `, removed ${removed.join(', ')}` : ''}`);
    go('meeting', 'Meeting updated'); toastK('Meeting updated successfully');
  }

  // ---------------------------------------------------------------- the meeting page and its tabs
  const TAB_OF = { meeting: 'overview', users: 'users', participants: 'users', operators: 'users', viewers: 'users', polls: 'content', 'poll-new': 'content', poll: 'content', files: 'content', messages: 'content', recordings: 'content', av: 'settings', features: 'settings', broadcast: 'settings', rtmp: 'settings', interpreters: 'users', mglossaries: 'glossaries', stats: 'stats' };
  const tabs = () => {
    const m = S.meeting, cur = TAB_OF[S.screen];
    const menu = (k, label, items) => h('span', { class: 'k-tabw' }, h('button', { class: `k-tab ${cur === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.menu = S.menu === k ? null : k; log('click', `${label} menu`); draw(); } } }, `${label} ▾`),
      S.menu === k ? h('div', { class: 'k-menu' }, items.filter(Boolean).map(([l, fn, dis]) => h('button', { type: 'button', disabled: !!dis, class: dis ? 'dis' : '', on: { click: fn } }, l))) : null);
    return h('div', { class: 'k-mhead' }, h('div', { class: 'k-mtitle' }, h('h2', null, m.name), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase())),
      h('nav', { class: 'k-tabs' }, h('button', { class: `k-tab ${cur === 'overview' ? 'on' : ''}`, type: 'button', on: { click: () => go('meeting', 'Overview') } }, 'Overview'),
        menu('users', 'Users', [['All users', () => go('users', 'Users: All users')], ['Participants', () => go('participants', 'Users: Participants')], ['Operators', () => go('operators', 'Users: Operators')], ['Viewers', () => go('viewers', 'Users: Viewers')], m.kind === 'hi' ? ['Interpreters', () => go('interpreters', 'Users: Interpreters')] : null]),
        menu('content', 'Content', [['Polls', () => go('polls', 'Content: Polls')], ['Files', () => go('files', 'Content: Files')], m.status !== 'scheduled' ? ['Messages', () => go('messages', 'Content: Messages')] : null, ['Recordings & transcripts', () => go('recordings', 'Content: Recordings & transcripts')]]),
        menu('settings', 'Settings', [['AV configurations', () => go('av', 'Settings: AV configurations')], ['Meeting features', () => go('features', 'Settings: Meeting features')], ['Broadcast', () => go('broadcast', 'Settings: Broadcast')]]),
        h('button', { class: `k-tab ${cur === 'glossaries' ? 'on' : ''}`, type: 'button', on: { click: () => go('mglossaries', 'My glossaries (meeting)') } }, 'My glossaries'),
        m.status === 'finished' ? h('button', { class: `k-tab ${cur === 'stats' ? 'on' : ''}`, type: 'button', on: { click: () => go('stats', 'Meeting statistics') } }, 'Meeting statistics') : null));
  };
  // Links: each meeting has its own IDs. Copying puts the item on the sandbox clipboard; "Reply to the client" sends it.
  let idSeq = 0;
  const idsOf = (m) => (m.ids = m.ids || (() => { const n = String(219330417 + 111 * (idSeq++)).padStart(9, '0'); return { p: `240${n}`, o: `480${n}`, v: `770${n}`, i: `330${n}` }; })());
  const LINK = {
    participant: (m) => `https://live.kudoway.eu/k8/${idsOf(m).p}`, operator: (m) => `https://live.kudoway.eu/k8/${idsOf(m).o}`, viewer: (m) => `https://live.kudoway.eu/k8/${idsOf(m).v}`,
    interpreter: (m) => `https://live.kudoway.eu/ad/${idsOf(m).i}`, mobile: (m) => `https://audio-widget.kudoway.com/${idsOf(m).v}`,
    iframe: (m) => `<iframe name="KUDO Widget" src="https://audio-widget.kudoway.com/${idsOf(m).v}" width="375px" height="500px" style="border:0px #fff none;" allowfullscreen></iframe>`,
    'wcode-real time': (m) => `<div id="kudo_wrapper" class="kudo-widget"></div><script src="https://kudo-widget.example/live/main.js"></script><script>window.mid = "${idsOf(m).v}"</script>`,
    'wcode-broadcasting': (m) => `<div id="kudo_wrapper" class="kudo-widget"></div><script src="https://kudo-widget.example/hls/main.js"></script><script>window.mid = "${idsOf(m).v}"</script>`,
    qr: (m) => `QR code (PNG) for ${m.name}`,
  };
  const LABEL = { participant: 'Participant/Speaker link', operator: 'Operator link', viewer: 'Viewer-Only link', interpreter: 'Interpreter link', mobile: 'Mobile Link', iframe: 'iframe widget code', 'wcode-real time': 'Widget code (Real time stream)', 'wcode-broadcasting': 'Widget code (Broadcasting)', qr: 'QR code image' };
  S.clip = [];
  const copy = (kind, m = S.meeting) => {
    const item = { kind, meeting: m, text: LINK[kind](m), label: `${LABEL[kind]}, ${m.name}` };
    S.clip = [item, ...S.clip.filter((c) => !(c.kind === kind && c.meeting === m))].slice(0, 12);
    try { if (kind !== 'qr') navigator.clipboard?.writeText(item.text).catch(() => {}); } catch { /* the sandbox list below still has it */ }
    log('copy', `Copied ${LABEL[kind]} of ${m.name}`);
    if (!sc.links && !kind.startsWith('wcode') && m === S.meeting) detour(`Copied the ${LABEL[kind]}`);
    if (kind === 'qr') toastK('QR code downloaded'); else toastK('Copy Successful! Copied!');
  };
  const openLink = (role) => { log('click', `Opened the ${LABEL[role]}`); go('preview', `Preview: ${LABEL[role]}`, { pv: { role, m: S.meeting, step: role === 'participant' ? 'lobby' : role === 'operator' ? 'audio' : role === 'mobile' ? 'welcome' : 'room', panel: null, lang: 'Original audio' } }); };
  const linkBox = (label, role, extra) => h('div', { class: 'k-lbox' }, h('div', { class: 'k-rowsp' }, h('b', null, label), extra || null),
    h('div', { class: 'k-linkrow' }, h('button', { class: 'k-copy', type: 'button', title: 'Copy', on: { click: () => copy(role) } }, LINK[role](S.meeting).replace(/^https:\/\//, 'https://').slice(0, 34) + '…'),
      h('button', { class: 'k-open', type: 'button', title: 'Open link', 'aria-label': `Open the ${label} link`, on: { click: () => openLink(role) } }, '↗')),
    role === 'mobile' ? null : h('div', { class: 'k-rowsp' }, h('span', { class: 'k-mini' }, 'Add to calendar:'), h('span', null, ...['Google', 'Outlook'].map((c) => h('button', { class: 'k-cal-ic', type: 'button', title: c, on: { click: () => { detour(`Add to calendar (${c}): ${label}`); toastK(`${c} calendar invite downloaded`); } } }, ic('cal', 12))))));
  const links = () => (['finished', 'canceled'].includes(S.meeting.status) ? h('aside', { class: 'k-links' }, h('p', { class: 'k-mini' }, 'The meeting is finished. The invite links are not available.'))
    : h('aside', { class: 'k-links' }, h('h4', null, ic('link'), ' KUDO meeting links ', h('small', { class: 'k-click', on: { click: () => { ['participant', 'operator', 'viewer'].forEach((k) => copy(k)); log('click', 'Copy all links'); } } }, 'Copy all links')),
      linkBox('Participant/Speaker', 'participant'), S.meeting.kind === 'hi' ? linkBox('Interpreter', 'interpreter') : null, linkBox('Operator', 'operator'),
      linkBox('Viewer-Only', 'viewer', h('span', { class: 'k-rel' }, h('button', { class: 'k-link small', type: 'button', on: { click: () => { S.menu = S.menu === 'wcode' ? null : 'wcode'; log('click', 'Copy widget code'); draw(); } } }, 'Copy widget code ▾'),
        S.menu === 'wcode' ? h('div', { class: 'k-menu right' }, ...[['Real time stream *', 'real time'], ['Broadcasting **', 'broadcasting']].map(([t, k]) => h('button', { type: 'button', on: { click: () => { S.menu = null; S.wcode = k; if (S.meeting === S.mine) S.flags.wcodes = [...(S.flags.wcodes || []), k]; copy(`wcode-${k}`); draw(); } } }, t))) : null)),
      h('h4', null, 'KUDO language access'),
      h('div', { class: 'k-lbox' }, h('b', null, 'iframe widget'), h('button', { class: 'k-copy', type: 'button', on: { click: () => copy('iframe') } }, '<iframe name="KUDO Widget"…')),
      linkBox('Mobile Link', 'mobile'),
      h('div', { class: 'k-lbox k-qr' }, h('span', null, 'Download QR code'), h('button', { class: 'k-qrbox', type: 'button', title: 'Download QR code', on: { click: () => copy('qr') } }))));

  // What each link opens (from the recordings): lobby and room for Participant/Speaker, the Operator console,
  // the Viewer-Only room and the Mobile Link page.
  function previewScreen() {
    const p = S.pv, m = p.m, langs = ['Original audio', ...(m.kind === 'hi' ? m.speakers : m.translations)];
    const back = h('button', { class: 'pv-back', type: 'button', on: { click: () => { log('click', 'Back to the portal'); S.meeting = m; go('meeting', 'Back to the portal'); } } }, 'Back to the portal');
    const set = (o) => { Object.assign(p, o); draw(); };
    const top = h('div', { class: 'pv-top' }, h('img', { src: '/kudo-logo.png', alt: 'KUDO', class: 'pv-logo' }), h('b', null, m.name), h('span', { class: 'pv-gap' }), h('span', null, 'Demo NDK'), h('span', null, 'Log out'));
    if (p.role === 'mobile') {
      return h('div', { class: 'pv' }, back, h('div', { class: 'pv-mobile' }, p.step === 'welcome'
        ? h('div', { class: 'pv-wcard' }, h('h3', null, 'Welcome!'), h('p', null, m.name), select(['Please select your language', ...langs.slice(1)], p.lang, (v) => { p.lang = v; }), h('button', { class: 'k-btn', type: 'button', on: { click: () => { log('click', 'Mobile Link: Join'); set({ step: 'room' }); } } }, 'Join'), h('small', { class: 'k-mini' }, 'By continuing, you agree to our Terms of use and Privacy policy'))
        : h('div', { class: 'pv-wcard' }, h('div', { class: 'pv-cap' }, 'Captions appear here'), h('div', { class: 'pv-wbar' }, ...['Voice', 'Captions', 'Audio', 'Leave'].map((x) => h('button', { type: 'button', on: { click: () => { log('click', `Mobile Link: ${x}`); if (x === 'Leave') set({ step: 'welcome' }); } } }, x))))));
    }
    if (p.step === 'lobby') {
      return h('div', { class: 'pv light' }, back, h('div', { class: 'pv-lobby' }, h('div', null, h('b', null, 'Meeting & Attendance Details'), h('div', { class: 'k-note' }, h('b', null, m.name), h('div', null, dOf(m).date), h('div', null, dOf(m).time), h('div', null, m.translations.join(', ') || m.speakers.join(', '))),
        row('Display Name *', h('input', { class: 'k-in', value: 'Demo NDK' })), row('Email *', h('input', { class: 'k-in', value: 'demo@client-demo.com' })),
        row('My language', select(m.speakers, m.speakers[0], () => {})), row('What voice should others hear when you speak?', radio('voice', [['m', 'Male'], ['f', 'Female'], ['n', 'No preference']], 'n', () => {}))),
        h('div', null, h('div', { class: 'pv-cam' }, ic('user', 48)), h('span', { class: 'k-link small' }, 'Test connection'), h('button', { class: 'k-btn', type: 'button', on: { click: () => { log('click', 'Participant lobby: Join'); set({ step: 'room' }); } } }, 'Join'), h('small', { class: 'k-mini' }, 'Wear a headset for the best experience'))));
    }
    if (p.step === 'audio') return h('div', { class: 'pv' }, back, top, h('div', { class: 'pv-dialog' }, h('p', null, "To connect to the meeting audio, please click 'Ok'"), h('button', { class: 'k-btn', type: 'button', on: { click: () => set({ step: 'room' }) } }, 'OK')));
    const role = p.role;
    const sideItems = role === 'viewer' ? [] : role === 'operator' ? ['Share screen', 'Messages', 'Polls', 'Document', 'Request list', 'User list'] : ['Share screen', 'Messages', 'Polls', 'Document', 'User list'];
    const PANEL = { Messages: () => h('div', null, h('div', { class: 'pv-tabs' }, metaRow(['Participants', 'Technical Support', 'Private'])), h('div', { class: 'pv-empty' }, 'Type a message')),
      Polls: () => role === 'operator' ? h('div', null, h('div', { class: 'pv-tabs' }, metaRow(['Settings', 'Results'])), ...(m.polls.length ? m.polls : [{ q: 'Is Blue the best Color?', answers: ['Yes', 'No', 'Abstain'] }]).map((x) => h('div', { class: 'pv-poll' }, h('b', null, x.q), h('ol', null, x.answers.map((a) => h('li', null, a))), h('button', { class: 'k-btn', type: 'button', on: { click: () => log('click', 'Operator: Start poll') } }, 'Start poll'), h('button', { class: 'k-btn soft', type: 'button' }, 'Poll Status'))))
        : h('div', null, h('div', { class: 'pv-tabs' }, metaRow(['Polls', 'Results']))),
      Document: () => h('div', null, ...m.files.map((f) => h('div', { class: 'pv-file' }, f.name)), role === 'operator' ? h('button', { class: 'k-btn', type: 'button' }, 'Upload') : null),
      'Request list': () => h('div', null, h('small', { class: 'k-mini' }, 'REQUESTING TO SPEAK (0)')),
      'User list': () => h('div', null, h('div', { class: 'pv-tabs' }, metaRow(role === 'operator' ? ['Users', 'Operators'] : ['Participants (1)', 'Viewers (0)'])), h('div', { class: 'pv-file' }, 'Demo NDK')),
      'Share screen': () => h('div', { class: 'pv-empty' }, 'Choose a screen or window to share') };
    const bottom = role === 'operator' ? ['Recording OFF', 'Audio ON', 'Broadcast'] : role === 'viewer' ? ['Audio ON', 'Camera OFF'] : ['Audio ON', 'Mic OFF', 'Camera ON', 'Raise hand'];
    return h('div', { class: 'pv' }, back, top, h('div', { class: 'pv-body' }, h('div', { class: 'pv-stage' }, role === 'viewer' ? h('span', { class: 'k-mini' }, 'Viewer-Only: you watch and listen') : ic('user', 72)),
      p.panel ? h('div', { class: 'pv-panel' }, h('div', { class: 'k-rowsp' }, h('b', null, p.panel), h('button', { type: 'button', on: { click: () => set({ panel: null }) } }, '×')), PANEL[p.panel]()) : null,
      sideItems.length ? h('div', { class: 'pv-side' }, ...sideItems.map((x) => h('button', { class: p.panel === x ? 'on' : '', type: 'button', on: { click: () => { log('click', `${LABEL[role]} room: ${x}`); set({ panel: p.panel === x ? null : x }); } } }, x))) : null),
      h('div', { class: 'pv-bottom' }, h('div', { class: 'pv-sel' }, select(langs, p.lang, (v) => { p.lang = v; log('change', `Interpretation language: ${v}`); toastK(`You have selected ${v.toUpperCase()}`); }), h('small', null, role === 'operator' ? 'Select language' : 'Interpretation language')),
        h('div', { class: 'pv-sel' }, select(['Captions OFF', ...langs.slice(1)], 'Captions OFF', () => {}), h('small', null, 'Closed caption language')),
        role === 'participant' ? h('div', { class: 'pv-sel' }, select(m.speakers, m.speakers[0], () => {}), h('small', null, 'You are speaking')) : null,
        h('span', { class: 'pv-gap' }), ...bottom.map((x) => h('button', { class: 'pv-btn', type: 'button', on: { click: () => log('click', `${LABEL[role]} room: ${x}`) } }, x)),
        h('button', { class: 'pv-btn leave', type: 'button', on: { click: () => { log('click', 'Leave'); S.meeting = m; go('meeting', 'Left the meeting'); } } }, 'Leave')));
  }

  // "Reply to the client": the trainee gives each person what they copied (or types an answer).
  S.reply = {};
  function drawReply() {
    if (!sc.reply) return;
    replyPanel.replaceChildren(h('div', { class: 'row spread' }, h('b', null, 'Reply to the client'), h('button', { class: 'btn sm', type: 'button', on: { click: () => { replyPanel.hidden = true; } } }, 'Close')),
      h('p', { class: 'muted small' }, S.clip.length ? 'For each person, choose what you copied in the KUDO portal.' : 'Nothing copied yet: copy links or codes in the KUDO portal first, then come back.'),
      ...sc.reply.map((r) => h('div', { class: 'sbx-rrow' }, h('label', null, r.label),
        r.type === 'text' ? h('input', { class: 'input', placeholder: r.placeholder || 'Type your answer', value: S.reply[r.id]?.text || '', on: { change: (e) => { S.reply[r.id] = { text: e.target.value.trim() }; log('reply', `${r.label}: ${e.target.value.trim()}`); } } })
          : h('select', { class: 'input', on: { change: (e) => { const c = S.clip[Number(e.target.value)]; S.reply[r.id] = c || null; log('reply', `${r.label}: ${c ? c.label : 'nothing'}`); drawReply(); } } },
            h('option', { value: '' }, S.reply[r.id] ? S.reply[r.id].label : 'Choose what you copied'), ...S.clip.map((c, i) => h('option', { value: i }, c.label))),
        r.type !== 'text' && S.reply[r.id] ? h('code', { class: 'sbx-rtext' }, S.reply[r.id].text) : null)),
      S.clip.length ? h('details', { class: 'sbx-clip' }, h('summary', null, `What you copied (${S.clip.length})`), ...S.clip.map((c) => h('div', null, h('b', null, c.label), h('code', { class: 'sbx-rtext' }, c.text)))) : null);
  }
  const page = (...body) => shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, ...body), links()));
  const iconBtn = (icon, tip, fn, cls = '') => h('button', { class: `k-ic ${cls}`, type: 'button', title: tip, 'aria-label': tip, on: { click: fn } }, icon);
  function meetingScreen() {
    const m = S.meeting;
    const actions = m.status === 'scheduled' ? [iconBtn(ic('play'), 'Start meeting', () => { log('click', 'Start meeting'); S.modal = { kind: 'start' }; draw(); }, 'go'), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('x'), 'Cancel meeting', () => { log('trap', 'Cancel meeting clicked'); S.modal = { kind: 'cancel' }; draw(); }, 'stop')]
      : m.status === 'live' ? [iconBtn(ic('restart'), 'Restart translation service', () => { log('click', 'Restart translation service'); if (m.pendingRestart) { m.pendingRestart = false; F().restarted = true; } else F().restartNoChange = (F().restartNoChange || 0) + 1; toastK('Translation service restart in progress. Service should resume shortly'); draw(); }), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('stop'), 'End meeting', () => { log('click', 'End meeting'); if (!confirm('End the meeting for everyone? An AI meeting cannot be restarted.')) return; m.status = 'finished'; F().ended = true; F().endedBeforeSpanish = !(F().liveAdded || []).some(es); toastK('Meeting has been stopped'); draw(); }, 'stop')]
        : [iconBtn(ic('edit'), 'Edit meeting', () => { detour('Edit a finished meeting'); toastK('The meeting is finished'); })];
    const a = m.adv;
    return withModal(page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Overview'), h('div', { class: 'k-acts' }, ...actions)),
      h('div', { class: 'k-def' }, h('span', null, 'Date/time'), h('div', { class: 'k-dtv' }, h('div', null, h('small', null, 'Date'), h('b', null, dOf(m).date)), h('div', null, h('small', null, 'Time'), h('b', null, dOf(m).time)), h('div', { class: 'k-full' }, h('small', null, 'Timezone'), h('span', null, 'Brussels (UTC +01:00)')))),
      m.kind === 'hi' ? null : h('div', { class: 'k-def' }, h('span', null, 'Translation type'), h('div', { class: 'k-typebox' }, m.type === 'speech' ? 'AI speech and captions' : 'AI captions only')),
      m.kind === 'hi' ? h('div', { class: 'k-def' }, h('span', null, 'Languages'), h('div', null, h('small', null, 'Translation languages'), h('div', null, m.speakers.map((l) => h('span', { class: 'k-lchip' }, l))), (m.sign || []).length ? h('small', null, 'Sign languages') : null, h('div', null, (m.sign || []).map((l) => h('span', { class: 'k-lchip' }, l))),
          h('button', { class: `k-book ${canBook(m) ? 'on' : ''}`, type: 'button', disabled: !canBook(m), on: { click: () => { S.bk = { subject: '', topics: [], agree: false, q: '' }; S.modal = { kind: 'book' }; log('click', 'Book Interpreters'); draw(); } } }, ic('user', 13), ' Book Interpreters')))
        : h('div', { class: 'k-def' }, h('span', null, 'Languages'), h('div', null, h('small', null, 'Speaker languages'), h('div', null, m.speakers.map((l) => h('span', { class: 'k-lchip' }, l))), h('small', null, 'Translation languages'), h('div', null, m.translations.map((l) => h('span', { class: 'k-lchip' }, l))))),
      m.external ? h('div', { class: 'k-def' }, h('span', null, 'External meeting'), h('div', null, h('b', null, m.platform), h('small', { class: 'k-mini k-break' }, m.link),
        h('div', { class: 'k-botbox' }, h('b', null, 'KUDO bot timeout'), h('p', { class: 'k-mini' }, 'The bot will disconnect if no participant is detected after 10 minutes. Use "Add bot" or "Restart bot service" to bring it back.'),
          h('div', { class: 'k-row' }, h('button', { class: 'k-btn soft', type: 'button', disabled: m.status !== 'live', on: { click: () => botAgain('Add bot') } }, 'Add bot'), h('button', { class: 'k-btn soft', type: 'button', disabled: m.status !== 'live', on: { click: () => botAgain('Restart bot service') } }, 'Restart bot service'))))) : null,
      m.booked ? h('div', { class: 'k-def' }, h('span', null, 'Interpreters'), h('div', null, '✓ Booked')) : null,
      m.booked ? h('div', { class: 'k-def' }, h('span', null, 'Preparation materials for interpreters'), h('div', null, h('div', { class: 'k-red' }, '! No preparation materials/information added'), h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Add preparation materials'); S.modal = { kind: 'notyet' }; draw(); } } }, '+ Add preparation materials securely and exclusively for interpreters'))) : null,
      S.ovAdv ? h('div', { class: 'k-def' }, h('span', null, 'Advanced settings'), h('div', { class: 'k-mini k-advlist' }, ...[['Meeting type', a.size === 'large' ? 'Large' : 'Small'], ['Mobile link and iframe widget', a.widget ? 'On' : 'Off'], ['Auto-floor', a.autoFloor ? 'On' : 'Off'], ['Speaking mode', a.speaking === 'rts' ? 'Request-to-speak' : 'Open microphone'], ['Raise hand', a.raise ? 'On' : 'Off'], ['Invite method', a.invite === 'pre' ? 'Pre-approved users' : 'Shareable links and user invites'], ['PIN protection', a.pin ? 'On' : 'Off'], ['Audio manager', a.audioMgr ? 'On' : 'Off'], ['Recording', m.recording ? (m.autoRecord ? 'Automatic' : 'Manual') : 'Off']].map(([k, v]) => h('div', null, h('span', null, k), h('b', null, v))))) : null,
      h('div', { class: 'k-cardf' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { S.ovAdv = !S.ovAdv; log('click', 'Advanced settings (overview)'); if (S.ovAdv) detour('Advanced settings (overview)'); draw(); } } }, S.ovAdv ? 'Less settings ▴' : 'Advanced settings ▾'), h('span', { class: 'k-mini' }, 'Support ID: ', h('button', { class: 'k-copy sm', type: 'button', on: { click: () => { log('click', 'Copy Support ID'); toastK('Support ID copied'); } } }, m === S.mine ? '800 212 907 037' : '800 214 597 772')))));
  }
  const canBook = (m) => m.kind === 'hi' && m.status === 'scheduled' && !m.booked && (m.day || TODAY) > TODAY;
  const SUBJECTS = ['Animals / Veterinary', 'Art / Culture', 'Automotive', 'Banking / Finance', 'Business / Trade', 'Community Service', 'Education', 'Energy', 'Healthcare / Medical', 'Legal', 'Politics / Government', 'Technology / IT', 'Other'];
  function bookModal() {
    const m = S.meeting, b = S.bk, d = fmtForm(m.day || TODAY);
    const topicIn = h('input', { class: 'k-pick-in', placeholder: b.topics.length ? '' : 'Enter key topics like machinery or device names', value: b.q, on: { input: (e) => { b.q = e.target.value; const l = e.target.parentNode.parentNode.querySelector('.k-pick-list'); if (l) l.replaceChildren(...sugg()); }, keydown: (e) => { if (e.key === 'Enter' && b.q.trim()) { e.preventDefault(); add(b.q.trim()); } } } });
    const add = (t) => { if (!b.topics.includes(t)) b.topics.push(t); b.q = ''; log('input', `Specific topic: ${t}`); draw(); };
    const sugg = () => (b.q.trim() ? [h('button', { type: 'button', on: { mousedown: (e) => { e.preventDefault(); add(b.q.trim()); } } }, b.q.trim())] : [h('span', { class: 'k-mini' }, 'No results found')]);
    return modal('Book Interpreters', [
      row('Date / time', h('div', null, `${d} - ${d} 14:00 - 15:00 Brussels`), h('span', { class: 'k-link small', on: { click: () => { log('click', 'Portion of the meeting'); S.modal = { kind: 'notyet', back: 'book' }; draw(); } } }, 'Click here if you only need interpreters for a portion of the meeting')),
      row('Subject matter *', select([['', 'Select the main subject of your meeting'], ...SUBJECTS], b.subject, (v) => { b.subject = v; log('change', `Subject matter: ${v}`); })),
      row('Specific topic for interpreters', h('div', { class: 'k-pick-wrap' }, h('div', { class: 'k-pick open' }, h('div', { class: 'k-pick-chips' }, b.topics.map((t) => h('span', { class: 'k-lchip' }, h('button', { type: 'button', on: { click: () => { b.topics.splice(b.topics.indexOf(t), 1); draw(); } } }, '×'), t)), topicIn)), h('div', { class: 'k-pick-list' }, ...sugg()))),
      row('Additional Cost', h('div', { class: 'k-mini' }, h('p', null, 'A total of ', h('b', null, '2 (two) interpreter-credits'), ' will be deducted from your prepaid bundle. If your balance is running low, we will add any additional credits to your next invoice.'), h('p', null, 'Overtime, cancellation, and change fees apply, as per the Terms and Conditions of Service you signed with KUDO. ISO 23155 recommends at least 2 interpreters per language for meetings longer than 45 minutes.')),
        check(b.agree, 'I agree to this additional non-refundable cost', (v) => { b.agree = v; log('toggle', `Agree to cost: ${v}`); }))],
      [['Cancel', () => { S.modal = null; log('click', 'Booking cancelled'); draw(); }, 'ghost'], ['Complete Booking', () => {
        if (!b.subject) return toastK('Select the subject matter');
        if (!b.agree) return toastK('Tick "I agree to this additional non-refundable cost"');
        m.booked = { subject: b.subject, topics: [...b.topics] }; m.bookState = 'progress'; S.modal = null;
        log('save', `Interpreters booked: ${b.subject}${b.topics.length ? ` (${b.topics.join(', ')})` : ''}`);
        go('interpreters', 'Interpreter Booking');
        setTimeout(() => { m.bookState = 'done'; if (S.screen === 'interpreters' && S.meeting === m) { S.modal = { kind: 'prepask' }; draw(); } }, 1600);
      }]]);
  }
  function withModal(el) {
    const m = S.meeting, k = S.modal?.kind;
    const close = () => { S.modal = null; draw(); };
    const mod = k === 'book' ? bookModal()
      : k === 'cancel' ? modal('Are you sure you want to cancel this meeting?', [h('div', { class: 'k-kv' }, ...[['Meeting title', m.name], ['Start date', `${fmtForm(m.day || TODAY)}, 02:00 PM`], ['End date', `${fmtForm(m.day || TODAY)}, 03:00 PM`], ['Timezone', 'Brussels']].map(([a, v]) => h('div', null, h('b', null, a), h('span', null, v)))),
          h('p', { class: 'k-mini' }, 'Please note that if you invited attendees via a calendar invite or by sharing the meeting link, they will not be notified.'), check(S.modal.notify !== false, 'Notify all users who were added to the meeting in the KUDO interface.', (v) => { S.modal.notify = v; })],
          [['Cancel', close, 'ghost'], ['Cancel meeting', () => { log('trap', 'Meeting cancelled'); F().cancelled = true; m.status = 'canceled'; S.modal = null; go('meetings', 'My meetings', { mtab: 'upcoming' }); toastK('Meeting canceled successfully.'); }]])
      : k === 'prepask' ? modal('', [h('div', { class: 'k-center' }, ic('doc', 30), h('p', null, 'Please add files or links to help interpreters prepare.'))], [['Later', () => { log('click', 'Preparation materials: Later'); close(); }, 'ghost'], ['Add', () => { log('click', 'Preparation materials: Add'); S.modal = { kind: 'notyet' }; draw(); }]])
      : k === 'start' ? modal('Start meeting', [h('p', { class: 'k-mini' }, 'Every attendee can join from now.')], [['Cancel', close, 'ghost'], ['Start meeting', () => { m.status = 'live'; F().started = true; S.modal = null; log('click', 'Start meeting (confirmed)'); toastK('Meeting has been started'); draw(); }]])
      : k === 'starthls' ? modal('Start broadcast', [h('p', { class: 'k-mini' }, 'The session will be broadcasted to all streams.')], [['Cancel', close, 'ghost'], ['Start HLS broadcast', () => { m.bc.live = true; S.modal = null; log('click', 'Start HLS broadcast'); if (m === S.mine) S.flags.hlsStarted = true; toastK('Your HLS broadcast has started.'); draw(); }]])
      : k === 'notyet' ? modal('', [notYetBox()], [['Close', () => { S.modal = S.modal.back ? { kind: S.modal.back } : null; draw(); }, 'ghost']]) : null;
    if (mod) el.append(mod);
    return el;
  }
  function interpretersScreen() {
    const m = S.meeting, b = m.booked;
    const body = !b ? [h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, 'Interpreters ▾')), notYetBox()]
      : [h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, 'Interpreters ▾')), h('h3', { class: 'k-h3' }, 'Interpreter Booking'),
        row('Status', h('div', { class: `k-bstat ${m.bookState}` }, h('div', { class: 'k-bar' }, h('i', { style: `width:${m.bookState === 'done' ? 100 : 70}%` })), h('small', null, m.bookState === 'done' ? 'Booking Completed' : 'Booking in progress...'))),
        h('b', null, 'Summary'), ...[['Title', m.name], ['Date', `${fmtForm(m.day || TODAY)} - ${fmtForm(m.day || TODAY)}`], ['Time', '14:00 - 15:00'], ['Languages', h('span', null, [...m.speakers, ...(m.sign || [])].map((l) => h('span', { class: 'k-lchip' }, l)))], ['Subject Matter', b.subject]].map(([k, v]) => h('div', { class: 'k-def' }, h('span', null, k), h('div', null, v))),
        h('div', { class: 'k-def' }, h('span', null, 'Preparation Materials for Interpreters'), h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Add preparation materials'); S.modal = { kind: 'notyet' }; draw(); } } }, '+ Add preparation materials securely and exclusively for interpreters')),
        h('div', { class: 'k-def' }, h('span', null, 'Interpreters'), h('span', { class: 'k-mini' }, 'Meet your interpreters'))];
    return withModal(page(...body));
  }
  function broadcastScreen() {
    const m = S.meeting; m.bc = m.bc || { hls: false, dur: '4 hours', rtmp: false, live: false };
    const bc = m.bc, live = m.status === 'live';
    const saved = (t) => { toastK(t); setTimeout(() => toastK('Please wait! Refreshing...'), 300); };
    return withModal(page(
      h('div', { class: 'k-rowsp' }, h('b', null, ic('speaker'), ' HLS broadcast'), live && bc.hls ? h('button', { class: `k-link small ${bc.live ? 'k-red' : ''}`, type: 'button', on: { click: () => { if (bc.live) { bc.live = false; log('click', 'Stop broadcast'); draw(); } else { S.modal = { kind: 'starthls' }; log('click', 'Start broadcast'); draw(); } } } }, bc.live ? '■ Stop broadcast' : '▸ Start broadcast') : null),
      row('HLS Stream', toggle(bc.hls, null, (v) => { bc.hls = v; log('toggle', `HLS Stream: ${v}`); if (m === S.mine) S.flags.hls = v; saved('Successful! Broadcast settings saved successfully.'); draw(); }, bc.live || m.status === 'finished')),
      bc.hls && !bc.live ? row('Stream Duration', select(['1 hour', '2 hours', '3 hours', '4 hours', '5 hours', '6 hours', '8 hours', '12 hours'], bc.dur, (v) => { bc.dur = v; log('change', `Stream Duration: ${v}`); saved('Successful! Broadcast settings updated successfully.'); }, 'sm')) : null,
      h('div', { class: 'k-rowsp' }, h('b', null, '≡ RTMP broadcast'), live && bc.rtmp && (bc.streams || []).length ? h('button', { class: `k-link small ${bc.rlive ? 'k-red' : ''}`, type: 'button', on: { click: () => { bc.rlive = !bc.rlive; log('click', bc.rlive ? 'Start RTMP broadcast' : 'Stop RTMP broadcast'); if (bc.rlive && m === S.mine) S.flags.rtmpStarted = true; if (bc.rlive) toastK('Your RTMP broadcast has started.'); draw(); } } }, bc.rlive ? '■ Stop broadcast' : '▸ Start broadcast') : null),
      row('RTMP Stream', toggle(bc.rtmp, null, (v) => { bc.rtmp = v; bc.streams = bc.streams || []; log('toggle', `RTMP Stream: ${v}`); saved('Successful! Broadcast settings updated successfully.'); draw(); }, bc.rlive || m.status === 'finished')),
      bc.rtmp ? h('div', { class: 'k-streams' }, ...(bc.streams || []).map((st, i) => h('div', { class: 'k-stream' }, h('div', { class: 'k-rowsp' }, h('span', null, h('span', { class: 'k-link' }, `RTMP Stream ${i + 1}`), bc.rlive ? h('span', { class: 'k-chip' }, 'BROADCASTING') : null),
          bc.rlive ? null : h('span', { class: 'k-acts' }, iconBtn(ic('edit'), 'Edit stream', () => { S.rf = { ...st, idx: i }; go('rtmp', `Edit RTMP Stream ${i + 1}`); }, 'go'), iconBtn(ic('trash'), 'Delete stream', () => { bc.streams.splice(i, 1); log('click', `Delete RTMP Stream ${i + 1}`); draw(); }, 'stop'))),
        h('div', { class: 'k-kv' }, ...[['Casting Medium', st.medium], ['Server URL', st.url], ['Stream key', st.key]].map(([a, v]) => h('div', null, h('small', null, a), h('span', null, v)))), h('div', { class: 'k-kv' }, h('div', null, h('small', null, 'Stream Language 1'), h('span', null, st.lang.replace(/ \(.*\)$/, '')))))),
        bc.rlive ? null : h('button', { class: 'k-link', type: 'button', on: { click: () => { S.rf = { medium: 'YouTube Live', url: '', key: '', lang: '' }; go('rtmp', 'Add RTMP stream'); } } }, '+ Add RTMP stream')) : null));
  }
  function rtmpScreen() {
    const m = S.meeting, f = S.rf, bc = m.bc;
    const ok = () => f.medium && f.url.trim() && f.key.trim() && f.lang;
    const saveBtn = h('button', { class: 'k-btn', type: 'button', disabled: !ok(), on: { click: () => {
      const st = { medium: f.medium, url: f.url.trim(), key: f.key.trim(), lang: f.lang };
      const others = bc.streams.filter((_, i) => i !== f.idx);
      if (others.some((o) => o.key === st.key)) log('trap', 'Same stream key used for two RTMP streams');
      if (others.some((o) => o.lang === st.lang)) log('trap', `Two RTMP streams for ${st.lang}`);
      if (f.idx != null) bc.streams[f.idx] = st; else bc.streams.push(st);
      log('save', `RTMP stream saved: ${st.medium}, ${st.lang}`); go('broadcast', 'Broadcast'); toastK('Broadcast settings saved successfully.');
    } } }, 'Save');
    const inp = (k, ph) => h('div', { class: 'k-row' }, h('input', { class: 'k-in', placeholder: ph, value: f[k], on: { input: (e) => { f[k] = e.target.value; saveBtn.disabled = !ok(); }, change: (e) => log('input', `${k === 'url' ? 'Server URL' : 'Stream Key'} entered`) } }), pasteSel((t) => { f[k] = t; saveBtn.disabled = !ok(); log('input', `${k === 'url' ? 'Server URL' : 'Stream Key'} pasted`); draw(); }));
    const langs = ['Original audio', ...(m.kind === 'hi' ? m.speakers : m.translations)];
    return page(h('b', null, ic('speaker'), f.idx != null ? ` Edit RTMP Stream ${f.idx + 1}` : ' + Add RTMP Stream'),
      row('Casting Medium *', select(['YouTube Live', 'Facebook Live', 'IBM Video Streaming'], f.medium, (v) => { f.medium = v; log('change', `Casting Medium: ${v}`); })),
      row('Server URL *', inp('url', 'Enter server URL')), row('Stream Key *', inp('key', 'Enter stream key')),
      row('Streamed Language *', select([['', 'Select a language'], ...langs], f.lang, (v) => { f.lang = v; saveBtn.disabled = !ok(); log('change', `Streamed Language: ${v}`); })),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => go('broadcast', 'Cancel RTMP stream') } }, 'Cancel'), saveBtn));
  }
  function editForm() {
    const m = S.meeting; log('click', 'Edit meeting');
    if (m.status === 'finished') return;
    S.form = { day: m.day || TODAY, kind: m.kind, name: m.name, type: m.type, speakers: [...m.speakers], translations: [...m.translations], sign: [...(m.sign || [])], detect: !!m.detect, recording: m.recording, autoRecord: m.autoRecord, hosts: [], external: m.external, platform: m.platform || '', link: m.link || '', force: !!m.force, adv: { ...m.adv }, advOpen: false, prep: m.prep, aiAssist: m.aiAssist };
    go('edit', 'Edit meeting');
  }
  function usersScreen(kind) {
    const m = S.meeting; const list = kind === 'all' ? [...m.participants.map((p) => ({ ...p, type: 'Participant' })), ...m.operators.map((p) => ({ ...p, type: 'Operator' })), ...m.viewers.map((p) => ({ ...p, type: 'Viewer' }))] : kind === 'participants' ? m.participants : kind === 'operators' ? m.operators : m.viewers;
    const label = { all: 'All users', participants: 'Participants', operators: 'Operators', viewers: 'Viewers' }[kind];
    const addLabel = { participants: '+ Add participant', operators: '+ Add operator', viewers: '+ Add viewer' }[kind];
    const email = h('input', { class: 'k-in', placeholder: 'Email', type: 'email' });
    const rows = list.map((p) => h('tr', null, h('td', null, h('input', { type: 'checkbox' })), h('td', null, p.name), h('td', null, p.email),
      h('td', null, p.type && kind === 'all' ? p.type : kind === 'participants' ? (p.role === 'Host' ? h('span', null, 'Participant ', h('span', { class: 'k-chip host' }, 'HOST')) : 'Participant') : label.replace(/s$/, '')), h('td', null, 'Invited | ', h('span', { class: 'k-link' }, 'Resend')),
      h('td', { class: 'k-acts' }, kind === 'participants' && p.role !== 'Host' ? h('button', { class: 'k-ic go', type: 'button', title: 'Make Host', 'aria-label': 'Make Host', on: { click: () => { p.role = 'Host'; log('click', `Make host: ${p.email}`); toastK('New Host appointed successfully'); draw(); } } }, ic('user')) : null,
        h('button', { class: 'k-ic', type: 'button', title: 'Edit', on: { click: () => { log('click', `Edit user ${p.email}`); toastK('User details are managed by the user'); } } }, ic('edit')),
        kind !== 'all' ? h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { log('trap', `Deleted ${label.toLowerCase().replace(/s$/, '')} ${p.email}`); list.splice(list.indexOf(p), 1); draw(); } } }, ic('trash')) : null)));
    const target = kind === 'operators' ? m.operators : kind === 'viewers' ? m.viewers : m.participants;
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' },
      h('div', { class: 'k-cardh' }, h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, `${label} ▾`)), addLabel ? h('div', { class: 'k-row' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.modal = { kind: 'adduser' }; log('click', addLabel); draw(); } } }, addLabel), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('click', 'Import'); toastK('Import from a CSV file: download the template first'); } } }, `Import ${label.toLowerCase()}`)) : null),
      h('input', { class: 'k-in k-search', placeholder: 'Search' }),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['', 'Name', 'Email', 'Role', 'Status', ''].map((x) => h('th', null, x)))), h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, `No ${label.toLowerCase()} added to this meeting. To add one click on the '${addLabel || '+ Add'}' button above. You can simply invite them by the 'Kudo Meeting Links'.`)))), pager(rows.length)), links()),
      S.modal?.kind === 'adduser' ? modal(addLabel.slice(2).replace(/^./, (c) => c.toUpperCase()), [row('Email', email)], [['Close', () => { S.modal = null; draw(); }, 'ghost'], ['Next', () => { const v = email.value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toastK('Enter a valid email'); target.push({ email: v, name: v === HOST ? 'Host Client Demo' : v.split('@')[0], role: kind === 'participants' ? 'Participant' : label.replace(/s$/, ''), via: kind }); log('input', `${label.replace(/s$/, '')} added: ${v}`); S.modal = null; toastK('Successful! User added successfully'); draw(); }]]) : null);
  }
  // Polls: list, add, details with rights, weight and advanced settings
  function pollsScreen() {
    const m = S.meeting;
    return page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Polls'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.pf = { title: '', q: '', type: 'mc', n: 2, sel: 1, min: 1, answers: ['', ''], results: 'nominative' }; go('poll-new', 'Add poll'); } } }, '+ Add poll')),
      h('input', { class: 'k-in k-search', placeholder: 'Search' }),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Poll title', 'Participant polling rights', 'Status', ''].map((x) => h('th', null, x)))),
        h('tbody', null, m.polls.length ? m.polls.map((p) => h('tr', null, h('td', null, h('button', { class: 'k-link', type: 'button', on: { click: () => go('poll', `Open poll ${p.title}`, { poll: p, ptab: 'details' }) } }, p.title)), h('td', null, h('span', { class: 'k-link' }, 'Set List as Default')), h('td', null, h('span', { class: 'k-chip' }, p.status)),
          h('td', { class: 'k-acts' }, h('button', { class: 'k-ic', type: 'button', title: 'Edit', on: { click: () => go('poll', `Open poll ${p.title}`, { poll: p, ptab: 'details' }) } }, ic('edit')), h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { m.polls.splice(m.polls.indexOf(p), 1); log('click', 'Delete poll'); draw(); } } }, ic('trash')))))
          : h('tr', null, h('td', { colspan: 4, class: 'k-empty' }, "No polling added to this meeting. To add polling click on the '+ Add poll' button above.")))), pager(m.polls.length));
  }
  function pollNewScreen() {
    const p = S.pf, parl = p.type === 'parl';
    const answers = parl ? ['Yes', 'No', 'Abstain'] : p.answers;
    return page(h('b', null, ic('doc'), ' Add poll'),
      row('Title *', h('input', { class: 'k-in', placeholder: 'Title of the poll', value: p.title, on: { input: (e) => { p.title = e.target.value; } } }), h('small', { class: 'k-mini' }, `${240 - p.title.length} characters remaining`)),
      row('Question *', h('input', { class: 'k-in', placeholder: 'Question', value: p.q, on: { input: (e) => { p.q = e.target.value; } } })),
      row('Type of poll *', radio('ptype', [['mc', 'Multiple Choice'], ['parl', 'Parliamentary']], p.type, set(p, 'type', 'Type of poll'))),
      parl ? null : row('Number of answers', select([2, 3, 4, 5, 6, 7, 8, 9, 10], p.n, (v) => { p.n = Number(v); while (p.answers.length < p.n) p.answers.push(''); p.answers.length = p.n; log('change', `Number of answers: ${v}`); draw(); })),
      parl ? null : row('Number of options can be selected', select(Array.from({ length: p.n }, (_, i) => [i + 1, `${i + 1} option${i ? 's' : ''} can be selected`]), p.sel, set(p, 'sel', 'Options can be selected'))),
      parl ? null : row('Minimum number of options to be selected', select(Array.from({ length: p.n }, (_, i) => [i + 1, `${i + 1} option${i ? 's' : ''} should be selected`]), p.min, set(p, 'min', 'Minimum options'))),
      ...answers.map((a, i) => row(`Answer ${i + 1}`, h('input', { class: 'k-in', placeholder: `Answer ${i + 1}`, value: a, disabled: parl, on: { input: (e) => { p.answers[i] = e.target.value; } } }))),
      parl ? row('Results', radio('pres', [['ballot', 'Ballot (anonymous)'], ['nominative', 'Nominative (identifiable vote)']], p.results, set(p, 'results', 'Results')), h('small', { class: 'k-mini' }, 'You are responsible for collecting participants’ consent and to make use of these personally identifiable data in compliance with applicable data protection and privacy laws.')) : null,
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => go('polls', 'Cancel poll') } }, 'Cancel'), h('button', { class: 'k-btn', type: 'button', on: { click: () => {
        if (!p.title.trim() || !p.q.trim()) return toastK('Title and question are required');
        if (!parl && p.answers.some((x) => !x.trim())) return toastK('Fill in every answer');
        const poll = { title: p.title.trim(), q: p.q.trim(), type: parl ? 'Parliamentary' : 'Multiple Choice', sel: parl ? 1 : p.sel, min: parl ? 1 : p.min, answers: [...answers], status: 'POLL CREATED', rights: 'all', selected: new Set(), weights: {}, control: { client: true, operator: true, host: true }, exp: 'yes', timed: 'no', time: '01:00' };
        S.meeting.polls.push(poll); log('save', `Poll created: ${poll.title}`); toastK('Poll has been created'); go('poll', `Open poll ${poll.title}`, { poll, ptab: 'details' });
      } } }, 'Save')));
  }
  function pollScreen() {
    const p = S.poll, m = S.meeting;
    const nav = [['details', 'Poll Details'], ['rights', 'Polling Rights'], ['weight', 'Polling Weight'], ['adv', 'Advanced Settings']];
    const body = { details: () => h('div', null, ...[['Question', p.q], ['Type', p.type], ['Number of options can be selected', p.sel], ['Minimum number of options to be selected', p.min], ['Status', h('span', { class: 'k-chip' }, p.status)], ['Answers', h('div', null, p.answers.map((a, i) => h('div', null, h('span', { class: 'k-link' }, `Option ${i + 1}: `), a)))]].map(([k, v]) => h('div', { class: 'k-def' }, h('span', null, k), h('div', null, v))),
        h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { if (m.status !== 'live') return toastK('The vote can start once the meeting has started'); p.status = 'VOTING'; log('click', 'Start vote'); draw(); } } }, 'Start vote')),
      rights: () => h('div', null, row('Polling Rights', radio('rights', [['all', 'All Participants'], ['sel', 'Selected Participants']], p.rights, (v) => { p.rights = v; log('change', `Polling rights: ${v}`); toastK('Polling rights has been updated'); draw(); })),
        p.rights === 'all' ? h('div', { class: 'k-note' }, h('b', null, 'All Participants: '), 'Everyone who is in the meeting can attend in this poll')
          : h('div', null, h('div', { class: 'k-note' }, h('b', null, 'Selected Participants: '), 'You can select from the participants who are added or joined to the meeting. To add more participants go to the Users tab.'), h('div', { class: 'k-rowsp' }, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('span', { class: 'k-link' }, '⟳ Refresh List')), h('b', null, 'All Participant List'),
            h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Unselect all', 'Name', 'Email', 'Status'].map((x) => h('th', null, x)))), h('tbody', null, m.participants.length ? m.participants.map((u) => h('tr', null, h('td', null, h('input', { type: 'checkbox', checked: p.selected.has(u.email), on: { change: (e) => { if (e.target.checked) p.selected.add(u.email); else p.selected.delete(u.email); log('change', `Polling right ${u.email}: ${e.target.checked}`); } } })), h('td', null, u.name), h('td', null, u.email), h('td', null, 'Invited'))) : h('tr', null, h('td', { colspan: 4, class: 'k-empty' }, 'No participant added yet')))), h('span', { class: 'k-link' }, 'Set List as Default'))),
      weight: () => h('div', null, h('div', { class: 'k-note' }, 'You can assign polling weight to participants who have the polling rights.  ', h('span', { class: 'k-link' }, '⟳ Refresh List')),
        h('div', { class: 'k-grid2' }, h('div', null, h('div', { class: 'k-rowsp' }, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('span', { class: 'k-link' }, 'Reset')), h('small', { class: 'k-mini' }, 'Added Participants'), ...m.participants.map((u) => h('div', { class: 'k-rowsp' }, h('b', null, u.name), select(Array.from({ length: 10 }, (_, i) => i + 1), p.weights[u.email] || 1, (v) => { p.weights[u.email] = Number(v); log('change', `Polling weight ${u.email}: ${v}`); toastK('Polling weight has been updated'); }, 'sm')))),
          h('div', null, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('small', { class: 'k-mini' }, 'Joined Participants'), h('p', { class: 'k-mini' }, 'The list of joined participants will be available once the meeting starts')))),
      adv: () => h('div', null, row(h('span', null, 'Poll Control', h('small', { class: 'k-mini', style: 'display:block' }, 'Define who can manage the vote (start, stop, publish results)')), check(true, 'Client', () => {}, true), check(p.control.operator, 'Operator', (v) => { p.control.operator = v; log('change', `Poll control operator: ${v}`); toastK('Poll control has been updated'); }), check(p.control.host, 'Host(s)', (v) => { p.control.host = v; log('change', `Poll control host: ${v}`); toastK('Poll control has been updated'); })),
        row(h('span', null, 'Poll Export', h('small', { class: 'k-mini', style: 'display:block' }, 'Select Yes to have the ability to export poll responses with names in the Poll details after the Poll starts and in the reports after the meeting ends.')), radio('pexp', [['yes', 'Yes'], ['no', 'No']], p.exp, (v) => { p.exp = v; log('change', `Poll export: ${v}`); toastK('Poll has been updated'); draw(); })),
        row(h('span', null, 'Predefined Poll Time', h('small', { class: 'k-mini', style: 'display:block' }, 'This poll will be available to vote within the time assigned.')), radio('ptime', [['yes', 'Yes'], ['no', 'No']], p.timed, (v) => { p.timed = v; log('change', `Predefined poll time: ${v}`); toastK('Poll has been updated'); draw(); }), h('input', { class: 'k-in sm', value: p.time, disabled: p.timed !== 'yes', on: { change: (e) => { p.time = e.target.value; log('change', `Poll time: ${e.target.value}`); } } }))) }[S.ptab]();
    return shell(tabs(), h('section', { class: 'k-card' }, h('div', { class: 'k-rowsp' }, h('button', { class: 'k-link', type: 'button', on: { click: () => go('polls', 'Back to polls list') } }, '‹ Back to polls list'), h('div', { class: 'k-acts' }, iconBtn(ic('edit'), 'Edit poll', () => log('click', 'Edit poll'), 'go'), iconBtn(ic('trash'), 'Delete poll', () => { m.polls.splice(m.polls.indexOf(p), 1); log('click', 'Delete poll'); go('polls', 'Poll deleted'); }, 'stop'))),
      h('h3', { class: 'k-h3' }, p.title), h('div', { class: 'k-pollgrid' }, h('nav', { class: 'k-pollnav' }, nav.map(([k, l]) => h('button', { class: S.ptab === k ? 'on' : '', type: 'button', on: { click: () => { S.ptab = k; log('nav', `Poll: ${l}`); draw(); } } }, l))), body)));
  }
  function filesScreen() {
    const m = S.meeting;
    const SAMPLE = [['Agenda.pdf', 'PDF', '214 KB'], ['Speaker list.docx', 'DOCX', '38 KB'], ['Slides.pptx', 'PPTX', '4.2 MB']];
    return page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Files'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.modal = { kind: 'file', pick: SAMPLE[0][0], acc: 'All' }; log('click', '+ Add files'); draw(); } } }, '+ Add files')),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['File name', 'Content type', 'Accessibility', 'File size', 'Actions'].map((x) => h('th', null, x)))),
        h('tbody', null, m.files.length ? m.files.map((f) => h('tr', null, h('td', null, f.name), h('td', null, f.type), h('td', null, f.acc), h('td', null, f.size), h('td', { class: 'k-acts' }, h('span', { class: 'k-ic go' }, ic('dl', 14)), h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { m.files.splice(m.files.indexOf(f), 1); log('click', 'Delete file'); draw(); } } }, ic('trash')))))
          : h('tr', null, h('td', { colspan: 5, class: 'k-empty' }, 'No files added to this meeting.')))), pager(m.files.length),
      S.modal?.kind === 'file' ? modal('Add files', [row('File', select(SAMPLE.map((x) => x[0]), S.modal.pick, (v) => { S.modal.pick = v; }), h('small', { class: 'k-mini' }, 'Sandbox: pick one of the sample files')), row('Accessible to', select(['All', 'Participants', 'Interpreters'], S.modal.acc, (v) => { S.modal.acc = v; }))],
        [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['Upload', () => { const s = SAMPLE.find((x) => x[0] === S.modal.pick); m.files.push({ name: s[0].replace(/\.[^.]+$/, ''), type: s[1], size: s[2], acc: S.modal.acc }); log('save', `File uploaded: ${s[0]} (${S.modal.acc})`); S.modal = null; toastK('File uploaded successfully'); draw(); }]]) : null);
  }
  function messagesScreen() { return page(h('b', null, ic('doc'), ' Messages'), h('p', { class: 'k-mini' }, 'Messages exchanged in the meeting chat appear here.'), h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['From', 'Message', 'Time'].map((x) => h('th', null, x)))), h('tbody', null, h('tr', null, h('td', { colspan: 3, class: 'k-empty' }, 'No messages yet.'))))); }
  function recordingsScreen() {
    const m = S.meeting; const done = m.status === 'finished' && m.recording && m.autoRecord && m.kind !== 'hi' && !(m === S.mine && S.flags.cancelled);
    const files = done ? ['Original Audio', ...m.translations] : [];
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, h('b', null, ic('doc'), ' Recordings & Transcripts'),
      h('p', { class: 'k-mini' }, 'If you choose to record your meeting, your recording and transcripts will be stored in the KUDO cloud for 30 days before being automatically deleted. You can download them at any time during this period.'),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['ID', 'Meeting Title', 'Start Date and Time', 'End Date and Time', 'Time Zone', 'Action'].map((x) => h('th', null, x)))),
        h('tbody', null, done ? h('tr', null, h('td', null, '1'), h('td', null, m.name), h('td', null, `${dOf(m).date} ${dOf(m).time.split(' - ')[0]}`), h('td', null, `${dOf(m).date} ${dOf(m).time.split(' - ')[1]}`), h('td', null, 'Europe/Brussels'), h('td', null, h('button', { class: 'k-ic go', type: 'button', title: 'Download', on: { click: () => { S.modal = { kind: 'dl' }; F().foundRecording = true; log('click', 'Download recordings'); draw(); } } }, ic('dl'))))
          : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, 'No recordings available of this meeting.')))),
      done ? h('p', { class: 'k-mini' }, 'Sandbox time is fast-forwarded: in reality recordings appear 15 to 20 minutes after the meeting ends.') : null), links()),
    S.modal?.kind === 'dl' ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Download Recordings & Transcripts'), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')),
      h('p', { class: 'k-mini' }, 'For videos with captioning we recommend to use VLC media player'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => log('click', 'Download all (zip)') } }, ic('dl'), ' Download Recordings & Transcripts'),
      h('table', { class: 'k-tbl' }, h('tbody', null, files.map((l) => h('tr', null, h('td', null, h('b', null, l)), h('td', null, '1.2 MB'), h('td', { class: 'k-acts' }, h('span', { class: 'k-ic go' }, ic('play', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14))))))))) : null);
  }
  function avScreen() {
    const v = S.meeting.av;
    return page(h('b', null, ic('doc'), ' AV configurations'), h('b', { class: 'k-subh' }, 'Participant/Speaker'),
      row('Video resolution', select(['Auto (adaptive)', 'High definition (1280×720)', 'Standard definition (640×480)', 'Low definition (320×240)'], v.res, (x) => { v.res = x; log('change', `Video resolution: ${x}`); })),
      row('Frame rate', select(['Auto (adaptive)', '15', '24', '30'], v.fps, (x) => { v.fps = x; log('change', `Frame rate: ${x}`); })),
      row('Audio bitrate', select(['Auto (adaptive)', 'Narrowband (8-12 kbps)', 'Wideband (16-20 kbps)', 'Fullband (28-40 kbps)', 'Fullband (48-64 kbps)'], v.bitrate, (x) => { v.bitrate = x; log('change', `Audio bitrate: ${x}`); })),
      row('Stereo sound', toggle(v.stereo, null, set(v, 'stereo', 'Stereo sound'))),
      row('Audio level', h('input', { type: 'range', min: 0, max: 100, value: v.level, class: 'k-range', on: { change: (e) => { v.level = Number(e.target.value); log('change', `Audio level: ${e.target.value}`); } } })),
      row('Audio processing *', toggle(v.processing, null, set(v, 'processing', 'Audio processing')), h('small', { class: 'k-mini' }, '* Echo cancellation, Automatic gain control, Noise suppression (Default is ON)')),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('save', 'AV configurations updated'); toastK('AV configurations updated'); } } }, 'Update')));
  }
  function featuresScreen() {
    const ft = S.meeting.features, locked = S.meeting.status !== 'scheduled';
    const t = (k, label) => h('div', { class: 'k-rowsp k-feat' }, h('span', null, label), toggle(ft[k], null, set(ft, k, label), locked));
    return page(h('b', null, ic('lock'), ' Meeting features'), h('div', { class: 'k-warn strong' }, "You can't enable these after the meeting starts. Once enabled, they can't be turned off."),
      row('Lobby (waiting room)', check(ft.lobby, 'Enable Lobby (waiting room)', set(ft, 'lobby', 'Enable lobby'), locked), h('div', { class: 'k-sub' }, check(ft.lobbyP, 'Lobby for participants/speakers', set(ft, 'lobbyP', 'Lobby for participants/speakers'), locked || !ft.lobby), check(ft.lobbyV, 'Lobby for viewers-only', set(ft, 'lobbyV', 'Lobby for viewers-only'), locked || !ft.lobby))),
      row('Available features for participant/speaker', t('users', 'Active user list'), t('docs', 'Documents'), t('msg', 'Messaging'), t('polls', 'Polls'), t('request', 'Request list'), t('share', 'Screen share')),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('save', 'Meeting features saved'); toastK('Meeting features updated'); } } }, 'Save')));
  }
  function mGlossariesScreen() {
    const g = S.modal?.kind === 'gconfirm' ? S.modal : null;
    return shell(tabs(), h('section', { class: 'k-card' }, ...glossaryTable(true)),
      g ? modal(g.def ? 'Confirm default glossary change' : 'Confirm glossary change', [h('p', null, g.def ? 'Set this as your default glossary for all meetings?' : 'Use this glossary for this meeting?')], [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['OK', () => { if (g.def) { S.glossaries.forEach((x) => { x.def = x === g.g; }); log('change', `Default glossary: ${g.g.name}`); } else { S.meeting.glossary = g.g.name; log('change', `Glossary for this meeting: ${g.g.name}`); } S.modal = null; toastK('Glossary updated'); draw(); }]]) : null);
  }
  // Meeting statistics (finished meetings): the report, as in the client portal.
  function statsScreen() {
    const m = S.meeting, mine = m === S.mine;
    const mins = mine ? Math.max(1, Math.round((Date.now() - S.t0) / 60000)) : ({ '30 minutes': 30, '1 hour': 58, '2 hours': 117, '3 hours': 176, '4 hours 55 minutes': 291 })[m.dur] || 60;
    const langs = m.kind === 'hi' ? m.speakers : m.translations;
    const users = m.participants.length + m.operators.length + m.viewers.length + 1;
    const tile = (k, icn, v, sub) => h('div', { class: 'k-tile' }, h('small', null, k), h('div', null, h('span', { class: 'k-tile-ic' }, ic(icn, 15)), h('b', null, String(v)), sub ? h('small', { class: 'k-mini' }, ` ${sub}`) : null));
    const bars = (labels) => h('div', { class: 'k-chart' }, svg(`<svg viewBox="0 0 220 120" width="100%" height="120"><g stroke="var(--mock-e5e5e5)">${[20, 45, 70, 95].map((y) => `<line x1="24" x2="215" y1="${y}" y2="${y}"/>`).join('')}</g>${labels.map((l, i, a) => { const w = 150 / a.length; const x = 40 + i * (180 / a.length); return `<rect x="${x}" y="${20 + (i * 17) % 40}" width="${w}" height="${75 - (i * 17) % 40}" fill="var(--mock-14a88a)"/><text x="${x + w / 2}" y="112" font-size="8" text-anchor="middle" fill="var(--c-555555)">${l}</text>`; }).join('')}</svg>`));
    const pie = () => h('div', { class: 'k-chart' }, svg('<svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="55" r="45" fill="var(--mock-14a88a)"/><line x1="60" y1="10" x2="60" y2="55" stroke="var(--white)"/><text x="60" y="115" font-size="9" text-anchor="middle" fill="var(--c-555555)">participant</text></svg>'));
    const map = () => h('div', { class: 'k-chart k-map' }, svg('<svg viewBox="0 0 220 110" width="100%" height="110"><g fill="var(--mock-e3e6ea)"><ellipse cx="55" cy="40" rx="38" ry="22"/><ellipse cx="70" cy="82" rx="16" ry="22"/><ellipse cx="118" cy="38" rx="20" ry="16"/><ellipse cx="122" cy="76" rx="18" ry="24"/><ellipse cx="170" cy="42" rx="40" ry="24"/><ellipse cx="190" cy="90" rx="16" ry="10"/></g><circle cx="114" cy="36" r="3.5" fill="var(--mock-2c6e9b)"/></svg>'));
    const panel = (t, d, body) => h('div', { class: 'k-panel k-stat' }, h('b', null, t), h('small', { class: 'k-mini' }, d), body);
    const none = () => h('div', { class: 'k-none' }, ic('help', 18), h('b', null, 'No viewer data'));
    const lang = S.rtab === 'languages';
    return shell(tabs(), h('section', { class: 'k-card' },
      h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Report'), iconBtn(ic('dl'), 'Print report', () => { log('click', 'Print report'); toastK("The browser's print window opens: save it as a PDF"); })),
      h('div', { class: 'k-report' },
        h('div', null, h('nav', { class: 'k-tabs' }, ...[['details', 'Details'], ['languages', 'Languages']].map(([k, l]) => h('button', { class: `k-tab ${(S.rtab || 'details') === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.rtab = k; log('nav', `Report: ${l}`); draw(); } } }, l))),
          lang ? h('div', { class: 'k-rdet' }, h('small', { class: 'k-mini' }, m.kind === 'hi' ? 'Human interpretation' : 'Powered by KUDO AI'), h('ol', null, langs.map((l) => h('li', null, l))))
            : h('div', { class: 'k-rdet' }, ...[['Meeting Name', m.name], ['Description', '-'], ['Created By', 'Demo NDK'], ['Scheduled Date', dOf(m).date], ['Timezone', 'Brussels']].map(([k, v]) => h('div', null, h('small', null, k), h('div', null, v))))),
        h('div', { class: 'k-tiles' }, tile('Duration', 'clock', mins, 'minutes'), tile('Languages', 'lang', langs.length), tile('Users', 'users', users), tile('Polls', 'doc', m.polls.length), tile('Documents', 'doc', m.files.length), tile('Participants', 'user', m.participants.length))),
      h('h4', { class: 'k-subh' }, 'Attendees Details'), h('small', { class: 'k-mini' }, 'This section provides insights into the users who actively participated in the meeting such as Participants and Hosts.'),
      h('div', { class: 'k-grid3' }, panel('User Statistics', 'Overview of the Roles distribution.', pie()), panel('Browser Details', 'Web browser used by participants and hosts.', bars(['Chrome', 'Edge'])), panel('Operating Systems', 'Operating systems used by participants and hosts.', bars(['Windows', 'macOS']))),
      h('div', { class: 'k-grid2' }, panel('Regional Statistics', 'Geographical distribution of the people connected to the meeting.', map()), panel('Language Statistics', 'Languages used by participants and hosts based on the number of individuals that selected each language. Note that a single user could have selected multiple languages.', bars(['Floor', ...langs.slice(0, 2).map((l) => l.replace(/ \(.*\)$/, ''))]))),
      h('h4', { class: 'k-subh' }, 'Audience Details'), h('small', { class: 'k-mini' }, 'This section provides insights into the users who passively followed the meeting such as Viewers.'),
      h('div', { class: 'k-grid2' }, panel('Browser Details', 'Web browser used by viewers.', none()), panel('Operating Systems', 'Operating systems used by viewers.', none()), panel('Regional Statistics', 'Geographical distribution of the people connected to the meeting.', none()), panel('Language Statistics', 'Languages used by viewers based on the number of individuals that selected each language. Note that a single user could have selected multiple languages.', none()))));
  }

  // ---------------------------------------------------------------- hints, scoring, report
  const evd = (re) => S.events.some((e) => re.test(e.what || ''));
  const named = (m, n) => !!m && m.name.toLowerCase().includes(n.toLowerCase());
  const aiLangs = (m) => m && m.speakers.length === 1 && m.speakers[0] === 'English' && m.translations.some(fr) && m.translations.some(de);
  // One scoring for the three video-meeting platforms: the platform's own settings (from VM), then KUDO, then the day.
  function vmRules() {
    const want = sc.want; // { name, label, time, langs: [[test, name]...] }
    const ok = (l) => ['English (US)', 'English (UK)'].includes(l) || want.langs.some(([t]) => t(l));
    return {
      next() {
        const x = S.vm.meet, m = S.mine, app = PL.app;
        if (!x) return `${app} tab: schedule "${want.label}", today ${want.time}, for 1 hour.`;
        if (!S.vm.ended && PL.bad(x)) return `${app}: ${PL.fix}`;
        if (!S.clip.some((c) => c.kind === 'vm-link')) return 'Copy the join link from the invitation ("Copy link").';
        if (!m) return `KUDO portal: New meeting, AI speech translation meeting, with the same name as in the ${app.toLowerCase()}.`;
        if (!m.force && m.status === 'scheduled') return 'Edit the KUDO meeting: tick "Force close meeting" so KUDO ends with the client\'s meeting.';
        if (!linked(m, x)) return m.external ? `The KUDO meeting must point at the client's meeting: platform ${PL.kudo} and the join link only (not the whole invitation). The External meeting switch is locked once created: create the meeting again.` : `Create the KUDO meeting with "External meeting" on: platform ${PL.kudo}, paste the join link. The switch is locked once the meeting is created.`;
        if (!m.autoRecord && m.status === 'scheduled') return 'Edit meeting: tick "Automatically record this meeting when it starts".';
        if (!S.vm.ended && S.vm.mode !== 'live') return `${app}: start the meeting. The KUDO meeting starts by itself with it.`;
        if (!S.vm.ended && S.vm.bot === 'waiting') return 'The KUDO AI Translator bot is at the door: Admit it.';
        if (!S.vm.ended && S.vm.bot === 'request') return 'Approve the bot\'s recording request: without it the bot hears nothing.';
        if (!S.vm.ended && S.vm.bot === 'denied') return 'The bot was turned away: KUDO Overview, "Add bot", then let it in this time.';
        if (!S.vm.ended && !S.flags.sawBotChat) return 'Open the Chat: the bot posted the Mobile Link for attendees.';
        if (!S.vm.ended) return 'The meeting is over: End it for all.';
        if (m.status === 'live') return 'KUDO stays open for the 1-hour grace period (no Force close): End meeting on the KUDO Overview.';
        if (!S.flags.foundRecording) return 'KUDO portal: open the meeting, Content, Recordings & transcripts, then Download.';
        return null;
      },
      checks(m) {
        const x = S.vm.meet, own = !!S.mine, extra = m.translations.filter((l) => !ok(l));
        return [
          [`Meeting scheduled: "${want.label}", today ${want.time}, 1 hour`, !!x && x.topic.toLowerCase().includes(want.name) && x.time === want.time && x.dur === '1 hour', 8],
          ...PL.checks(x),
          ['AI speech & captions meeting with the same name', own && m.kind === 'ai' && m.type === 'speech' && named(S.mine, want.name), 8],
          [`English speaker, ${want.langs.map((l) => l[1]).join(' and ')} translation, nothing extra`, own && m.speakers.length === 1 && m.speakers[0] === 'English' && want.langs.every(([t]) => m.translations.some(t)) && !extra.length, 8],
          ['"Force close meeting" ticked', own && !!m.force, 8],
          [`External meeting on, platform ${PL.kudo}`, own && m.external && m.platform === PL.kudo, 8],
          ['The join link pasted in KUDO', own && linked(m, x), 8],
          ['Automatic recording on', own && !!m.autoRecord && !!m.recording, 6],
          [PL.record ? 'Bot let in and its recording request approved' : 'Bot let in', !!S.flags.botIn, 10],
          ['Checked the Mobile Link the bot posted in the chat', !!S.flags.sawBotChat, 4],
          ['Meeting ended and KUDO closed', !!S.flags.vmEnded && own && m.status === 'finished', 4],
          ['Recordings downloaded from KUDO (Content, Recordings & transcripts)', !!S.flags.foundRecording, 6],
        ];
      },
      traps() {
        const t = [], F = S.flags, mn = S.mine;
        PL.traps(S.vm.meet, F).forEach((x) => x && t.push(x));
        if (mn?.external && mn.platform && mn.platform !== PL.kudo) t.push([`Chose ${mn.platform} as the meeting platform: the client is on ${PL.kudo}`, 5]);
        if (/\n/.test(mn?.link || '')) t.push(['Pasted the whole invitation in Meeting link: KUDO needs the join link only', 4]);
        if (F.botDenied) t.push(['Turned the bot away: it cannot translate until it is let in', 4]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        return t; },
    };
  }
  const RULES = {
    'platform-1': {
      next() {
        const m = S.mine, host = m?.participants.find((p) => p.email === HOST && p.role === 'Host');
        if (!m) return 'Create the meeting: New meeting, then AI speech translation.';
        if (m.kind !== 'ai') return 'This meeting is not an AI speech translation meeting: the client wants AI Translation.';
        if (!host) return m.participants.some((p) => p.email === HOST) ? 'The person is a participant, not the Host yet: Users, Participants, then Make Host on their row.' : 'Add the Host: Users, Participants, + Add participant.';
        if (!m.autoRecord) return 'The meeting must record itself: Edit meeting, Recording and transcript, tick "Automatically record this meeting when it starts". Do it before you start.';
        if (m.status === 'scheduled') return 'Start the meeting from the Overview.';
        if (m.status === 'live' && !(S.flags.liveAdded || []).some(es)) return 'Add Spanish while it is live: Edit meeting, translation languages, Update.';
        if (m.status === 'live' && m.pendingRestart) return 'The new language needs the translation service restarted: the circular arrow on the Overview.';
        if (m.status === 'live') return 'End the meeting from the Overview.';
        if (!S.flags.foundRecording) return 'Find the recordings: Content, Recordings & transcripts, then Download.';
        return null;
      },
      checks(m, F) {
        const host = m.participants.find((p) => p.email === HOST && p.role === 'Host');
        const extra = m.translations.filter((l) => !['English (US)', 'English (UK)'].includes(l) && !fr(l) && !de(l) && !es(l));
        return [
          ['AI speech & captions meeting created', !!S.mine && m.kind === 'ai' && m.type === 'speech', 8],
          [`Named "${NAME}"`, named(S.mine, 'quarterly partner update'), 4],
          ['English as the only speaker language', m.speakers.length === 1 && m.speakers[0] === 'English', 8],
          ['French and German as translation languages, nothing extra', m.translations.some(fr) && m.translations.some(de) && !extra.length, 8],
          ['Automatic recording on before the start', !!m.autoRecord && !!m.recording, 10],
          [`${HOST} is the Host`, !!host, 10],
          ['Meeting started', !!F.started && !F.cancelled, 6],
          ['Spanish added while live', (F.liveAdded || []).some(es), 12],
          ['Translation service restarted after adding Spanish', !!F.restarted, 12],
          ['Meeting ended after Spanish was added', !!F.ended && !F.endedBeforeSpanish, 6],
          ['Recordings found in Content, Recordings & transcripts', !!F.foundRecording, 16],
        ];
      },
      traps(m, F) {
        const t = [];
        if (F.endedBeforeSpanish && F.ended) t.push(['Ended the meeting before adding Spanish: an AI meeting cannot be restarted', 10]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        if ((F.addedBeforeStart || []).some(es)) t.push(['Added Spanish before the start, not while live', 4]);
        if (F['locked_Speaker language']) t.push(['Tried to change the speaker language while live (locked)', 3]);
        if ((F.removed || []).length) t.push([`Removed a language (${F.removed.join(', ')})`, 4]);
        if (F.restartNoChange) t.push(['Restarted the translation service with nothing to apply', 2]);
        if (S.events.some((e) => e.type === 'trap' && /Deleted/.test(e.what))) t.push(['Deleted a user from the meeting', 3]);
        return t;
      },
    },
    'hi-1': {
      next() {
        const m = S.mine;
        if (!m || m.kind !== 'hi') return 'Create the meeting: New meeting, then Human interpretation.';
        if (m.day !== '2026-11-30') return 'The meeting must be on Monday 30 November: Edit meeting, click the start date and pick 30 in the calendar, Update.';
        if (!m.booked) return 'Book the interpreters: the Book Interpreters button on the Overview.';
        if (!evd(/preparation materials/i)) return 'Open the place for the agenda and slides: "Add preparation materials" (on the booking page or the Overview).';
        return null;
      },
      checks(m, F) {
        const b = m.booked || {};
        return [
          ['Human interpretation meeting created', !!S.mine && m.kind === 'hi', 10],
          ['Named "Board Meeting"', named(S.mine, 'board meeting'), 4],
          ['English and French as spoken languages, nothing extra', m.speakers.length === 2 && m.speakers.includes('English') && m.speakers.includes('French'), 10],
          ['Scheduled on Monday 30 November 2026', m.day === '2026-11-30', 12],
          ['Interpreters booked', !!m.booked, 20],
          ['Subject matter Banking / Finance', b.subject === 'Banking / Finance', 10],
          ['Topic "Annual results" given to the interpreters', (b.topics || []).some((t) => /annual results/i.test(t)), 8],
          ['Meeting kept scheduled (not started or cancelled)', !!S.mine && m.status === 'scheduled', 8],
          ['Found where to add preparation materials', evd(/preparation materials/i), 18],
        ];
      },
      traps(m, F) {
        const t = [];
        if ((F.created || []).includes('ai')) t.push(['Created an AI meeting: interpreters are booked on Human interpretation meetings', 5]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        if (F.started) t.push(['Started the meeting days before it takes place', 6]);
        return t;
      },
    },
    'rtmp-1': {
      next() {
        const m = S.mine, st = m?.bc?.streams || [], keys = S.studio.keys.map((k) => k.key);
        if (!m || m.kind !== 'ai') return 'Create the meeting: New meeting, then AI speech translation.';
        if (S.studio.keys.length < 3) return 'In the Video studio tab, create one stream key per language (+ Create stream key): French, then German.';
        if (!m.bc?.rtmp) return 'In KUDO, turn RTMP on: Settings, Broadcast, RTMP Stream.';
        if (!st.some((x) => fr(x.lang) && keys.includes(x.key))) return 'Add the French stream: + Add RTMP stream, YouTube Live, paste the studio\'s stream URL and the French key, French.';
        if (!st.some((x) => de(x.lang) && keys.includes(x.key))) return 'Add the German stream with the German key from the studio.';
        if (m.status !== 'live') return 'Start the meeting from the Overview first: the broadcast can only start once the meeting runs.';
        if (!m.bc.rlive) return 'Start the broadcast: Settings, Broadcast, Start broadcast (RTMP).';
        if ((S.flags.studioSaw?.size || 0) < 2) return 'Check in the Video studio that each stream key shows LIVE (switch the stream key to see each one).';
        return null;
      },
      checks(m, F) {
        const st = m.bc?.streams || [], keys = S.studio.keys.slice(1).map((k) => k.key), URLOK = (x) => x.url.replace(/\/+$/, '') === S.studio.url && x.medium === 'YouTube Live';
        const frS = st.find((x) => fr(x.lang)), deS = st.find((x) => de(x.lang));
        return [
          ['AI speech & captions meeting "Product Day"', !!S.mine && m.kind === 'ai' && m.type === 'speech' && named(S.mine, 'product day'), 6],
          ['English speaker language; French and German translation', aiLangs(m), 6],
          ['A stream key created in the studio for each language', keys.length >= 2, 10],
          ['RTMP Stream on', !!m.bc?.rtmp, 6],
          ['French stream: YouTube Live, the studio URL and a studio key', !!frS && URLOK(frS) && S.studio.keys.some((k) => k.key === frS.key), 14],
          ['German stream: YouTube Live, the studio URL and a studio key', !!deS && URLOK(deS) && S.studio.keys.some((k) => k.key === deS.key), 14],
          ['One stream per language, each with its own key', st.length === 2 && new Set(st.map((x) => x.key)).size === 2, 8],
          ['Meeting started', !!F.started && !F.cancelled, 10],
          ['RTMP broadcast started', !!F.rtmpStarted, 14],
          ['Checked in the studio that both streams are live', (F.studioSaw?.size || 0) >= 2, 12],
        ];
      },
      traps(m, F) {
        const t = [], st = m.bc?.streams || [];
        if (evd(/Same stream key/)) t.push(['Used one stream key for two streams: it interrupts both', 6]);
        if (st.some((x) => !S.studio.keys.some((k) => k.key === x.key))) t.push(['Typed a stream key that does not exist in the studio', 5]);
        if (m.bc?.hls) t.push(['Turned HLS on: the client asked for YouTube (RTMP)', 3]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        if (F.ended) t.push(['Ended the meeting', 8]);
        return t;
      },
    },
    'hls-1': {
      next() {
        const m = S.mine, pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code);
        if (!m || m.kind !== 'ai') return 'Create the meeting: New meeting, then AI speech translation.';
        if (!m.bc?.hls) return 'Turn HLS on: Settings, Broadcast, HLS Stream.';
        if (m.bc.dur !== '3 hours') return 'Set the Stream Duration to 3 hours.';
        if (!(S.flags.wcodes || []).includes('broadcasting')) return 'Copy the code for the web page: Viewer-Only, Copy widget code, Broadcasting.';
        if (!(pub?.kind === 'wcode-broadcasting' && pub.m === m)) return 'Client website tab: Enter code in the embed element, paste the Broadcasting code, Apply, then Publish.';
        if (m.status !== 'live') return 'Back in KUDO, start the meeting from the Overview.';
        if (!m.bc.live) return 'Start the HLS broadcast: Settings, Broadcast, Start broadcast.';
        if (!S.flags.sawHls) return 'Client website tab: View site (or Reload) and check the player is live.';
        return null;
      },
      checks(m, F) {
        const pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code);
        return [
          ['AI speech & captions meeting "Investor Day"', !!S.mine && m.kind === 'ai' && m.type === 'speech' && named(S.mine, 'investor day'), 6],
          ['English speaker language; French and German translation', aiLangs(m), 6],
          ['HLS Stream on', !!m.bc?.hls, 10],
          ['Stream Duration 3 hours', m.bc?.dur === '3 hours', 8],
          ['Broadcasting widget code copied', (F.wcodes || []).includes('broadcasting'), 8],
          ['The Broadcasting code of this meeting published on the client\'s page', pub?.kind === 'wcode-broadcasting' && pub.m === m, 20],
          ['Meeting started', !!F.started && !F.cancelled, 10],
          ['HLS broadcast started', !!F.hlsStarted, 14],
          ['Checked the live player on the published page', !!F.sawHls, 13],
          ['Only HLS used (RTMP left off)', !m.bc?.rtmp, 5],
        ];
      },
      traps(m, F) {
        const t = [], pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code);
        if ((F.wcodes || []).includes('real time') || pub?.kind === 'wcode-real time') t.push(['Used the Real time stream code: the page would not show the broadcast', 6]);
        if (pub && pub.kind !== 'wcode-broadcasting' && pub.kind !== 'wcode-real time') t.push(['Put the wrong code on the page (a link or the iframe widget instead of the Broadcasting code)', 6]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        if (F.ended) t.push(['Ended the meeting', 8]);
        return t;
      },
    },
  };
  const R = (id) => S.reply[id];
  const isK = (id, kinds, m = S.mine) => !!R(id) && kinds.includes(R(id).kind) && R(id).meeting === m;
  const WRONG = { participant: 'a Participant/Speaker link: it gives them a microphone and camera', operator: 'the Operator link: it gives full control of the meeting', viewer: 'the Viewer-Only link', mobile: 'the Mobile Link', qr: 'the QR code', iframe: 'the iframe widget code', interpreter: 'the Interpreter link', 'wcode-real time': 'the Real time stream code', 'wcode-broadcasting': 'the Broadcasting code (for HLS)' };
  Object.assign(RULES, {
    'platform-2': {
      next() {
        const need = [['speakers', 'participant', 'Participant/Speaker link'], ['attendees', 'viewer', 'Viewer-Only link'], ['producer', 'operator', 'Operator link'], ['web', 'iframe', 'iframe widget'], ['room', 'mobile', 'Mobile Link (or the QR code)']];
        for (const [, k, l] of need) if (!S.clip.some((c) => c.kind === k)) return `Open "Partner Summit" and copy the ${l} from the links panel.`;
        const miss = sc.reply.find((r) => !R(r.id)); if (miss) return `Open "Reply to the client" and choose what ${miss.label.toLowerCase()} need.`;
        return null;
      },
      checks() { return [
        ['Speakers: the Participant/Speaker link', isK('speakers', ['participant']), 20],
        ['Browser attendees: the Viewer-Only link', isK('attendees', ['viewer']), 20],
        ['Event producer: the Operator link', isK('producer', ['operator']), 20],
        ['Web team: the iframe widget code', isK('web', ['iframe']), 20],
        ['People in the room: the Mobile Link or its QR code', isK('room', ['mobile', 'qr']), 20],
      ]; },
      traps() { const t = [];
        sc.reply.forEach((r) => { const c = R(r.id); if (!c) return; if (c.kind === 'participant' && r.id !== 'speakers') t.push([`Gave ${r.label.toLowerCase()} ${WRONG.participant}`, 6]); if (c.kind === 'operator' && r.id !== 'producer') t.push([`Gave ${r.label.toLowerCase()} ${WRONG.operator}`, 8]); if (c.meeting !== S.mine) t.push([`Gave ${r.label.toLowerCase()} a link from another meeting`, 6]); });
        return t; },
    },
    'widget-1': {
      next() {
        const pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code), draft = readCode(S.site.blocks.find((b) => b.type === 'embed')?.code);
        if (!S.clip.some((c) => c.kind === 'iframe' && c.meeting === S.mine)) return 'Open "Global Summit - Day 2" (Day 2, not Day 1) and copy the iframe widget under KUDO language access.';
        if (!(draft?.kind === 'iframe' && draft.m === S.mine)) return 'Client website tab: Enter code in the embed element, paste the Day 2 iframe widget, Apply.';
        if (!(pub?.kind === 'iframe' && pub.m === S.mine)) return 'Publish the page.';
        if (!S.flags.sawWidget) return 'View site: check the widget shows "Welcome! Global Summit - Day 2".';
        return null;
      },
      checks() { const pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code); return [
        ['Opened the Day 2 session', S.events.some((e) => /Open Global Summit - Day 2/.test(e.what)), 15],
        ['An iframe widget code on the page', pub?.kind === 'iframe', 25],
        ['The widget of Day 2, not Day 1', pub?.kind === 'iframe' && pub.m === S.mine, 25],
        ['Page published', !!S.site.published, 15],
        ['Checked the widget on the published page', !!S.flags.sawWidget, 20],
      ]; },
      traps() { const t = [], pub = readCode(S.site.published?.find((b) => b.type === 'embed')?.code);
        if (pub?.m && pub.m !== S.mine) t.push(['Put the Day 1 widget on the page: each session has its own, and it stops working when that session ends', 8]);
        if (pub && pub.kind !== 'iframe') t.push([`Put ${WRONG[pub.kind] || 'something else'} on the page instead of the iframe widget`, 6]);
        return t; },
    },
    'ringcentral-1': {
      next() {
        if (!S.clip.some((c) => c.kind === 'mobile' && c.meeting === S.mine)) return 'Open "Sales Town Hall" and copy its Mobile Link: the Widget ID is the meeting ID at the end of it.';
        if (!R('wid')) return 'Open "Reply to the client" and type the 12-digit ID from the end of the Mobile Link (the ID only).';
        return null;
      },
      checks() { const v = (R('wid')?.text || '').replace(/\s/g, ''), id = idsOf(S.mine).v; return [
        ['Looked in the right session ("Sales Town Hall")', S.events.some((e) => /Open Sales Town Hall/.test(e.what)), 15],
        ['Copied the Mobile Link', S.clip.some((c) => c.kind === 'mobile' && c.meeting === S.mine), 15],
        ['Gave the right Widget ID', v === id, 50],
        ['Gave the ID only, not the whole link', !!v && !/[/:.]/.test(v), 20],
      ]; },
      traps() { const t = [], v = (R('wid')?.text || '').replace(/\s/g, ''), ids = idsOf(S.mine);
        if (/[/:]/.test(v)) t.push(['Gave the whole link: the producer needs the meeting ID only', 5]);
        if (v.includes(ids.p) || v.includes(ids.o)) t.push(['Gave the Participant or Operator meeting ID: the Widget ID is the one in the Mobile Link', 8]);
        return t; },
    },
    'teams-1': {
      next() {
        const t = S.tm, k = t.kudo;
        if (t.ev.start !== '14:00') return 'Team meetings app: open "Quarterly All-hands", move it to 14:00 and click "Save and close".';
        if (!t.added) return 'In the meeting, click Apps, search KUDO and Add it.';
        if (t.region !== 'eu' && !k?.step) return 'Log in to KUDO with "Meeting data will be processed in" set to European Union.';
        if (k.step !== 'overview') return 'KUDO tab: AI Translation, NEXT, AI Speech and Captions, English to Spanish and Arabic, Force Close KUDO Meeting on, SAVE.';
        if (k.start !== t.ev.start) return 'The Teams meeting moved after KUDO was set up: KUDO tab, Sync meeting.';
        if (t.view !== 'live') return 'Join the meeting.';
        if (t.bot === 'lobby') return 'The KUDO AI Translator bot is in the waiting room: Admit it.';
        if (t.bot === 'denied' || t.bot === 'gone') return 'Leave, open the KUDO tab and click "+ Add bot", then join and Admit it.';
        if (!S.flags.tmSawChat) return 'Open the Chat: the bot posted the Mobile Link for anyone on a phone.';
        if (t.panel !== 'kudo' || !t.ok) return 'Click KUDO in the meeting toolbar and accept the notice (OK).';
        if (t.voice !== 'Spanish (Spain)' || t.cap !== 'English (US)') return 'In the KUDO panel: Voice Spanish, Captions English. Keep the panel open.';
        return null;
      },
      checks() {
        const t = S.tm, k = t.kudo || {}, made = k.step === 'overview', extra = (k.translations || []).filter((l) => !['English (US)', 'English (UK)', 'Arabic'].includes(l) && !es(l));
        return [
          ['Teams meeting moved to 14:00 and saved', t.ev.start === '14:00', 6],
          ['KUDO added to the meeting from Apps', !!t.added, 6],
          ['Meeting data processed in the European Union', t.region === 'eu', 10],
          ['AI Translation, AI Speech and Captions', made && k.type === 'ai' && k.ttype === 'speech', 8],
          ['English speaker, Spanish and Arabic translation, nothing extra', made && k.speakers.length === 1 && k.speakers[0] === 'English' && k.translations.some(es) && k.translations.includes('Arabic') && !extra.length, 8],
          ['Force Close KUDO Meeting on', made && !!k.force, 8],
          ['Recording and Transcript on, recorded automatically', made && !!k.rec && !!k.auto, 6],
          ['Mobile Link on', made && !!k.mobile, 4],
          ['KUDO meeting at the Teams time (Sync meeting if it moved)', made && k.start === t.ev.start && t.ev.start === '14:00', 10],
          ['Bot admitted from the waiting room', !!S.flags.tmAdmitted, 12],
          ['Saw the Mobile Link the bot posted in the chat', !!S.flags.tmSawChat, 6],
          ['KUDO panel open with Spanish voice and English captions', t.view === 'live' && t.panel === 'kudo' && t.ok && t.bot === 'in' && t.voice === 'Spanish (Spain)' && t.cap === 'English (US)', 16],
        ];
      },
      traps() {
        const t = [], F = S.flags, k = S.tm.kudo;
        if (F.tmDenied) t.push(['Denied the KUDO bot in the waiting room: it had to be added again', 4]);
        if (k?.audio) t.push(['Turned on Audio Manager: it is for venue audio in hybrid events, not needed here', 2]);
        if (k?.type === 'hi') t.push(['Chose Human Interpretation: the client wants AI translation', 4]);
        if (F.cancelled) t.push(['Cancelled the meeting', 10]);
        return t; },
    },
    'zoom-1': vmRules(),
    'meet-1': vmRules(),
    'webex-1': vmRules(),
  });
  const RULE = RULES[key];
  function nextStep() {
    if (S.call && !S.call.done) { const miss = sc.brief.questions.find((x) => x.key && !S.call.asked.includes(x.id)); return S.call.stage === 'talk' ? (miss ? `Ask what decides the set-up. For example: "${miss.q}"` : 'You have what you need: choose the solution.') : 'Pick the solution that fits your notes, then Confirm and start building.'; }
    if (S.screen === 'login' && !sc.startTab) return 'Log in: the account is filled in for you.';
    return RULE.next() || 'All done: click "I am done".';
  }
  function hint() { S.hints++; log('hint', nextStep()); toast(nextStep()); }

  function score() {
    const m = S.mine || { participants: [], translations: [], speakers: [], bc: null }, F = S.flags;
    const checks = RULE.checks(m, F);
    const outcome = Math.round(checks.reduce((t, c) => t + (c[1] ? c[2] : 0), 0));
    const traps = RULE.traps(m, F);
    const detours = S.events.filter((e) => e.type === 'detour').length;
    const path = Math.max(0, 100 - detours * 6 - traps.reduce((t, x) => t + x[1], 0) * 3 - S.hints * 8);
    const secs = Math.round((Date.now() - S.t0) / 1000);
    const extra = sc.brief ? 120 : 0; // the call takes time too
    const time = secs <= 300 + extra ? 100 : secs >= 720 + extra ? 0 : Math.round(100 - ((secs - 300 - extra) / 420) * 100);
    const cs = callScore();
    const total = cs ? Math.round(outcome * 0.45 + cs.discovery * 0.2 + cs.solution * 0.15 + path * 0.1 + time * 0.1) : Math.round(outcome * 0.7 + path * 0.2 + time * 0.1);
    return { total, outcome, path, time, secs, ...(cs ? { discovery: cs.discovery, solution: cs.solution, call: { asked: [...S.call.asked], choice: S.call.choice, confidence: cs.confidence } } : {}), expert: sc.expertSeconds, checks: checks.map(([label, ok, w]) => ({ label, ok, w })), traps: traps.map(([label]) => label), detours, hints: S.hints, actions: S.events.filter((e) => ['click', 'pick', 'input', 'toggle', 'choose', 'save', 'remove', 'change'].includes(e.type)).length };
  }
  async function finish() {
    if (S.finished) return;
    if (!confirm('Finish and see your result?')) return;
    S.finished = true; clearInterval(tick);
    const r = score();
    let saved = null;
    try { saved = await api('POST', `/api/me/sandbox/${key}`, { result: r, events: S.events }); } catch (e) { toast(`Your run could not be saved: ${e.message}`, true); }
    root.replaceChildren(report(sc, r, S.events, saved, onExit));
  }

  // ---------------------------------------------------------------- third-party look-alikes
  // Generic replicas of the client's own tools (no brand, no logo): a website builder (Wix-like) and a video
  // platform studio (YouTube-like). The trainee does the client's side too, so they can show a client how.
  const APPS = { site: 'Client website', studio: 'Video studio', vmeet: 'Video meeting app', teams: 'Team meetings app' };
  const viewLog = (what) => { if (!S.events.some((e) => e.type === 'view' && e.what === what)) log('view', what); };
  S.tab = sc.startTab || 'kudo';
  S.site = { blocks: [{ type: 'video' }, { type: 'embed', code: '' }], published: null, mode: 'editor', dlg: null };
  const keyGen = (n) => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let x = 7 + n * 131, out = ''; for (let i = 0; i < 16; i++) { x = (x * 1103515245 + 12345) % 2147483648; out += a[x % a.length]; if (i % 4 === 3 && i < 15) out += '-'; } return out; };
  S.studio = { keys: [{ name: 'Default stream key', key: keyGen(0) }], sel: 0, show: false, naming: null, url: 'rtmp://a.rtmp.youtube.com/live2' };
  const tabTo = (t) => { if (S.tab === t) return; S.tab = t; S.menu = null; S.modal = null; log('nav', `Tab: ${t === 'kudo' ? 'KUDO portal' : APPS[t]}`); draw(); };
  const tabStrip = h('div', { class: 'sbx-tabs' });
  const drawTabs = () => tabStrip.replaceChildren(...(sc.apps ? [['kudo', 'KUDO portal'], ...sc.apps.map((a) => [a, APPS[a]])] : []).map(([k, l]) => h('button', { class: S.tab === k ? 'on' : '', type: 'button', on: { click: () => tabTo(k) } }, l)));
  const clipItem = (kind, text, label) => { S.clip = [{ kind, text, label, meeting: null }, ...S.clip.filter((c) => c.text !== text)].slice(0, 14); try { navigator.clipboard?.writeText(text).catch(() => {}); } catch { /* list below */ } log('copy', `Copied ${label}`); toastK('Copied to the clipboard'); };
  // A paste helper for fields: the sandbox clipboard (keyboard paste works too).
  const pasteSel = (onPick) => h('select', { class: 'k-paste', title: 'Paste what you copied', on: { change: (e) => { const c = S.clip[Number(e.target.value)]; e.target.value = ''; if (c) { log('paste', `Pasted ${c.label}`); onPick(c.text); } } } }, h('option', { value: '' }, 'Paste ▾'), ...S.clip.map((c, i) => h('option', { value: i }, c.label)));
  // What a piece of code shows on a web page.
  const allMeetings = () => [...(S.own || (S.mine ? [S.mine] : [])), ...samples()];
  const readCode = (code) => {
    const t = String(code || '').replace(/\s+/g, ' ');
    if (!t.trim()) return null;
    for (const m of allMeetings()) { const v = idsOf(m).v;
      if (t.includes('<iframe') && t.includes(`audio-widget.kudoway.com/${v}`)) return { kind: 'iframe', m };
      if (t.includes(`window.mid = "${v}"`) && t.includes('hls/main.js')) return { kind: 'wcode-broadcasting', m };
      if (t.includes(`window.mid = "${v}"`) && t.includes('live/main.js')) return { kind: 'wcode-real time', m };
      if (t.includes(`audio-widget.kudoway.com/${v}`)) return { kind: 'mobile', m };
      for (const [k, id] of [['participant', idsOf(m).p], ['operator', idsOf(m).o], ['viewer', v]]) if (t.includes(`live.kudoway.eu/k8/${id}`)) return { kind: k, m }; }
    return { kind: 'other' };
  };
  const embedView = (code, live) => {
    const r = readCode(code);
    if (!r) return h('div', { class: 'ws-empty' }, live ? '' : 'Empty embed: click "Edit code"');
    if (r.kind === 'iframe') return h('div', { class: 'ws-widget' }, h('h3', null, 'Welcome!'), h('p', null, r.m.name), select(['Please select your language', ...r.m.translations], 'Please select your language', () => {}), h('button', { class: 'k-btn', type: 'button', on: { click: () => log('click', 'Site: widget Join') } }, 'Join'), h('small', { class: 'k-mini' }, 'Powered by KUDO'));
    if (r.kind === 'wcode-broadcasting') return r.m.bc?.live
      ? h('div', { class: 'ws-player' }, h('div', { class: 'ws-video' }, 'LIVE'), h('div', { class: 'ws-pbar' }, h('small', null, 'Select Language:'), select(['Floor', ...r.m.translations], 'Floor', (v) => log('change', `Site player language: ${v}`)), h('span', null, '■  🔊  ● LIVE'), h('small', null, 'Powered by KUDO')))
      : h('div', { class: 'ws-player off' }, h('p', null, 'Broadcasting has not started yet, please reload after some time'), h('button', { class: 'k-btn', type: 'button', on: { click: () => { log('click', 'Site: Reload'); draw(); } } }, 'Reload'));
    if (r.kind === 'wcode-real time') return h('div', { class: 'ws-widget' }, h('h3', null, 'Welcome!'), h('p', null, r.m.name), h('small', { class: 'k-mini' }, 'Real time stream widget: viewers join the meeting in real time'), h('button', { class: 'k-btn', type: 'button' }, 'Join'));
    return h('div', { class: 'ws-empty err' }, 'This content cannot be displayed here. Check the code you pasted.');
  };
  function siteScreen() {
    const st = S.site;
    if (st.mode === 'live') {
      const r = readCode(st.published?.find((b) => b.type === 'embed')?.code);
      viewLog(`Site: viewed the published page (${r ? (r.kind === 'wcode-broadcasting' ? (r.m.bc?.live ? 'HLS player live' : 'HLS not started') : r.kind) : 'empty'})`);
      if (r?.kind === 'wcode-broadcasting' && r.m.bc?.live && r.m === S.mine) S.flags.sawHls = true;
      if (r?.kind === 'iframe' && r.m === S.mine) S.flags.sawWidget = true;
      return h('div', { class: 'ws-live' }, h('div', { class: 'ws-livebar' }, h('span', null, 'client-events.example.com/live'), h('button', { class: 'k-link small', type: 'button', on: { click: () => { st.mode = 'editor'; log('click', 'Site: back to the editor'); draw(); } } }, 'Back to the editor')),
        h('h1', null, 'Client Event'), h('div', { class: 'ws-row' }, ...(st.published || []).map((b) => (b.type === 'video' ? h('div', { class: 'ws-video own' }, 'Event video') : h('div', { class: 'ws-embedbox' }, embedView(b.code, true))))));
    }
    const dlg = st.dlg != null ? (() => { const b = st.blocks[st.dlg]; const ta = h('textarea', { class: 'k-in ws-code', placeholder: '<iframe … or <script …', on: { input: (e) => { b.draft = e.target.value; } } }, b.draft ?? b.code);
      return h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal ws-dlg' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Embed settings'), h('button', { type: 'button', on: { click: () => { st.dlg = null; draw(); } } }, '×')),
        h('small', null, 'What do you want to add?'), radio('wsk', [['url', 'Website address'], ['code', 'Code']], 'code', () => {}),
        h('div', { class: 'k-rowsp' }, h('small', null, 'Add your code here (HTTPS only):'), pasteSel((t) => { ta.value = t; b.draft = t; })), ta,
        h('div', { class: 'k-row end' }, h('button', { class: 'k-btn', type: 'button', on: { click: () => { b.code = (b.draft ?? b.code).trim(); delete b.draft; st.dlg = null; const r = readCode(b.code); log('save', `Site: embed code applied (${r ? r.kind : 'empty'}${r?.m ? `, ${r.m.name}` : ''})`); draw(); } } }, 'Apply')))); })() : null;
    return h('div', { class: 'ws' }, h('div', { class: 'ws-top' }, h('b', null, 'Site editor'), h('span', { class: 'k-mini' }, 'Page: Home'), h('span', { class: 'pv-gap' }),
        h('span', { class: 'k-rel' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { S.menu = S.menu === 'wsadd' ? null : 'wsadd'; draw(); } } }, '+ Add element'),
          S.menu === 'wsadd' ? h('div', { class: 'k-menu right' }, ...[['Embed code', 'embed'], ['Video', 'video']].map(([l, t]) => h('button', { type: 'button', on: { click: () => { st.blocks.push({ type: t, code: '' }); S.menu = null; log('click', `Site: add ${l}`); draw(); } } }, l))) : null),
        h('button', { class: 'k-btn', type: 'button', on: { click: () => { st.published = st.blocks.map((b) => ({ ...b })); log('save', 'Site: published'); S.modal = { kind: 'wspub' }; draw(); } } }, 'Publish')),
      h('div', { class: 'ws-canvas' }, h('h1', null, 'Client Event'), h('div', { class: 'ws-row' }, ...st.blocks.map((b, i) => (b.type === 'video' ? h('div', { class: 'ws-video own' }, 'Event video')
        : h('div', { class: 'ws-embedbox edit' }, h('div', { class: 'ws-tool' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { st.dlg = i; log('click', 'Site: edit embed code'); draw(); } } }, b.code ? 'Edit code' : 'Enter code'), h('button', { class: 'k-link small', type: 'button', on: { click: () => { st.blocks.splice(i, 1); draw(); } } }, 'Remove')), embedView(b.code, false)))))),
      dlg, S.modal?.kind === 'wspub' ? modal('Congratulations', [h('p', null, 'Your site is published and visible online.'), h('code', { class: 'sbx-rtext' }, 'https://client-events.example.com/live')], [['Done', () => { S.modal = null; draw(); }, 'ghost'], ['View site', () => { S.modal = null; st.mode = 'live'; log('click', 'Site: view site'); draw(); }]]) : null);
  }
  const keyLive = (key) => { const m = S.mine; const s = m?.bc?.streams?.find((x) => x.key === key); return s && m.bc.rlive ? s : null; };
  function studioScreen() {
    const st = S.studio, k = st.keys[st.sel], live = keyLive(k.key);
    if (live && S.mine?.bc?.streams?.length) { S.flags.studioSaw = new Set([...(S.flags.studioSaw || []), k.key]); viewLog(`Studio: ${k.name} is live (${live.lang})`); }
    const field = (label, val, kind, hide) => h('div', { class: 'yt-field' }, h('small', null, label), h('div', { class: 'k-rowsp' }, h('code', null, hide && !st.show ? '••••••••••••••••••••' : val), hide ? h('button', { class: 'yt-btn ghost', type: 'button', on: { click: () => { st.show = !st.show; draw(); } } }, st.show ? 'Hide' : 'Show') : null, h('button', { class: 'yt-btn', type: 'button', on: { click: () => clipItem(kind, val, `${label}${hide ? `, ${k.name}` : ''}`) } }, 'Copy')));
    return h('div', { class: 'yt' }, h('div', { class: 'yt-top' }, h('b', null, '▶ Studio'), h('span', { class: 'k-mini' }, 'Client channel'), h('span', { class: 'pv-gap' }), live ? h('span', { class: 'yt-live' }, 'LIVE') : null),
      h('div', { class: 'yt-preview' }, h('span', { class: `yt-status ${live ? 'ok' : ''}` }, live ? '● Excellent' : '● No data'), live ? h('div', null, h('b', null, 'You are live'), h('p', null, `Receiving the ${live.lang.replace(/ \(.*\)$/, '')} stream from KUDO`)) : h('div', null, h('b', null, 'Connect your encoder to go live'), h('p', null, 'Copy a stream key into your streaming software (here: KUDO) to start sending your video'))),
      h('div', { class: 'yt-card' }, h('div', { class: 'k-rowsp' }, h('b', null, 'Stream settings'), h('div', { class: 'k-row' }, h('small', null, 'Stream key'), select(st.keys.map((x, i) => [i, `${x.name}${keyLive(x.key) ? ', live' : ''}`]), st.sel, (v) => { st.sel = Number(v); st.show = false; log('change', `Studio: stream key ${st.keys[st.sel].name}`); draw(); }),
          st.naming == null ? h('button', { class: 'yt-btn ghost', type: 'button', on: { click: () => { st.naming = ''; draw(); } } }, '+ Create stream key')
            : h('span', { class: 'k-row' }, h('input', { class: 'k-in sm', placeholder: 'Name, e.g. French', on: { input: (e) => { st.naming = e.target.value; } } }), h('button', { class: 'yt-btn', type: 'button', on: { click: () => { const n = (st.naming || '').trim() || `Stream key ${st.keys.length + 1}`; st.keys.push({ name: n, key: keyGen(st.keys.length) }); st.sel = st.keys.length - 1; st.naming = null; st.show = false; log('save', `Studio: created stream key "${n}"`); draw(); } } }, 'Create')))),
        field('Stream URL', st.url, 'yt-url'), field('Backup server URL', `${st.url.replace('//a.', '//b.')}?backup=1`, 'yt-url2'), field('Stream key (paste in encoder)', k.key, 'yt-key', true),
        h('small', { class: 'k-mini' }, 'One stream key per stream: a key used by two streams interrupts both.')));
  }
  // Generic look-alikes of the client's video-meeting platform (no name, no logo), one engine for three platforms:
  // a Zoom-like app, a Google Meet-like calendar app and a Webex-like conferencing app. The trainee schedules the
  // meeting with settings that let the KUDO bot in, links it in KUDO, starts it (KUDO starts with it), lets the bot in,
  // finds the Mobile Link it posts, ends the meeting and downloads the recordings from KUDO.
  const VM = {
    zoom: { app: 'Video meeting app', host: 'meet.videoapp.example', kudo: 'Zoom', record: true, client: 'Client Communications',
      fresh: () => ({ topic: '', time: '10:00', dur: '1 hour', recurring: false, idMode: 'auto', passcode: true, waiting: true, enc: 'e2e' }),
      ids: (f, keep) => ({ id: f.idMode === 'pmi' ? '555 010 4477' : (keep && keep.id !== '555 010 4477' ? keep.id : '842 6619 3075'), pwd: f.passcode ? 'Rk7Qm2xV9pLwT4cZ' : 'none', pwdShow: f.passcode ? '508214' : 'none' }),
      link: (x) => `https://meet.videoapp.example/j/${x.id.replace(/\s/g, '')}?pwd=${x.pwd}`,
      invite: (x, l) => `Client Communications is inviting you to a scheduled meeting.\nTopic: ${x.topic}\nTime: today ${x.time}\nJoin the meeting:\n${l}\nMeeting ID: ${x.id}\nPasscode: ${x.pwdShow}`,
      fields: (f, set2, tick) => [
        row('Recurring meeting', check(f.recurring, 'Recurring meeting', tick('recurring', 'Recurring'))),
        row('Meeting ID', radio('vmid', [['auto', 'Generate automatically'], ['pmi', 'Personal Meeting ID 555 010 4477']], f.idMode, set2('idMode', 'Meeting ID'))),
        row('Security', check(f.passcode, 'Passcode', tick('passcode', 'Passcode')), h('small', { class: 'k-mini' }, 'Only users who have the invite link or passcode can join the meeting'),
          check(f.waiting, 'Waiting Room', tick('waiting', 'Waiting Room')), h('small', { class: 'k-mini' }, 'Only users admitted by the host can join the meeting')),
        row('Encryption', radio('vmenc', [['enhanced', 'Enhanced encryption'], ['e2e', 'End-to-end encryption']], f.enc, set2('enc', 'Encryption')), h('small', { class: 'k-mini' }, f.enc === 'e2e' ? 'Some features, such as apps and recording, are not available with end-to-end encryption.' : 'Encryption keys are stored in the cloud.'))],
      blocked: (x) => (x.enc === 'e2e' ? 'End-to-end encryption is on: apps and bots cannot join this meeting. End the meeting, edit it and choose Enhanced encryption.' : null),
      lobby: (x) => x.waiting, lobbyText: 'KUDO AI Translator entered the waiting room.',
      fix: 'Edit the meeting. Keep the passcode, untick the Waiting Room and choose Enhanced encryption, then Save.',
      bad: (x) => x.enc === 'e2e' || x.waiting || !x.passcode,
      checks: (x) => [
        ['A new, non-recurring meeting ID (not the Personal Meeting ID)', !!x && !x.recurring && x.idMode === 'auto', 4],
        ['Enhanced encryption, not end-to-end', !!x && x.enc === 'enhanced', 12],
        ['Waiting Room off, passcode kept on', !!x && !x.waiting && x.passcode, 6]],
      traps: (x, F) => [F.vmBlocked ? ['Started the meeting with end-to-end encryption: the bot cannot join', 6] : null, F.botWaited ? ['Left the Waiting Room on: the bot had to be admitted by hand', 2] : null, x?.idMode === 'pmi' ? ['Used the Personal Meeting ID: KUDO needs a new meeting ID', 3] : null] },
    meet: { app: 'Calendar and video app', host: 'calendar.calendarapp.example', kudo: 'Google Meet', record: false, client: 'Client People Team',
      fresh: () => ({ topic: '', time: '10:00', dur: '1 hour', repeat: 'none', conf: false, access: 'restricted', ask: false, hostFirst: true }),
      ids: () => ({ id: 'kdu-wqzp-rtm' }),
      link: (x) => `https://meet.calendarapp.example/${x.id}`,
      invite: (x, l) => `${x.topic}\nToday ${x.time}\nVideo call link: ${l}\nOr dial: not available for this meeting`,
      fields: (f, set2, tick) => [
        row('Repeat', select([['none', 'Does not repeat'], ['weekly', 'Weekly on this day']], f.repeat, set2('repeat', 'Repeat'), 'sm')),
        row('Video conferencing', f.conf ? h('div', null, h('b', null, 'Video call added'), h('small', { class: 'k-mini k-break' }, 'The link is created when you save'))
          : h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { f.conf = true; log('click', 'App: Add video conferencing'); draw(); } } }, 'Add video conferencing')),
        f.conf ? row('Video call options: Host controls', h('small', null, 'Meeting access type'),
          radio('vmacc', [['open', 'Open', 'No one has to ask to join. Anyone can dial in.'], ['trusted', 'Trusted', 'People in your organisation and invited guests join without asking.'], ['restricted', 'Restricted', 'Only people invited by the host join without asking.']], f.access, set2('access', 'Meeting access type')),
          check(f.access === 'open' || f.ask, 'Anyone with the meeting link can ask to join', tick('ask', 'Anyone with the meeting link can ask to join'), f.access === 'open'),
          h('small', { class: 'k-mini' }, f.access !== 'open' && !f.ask ? 'Asking to join is off: anyone who asks, bots included, is denied automatically.' : 'People who are not invited ask to join and a host admits them.'),
          check(f.hostFirst, 'Host must join before anyone else can join', tick('hostFirst', 'Host must join before anyone else'))) : null],
      blocked: (x) => (x.access !== 'open' && !x.ask ? 'KUDO AI Translator bot asked to join and was denied automatically: asking to join is turned off for this meeting. End the call, edit the event (Video call options) and allow asking to join.' : null),
      lobby: (x) => x.access !== 'open', lobbyText: 'KUDO AI Translator bot wants to join this call.',
      fix: 'Edit the event: Video call options, Host controls. Allow "Anyone with the meeting link can ask to join" (or choose Open), then Save.',
      bad: (x) => !x.conf || (x.access !== 'open' && !x.ask),
      checks: (x) => [
        ['Video conferencing added to the event, not repeating', !!x && x.conf && x.repeat === 'none', 6],
        ['Host controls let the bot in: Open, or asking to join allowed', !!x && (x.access === 'open' || x.ask), 16]],
      traps: (x, F) => [F.vmBlocked ? ['Started the call with asking to join off: the bot was denied automatically', 6] : null] },
    webex: { app: 'Web conferencing app', host: 'client.webconf.example', kudo: 'Webex', record: false, client: 'Client Sales Operations',
      fresh: () => ({ topic: '', time: '10:00', dur: '1 hour', recurring: false, guests: 'cant', autoLock: true, lockMin: '10' }),
      ids: () => ({ id: '2734 118 905', pwd: 'mP3vK8qw' }),
      link: () => 'https://client.webconf.example/client/j.php?MTID=m4c7e19d2a8b05f6c3e9a1d7b2f40c86e',
      invite: (x, l) => `Client Sales Operations invites you to a Web conferencing meeting.\nMeeting topic: ${x.topic}\nToday ${x.time}\nJoin link: ${l}\nMeeting number: ${x.id}\nMeeting password: ${x.pwd}`,
      fields: (f, set2, tick) => [
        row('Recurrence', check(f.recurring, 'Recurring meeting', tick('recurring', 'Recurring'))),
        row('Meeting password', h('div', { class: 'k-in fake' }, 'mP3vK8qw (generated)')),
        row('Advanced options: Security', h('small', null, 'When the meeting is unlocked, guests (people outside your organisation)'),
          radio('vmguest', [['direct', 'Guests can join directly'], ['lobby', 'Guests wait in the lobby until the host admits them'], ['cant', 'Guests can\'t join']], f.guests, set2('guests', 'Guests')),
          check(f.autoLock, 'Automatically lock meeting after it starts', tick('autoLock', 'Automatically lock meeting')),
          f.autoLock ? h('div', { class: 'k-row' }, select(['0', '5', '10', '15', '20'], f.lockMin, set2('lockMin', 'Lock after (minutes)'), 'sm'), h('small', { class: 'k-mini' }, 'minutes after the meeting starts. Once locked, nobody new gets in without the host.')) : null)],
      blocked: (x) => (x.guests === 'cant' ? 'A guest tried to join and was refused: guests can\'t join this meeting. The KUDO AI Translator bot joins as a guest. End the meeting, edit it (Advanced options, Security) and let guests in.' : null),
      lobby: (x) => x.guests === 'lobby', lobbyText: 'KUDO AI Translator bot is waiting in the lobby.',
      fix: 'Edit the meeting: Advanced options, Security. Let guests in (directly or through the lobby) and turn off the automatic lock, then Save.',
      bad: (x) => x.guests === 'cant' || x.autoLock,
      checks: (x) => [
        ['Not recurring', !!x && !x.recurring, 4],
        ['Guests allowed in, directly or through the lobby', !!x && x.guests !== 'cant', 12],
        ['Automatic lock off, so the bot can come back if it drops', !!x && !x.autoLock, 6]],
      traps: (x, F) => [F.vmBlocked ? ['Started the meeting with "Guests can\'t join": the bot was refused', 6] : null, F.botWaited ? ['Guests wait in the lobby: the bot had to be admitted by hand', 1] : null] },
  };
  const PL = VM[sc.vm || 'zoom'];
  APPS.vmeet = PL.app;
  S.vm = { mode: 'home', meet: null, dlg: null, chat: false, bot: null, f: null, started: 0 };
  const vmLink = (x) => PL.link(x);
  const vmInvite = (x) => PL.invite(x, vmLink(x));
  // Does the KUDO meeting point at this app meeting? The bot joins only when both are live and nothing blocks it.
  const linked = (m, x) => !!(m && x && m.external && m.platform === PL.kudo && m.link && m.link.trim() === vmLink(x));
  // The KUDO meeting starts by itself when the client's meeting starts; then the bot comes to the door.
  function botTick() {
    const v = S.vm, x = v.meet, m = S.mine;
    if (!x || v.mode !== 'live' || !m || !linked(m, x)) return;
    if (m.status === 'scheduled') { m.status = 'live'; S.flags.started = true; S.flags.autoStarted = true; log('view', `KUDO meeting started by itself with the ${PL.app.toLowerCase()} meeting`); }
    if (m.status !== 'live') return;
    const why = PL.blocked(x);
    if (why) { if (!S.flags.vmBlocked) { S.flags.vmBlocked = true; log('trap', `Bot refused: ${why.split(':')[0]}`); } return; }
    if (v.bot) return;
    v.bot = PL.lobby(x) ? 'waiting' : PL.record ? 'request' : 'in';
    if (v.bot === 'in') { S.flags.botIn = true; toastK('KUDO AI Translator bot joined'); }
    log('view', v.bot === 'waiting' ? 'Bot at the door (waiting room or lobby)' : v.bot === 'request' ? 'Bot asks to record' : 'Bot joined');
    if (v.bot === 'waiting') S.flags.botWaited = true;
  }
  function botAgain(what) {
    const m = S.meeting; log('click', what); F()[what === 'Add bot' ? 'addBot' : 'restartBot'] = true;
    if (m === S.mine && ['denied', 'gone'].includes(S.vm.bot)) S.vm.bot = null;
    toastK(what === 'Add bot' ? 'The bot is on its way to the meeting' : 'Bot service restart in progress'); draw();
  }
  function vmScreen() {
    const v = S.vm, x = v.meet;
    const top = (extra) => h('div', { class: 'vm-top' }, h('b', null, sc.vm === 'meet' ? 'Calendar' : 'Meetings'), h('span', { class: 'k-mini' }, PL.client), h('span', { class: 'pv-gap' }), extra);
    if (v.mode === 'schedule') {
      const f = v.f, set2 = (k, l) => (val) => { f[k] = val; log('change', `App: ${l}: ${val}`); draw(); }, tick = (k, l) => (val) => { f[k] = val; log('toggle', `App: ${l}: ${val}`); draw(); };
      const topic = h('input', { class: 'k-in', value: f.topic, placeholder: sc.vm === 'meet' ? 'Add title' : 'My Meeting', on: { input: (e) => { f.topic = e.target.value; }, change: (e) => log('input', `App: Topic: ${e.target.value}`) } });
      return h('div', { class: 'vm' }, top(null), h('div', { class: 'vm-form' }, h('h2', null, v.editing ? (sc.vm === 'meet' ? 'Edit event' : 'Edit meeting') : sc.vm === 'meet' ? 'New event' : 'Schedule meeting'),
        row(sc.vm === 'meet' ? 'Title' : sc.vm === 'webex' ? 'Meeting topic' : 'Topic', topic),
        row('When', h('div', { class: 'k-row' }, h('span', { class: 'k-mini' }, 'Today'), select(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], f.time, set2('time', 'Time'), 'sm'))),
        row('Duration', select(['30 minutes', '1 hour', '1 hour 30 minutes', '2 hours'], f.dur, set2('dur', 'Duration'), 'sm')),
        ...PL.fields(f, set2, tick),
        h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { v.mode = 'home'; v.editing = false; log('click', 'App: Cancel'); draw(); } } }, 'Cancel'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => {
            if (!f.topic.trim()) return toastK('Enter a title');
            const keep = v.editing && x ? x : null;
            v.meet = { ...f, topic: f.topic.trim(), ...PL.ids(f, keep) };
            v.mode = 'home'; v.dlg = 'invite'; v.editing = false;
            log('save', `App: meeting saved (${v.meet.topic}, ${v.meet.time}, ${v.meet.dur})`, { vm: { ...v.meet } });
            draw(); } } }, 'Save'))));
    }
    if (v.mode === 'live' && x) {
      botTick();
      const bot = v.bot, m = S.mine, url = m ? LINK.mobile(m) : '';
      const chatMsg = bot === 'in' ? h('div', { class: 'vm-msg' }, h('b', null, 'KUDO AI Translator bot'), h('p', null, 'This is the KUDO AI Translator bot, which provides secure real-time speech translation and captions in this meeting. To access the meeting in the language of your choice, scan the QR code on screen. You can also join in your language directly via this link: ', h('button', { class: 'k-link', type: 'button', on: { click: () => clipItem('mobile', url, 'Mobile Link (from the bot)') } }, url))) : null;
      if (v.chat && bot === 'in' && !S.flags.sawBotChat) { S.flags.sawBotChat = true; log('view', 'App: the bot posted the Mobile Link in the chat'); }
      if (bot === 'in' && !S.flags.sawQr) { S.flags.sawQr = true; log('view', 'App: the bot shows its QR code'); }
      const tiles = [h('div', { class: 'vm-tile' }, h('span', null, 'You (Host)'))];
      if (bot === 'in') tiles.push(h('div', { class: 'vm-tile bot' }, h('div', { class: 'vm-qr', 'aria-hidden': 'true' }, ...Array.from({ length: 49 }, (_, i) => h('i', { class: (i * 7 + (i >> 2)) % 3 ? '' : 'on' }))), h('span', null, 'KUDO AI Translator bot'), h('small', null, 'Scan to follow in your language')));
      const blockedWhy = m?.status === 'live' && linked(m, x) ? PL.blocked(x) : null;
      const banner = blockedWhy ? h('div', { class: 'vm-note bad' }, blockedWhy)
        : bot === 'waiting' ? h('div', { class: 'vm-note' }, h('span', null, PL.lobbyText), h('span', { class: 'pv-gap' }),
          h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { v.bot = 'denied'; S.flags.botDenied = true; log('click', 'App: Deny the bot'); draw(); } } }, 'Deny'),
          h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { v.bot = PL.record ? 'request' : 'in'; if (v.bot === 'in') S.flags.botIn = true; log('click', 'App: Admit the bot'); draw(); } } }, 'Admit'))
          : bot === 'denied' ? h('div', { class: 'vm-note bad' }, 'The KUDO AI Translator bot was turned away. Use "Add bot" on the KUDO Overview to bring it back.') : null;
      const req = bot === 'request' ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal vm-req' }, h('b', null, 'KUDO AI Translator bot is requesting to record to computer'), h('p', { class: 'k-mini' }, 'The recording will be saved on the computer of the participant who records.'),
        check(!!v.applyAll, 'Apply these permissions to all future requests in this meeting', (val) => { v.applyAll = val; }),
        h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { v.bot = 'denied'; S.flags.botDenied = true; log('click', 'App: Deny the bot recording'); draw(); } } }, 'Deny'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => { v.bot = 'in'; S.flags.botIn = true; log('click', `App: Approve the bot recording${v.applyAll ? ' (all future requests)' : ''}`); toastK('KUDO AI Translator joined'); draw(); } } }, 'Approve')))) : null;
      return h('div', { class: 'vm live' }, h('div', { class: 'vm-top dark' }, h('b', null, x.topic), h('span', { class: 'k-mini' }, x.id ? `Meeting ${x.id}` : ''), h('span', { class: 'pv-gap' }), m && linked(m, x) ? h('span', { class: 'vm-enc' }, `KUDO meeting: ${m.status === 'live' ? 'live' : m.status === 'finished' ? 'ended' : 'scheduled'}`) : null),
        banner, h('div', { class: 'vm-stage' }, h('div', { class: 'vm-grid' }, ...tiles), v.chat ? h('aside', { class: 'vm-chat' }, h('b', null, 'Chat'), chatMsg || h('small', { class: 'k-mini' }, 'No messages yet')) : null),
        h('div', { class: 'vm-bar' }, ...['Mute', 'Stop video', 'Participants'].map((l) => h('button', { type: 'button', on: { click: () => log('click', `App: ${l}`) } }, l)),
          h('button', { type: 'button', class: v.chat ? 'on' : '', on: { click: () => { v.chat = !v.chat; log('click', 'App: Chat'); draw(); } } }, 'Chat'), h('span', { class: 'pv-gap' }),
          h('button', { type: 'button', class: 'end', on: { click: () => {
            log('click', 'App: End meeting for all'); v.mode = 'home'; v.chat = false; v.ended = true; S.flags.vmEnded = true; if (['in', 'waiting', 'request'].includes(v.bot)) v.bot = 'gone';
            if (m && m.status === 'live' && linked(m, x) && m.force) { m.status = 'finished'; S.flags.ended = true; S.flags.forceClosed = true; log('view', 'KUDO meeting closed with the client\'s meeting (Force close)'); toastK('The meeting ended. KUDO closed with it (Force close meeting)'); }
            else if (m && m.status === 'live' && linked(m, x)) { log('view', 'KUDO meeting still open: 1-hour grace period'); toastK('The meeting ended. The KUDO meeting stays open for the 1-hour grace period'); }
            else toastK('The meeting ended'); draw(); } } }, 'End')), req);
    }
    const inv = v.dlg === 'invite' && x ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal vm-inv' }, h('div', { class: 'k-modal-h' }, h('b', null, sc.vm === 'meet' ? 'Event saved' : 'Meeting saved'), h('button', { type: 'button', on: { click: () => { v.dlg = null; draw(); } } }, '×')),
      h('pre', { class: 'vm-invtext' }, vmInvite(x)),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => clipItem('vm-invite', vmInvite(x), sc.vm === 'meet' ? 'Joining info (whole text)' : 'Meeting invitation (whole text)') } }, sc.vm === 'meet' ? 'Copy joining info' : 'Copy invitation'), h('button', { class: 'k-btn', type: 'button', on: { click: () => clipItem('vm-link', vmLink(x), 'Video meeting join link') } }, 'Copy link')))) : null;
    return h('div', { class: 'vm' }, top(h('button', { class: 'k-btn', type: 'button', on: { click: () => { v.mode = 'schedule'; v.editing = false; v.f = PL.fresh(); log('click', 'App: Schedule'); draw(); } } }, sc.vm === 'meet' ? 'Create' : 'Schedule')),
      h('div', { class: 'vm-list' }, h('h3', null, v.ended ? 'Today' : 'Upcoming'), x ? h('div', { class: 'vm-item' }, h('div', null, h('b', null, x.topic), h('small', { class: 'k-mini' }, `Today ${x.time}, ${x.dur}${x.id ? `, ${sc.vm === 'meet' ? 'video call' : 'meeting'} ${x.id}` : ''}${v.ended ? ', ended' : ''}`)), h('span', { class: 'pv-gap' }),
        h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { v.dlg = 'invite'; log('click', 'App: Show invitation'); draw(); } } }, sc.vm === 'meet' ? 'Joining info' : 'Invitation'),
        v.ended ? null : h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { v.mode = 'schedule'; v.editing = true; v.f = { ...x }; log('click', 'App: Edit'); draw(); } } }, 'Edit'),
        v.ended ? null : h('button', { class: 'k-btn', type: 'button', on: { click: () => { v.mode = 'live'; v.started++; S.flags.vmStarted = true; log('click', 'App: Start the meeting'); draw(); } } }, sc.vm === 'meet' ? 'Join' : 'Start'))
        : h('p', { class: 'k-mini' }, 'No upcoming meetings. Schedule one.')), inv);
  }
  // A generic team-meetings app (Teams-like, no name or logo): the calendar event, Apps, the KUDO sign-in with the
  // data region, the KUDO tab (create, settings, overview), and the live meeting with the lobby, the bot's chat
  // message and the KUDO side panel where attendees choose voice and captions.
  S.tm = { ev: { title: 'Quarterly All-hands', start: '10:00' }, view: 'cal', etab: 'details', store: null, signin: null, kudo: null, draft: null, bot: null, panel: null, ok: false, voice: 'Original audio', cap: '', added: false };
  const hourEnd = (t) => `${String(Number(t.slice(0, 2)) + 1).padStart(2, '0')}:${t.slice(3)}`;
  const REGIONS = [['ca', 'Canada (live.kudoway.ca)'], ['asia', 'Asia (asia.kudoway.com)'], ['eu', 'European Union (live.kudoway.eu)'], ['us', 'United States (live.kudoway.com)']];
  const CODE = { 'Spanish (Spain)': 'ES - Español', Arabic: 'AR - عربي', 'English (US)': 'EN - English', 'English (UK)': 'EN - English (UK)', 'French (France)': 'FR - Français', German: 'DE - Deutsch' };
  const LINE = { 'Spanish (Spain)': 'Bienvenidos a nuestra reunión trimestral.', Arabic: 'مرحبا بكم في اجتماعنا الفصلي.', 'English (US)': 'Welcome to our quarterly all-hands.' };
  const tmKudoMeeting = () => { const k = S.tm.kudo; if (!k || k.step !== 'overview') return null; return (k.m = k.m || baseMeeting({ name: S.tm.ev.title, date: 'Today', time: `${k.start} - ${hourEnd(k.start)}`, dur: '1 hour', speakers: k.speakers, translations: k.translations, status: 'scheduled' })); };
  function tmKudoTab() {
    const t = S.tm, k = t.kudo;
    if (k.step === 'type') return h('div', { class: 'tm-kudo' }, h('div', { class: 'tm-kh' }, h('b', null, 'KUDO'), h('h2', null, 'Create meeting')),
      h('div', { class: 'tm-kbox' }, h('small', null, 'Meeting type'), radio('tmtype', [['hi', 'Human Interpretation', 'Real time language interpretation powered by human interpreters.'], ['ai', 'AI Translation', 'Real time translated audio and/or captions powered by AI.']], k.type, (v) => { k.type = v; log('choose', `Teams KUDO: Meeting type ${v === 'ai' ? 'AI Translation' : 'Human Interpretation'}`); draw(); }),
        h('div', { class: 'k-row end' }, h('button', { class: 'k-btn', type: 'button', on: { click: () => { if (!k.type) return toastK('Choose a meeting type'); k.step = 'settings'; t.draft = { ttype: 'speech', speakers: [], translations: [], desc: '', force: false, rec: true, auto: true, mobile: true, audio: false }; log('click', 'Teams KUDO: NEXT'); draw(); } } }, 'NEXT'))));
    if (k.step === 'settings') {
      const d = t.draft, ai = k.type === 'ai', tg = (key, label) => (v) => { d[key] = v; log('toggle', `Teams KUDO: ${label}: ${v}`); draw(); };
      const lock = (x) => h('small', { class: 'tm-lock' }, x === 'c' ? 'This setting cannot be changed once the meeting has been created.' : 'This setting cannot be changed once the meeting starts.');
      return h('div', { class: 'tm-kudo' }, h('div', { class: 'tm-kh' }, h('b', null, 'KUDO'), h('h2', null, 'Meeting settings')),
        h('div', { class: 'tm-kbox' },
          ai ? row(h('span', null, 'Translation type', lock('c')), radio('tmtt', [['speech', 'AI Speech and Captions', 'Offer multilingual audio, captions, recording, transcriptions, and AI customization for greater accuracy.'], ['captions', 'AI Captions Only', 'Supports multilingual closed captioning only, minimizing perceived latency.']], d.ttype, (v) => { d.ttype = v; log('choose', `Teams KUDO: Translation type ${v}`); draw(); })) : null,
          row('Languages', h('small', null, ai ? 'Speaker language(s)' : 'Spoken language(s)'), picker('Teams speaker language', SPEAKER, d.speakers, { onChange: (l) => { if (ai && l === 'English' && !d.translations.includes('English (US)')) d.translations.unshift('English (US)'); } }),
            ai ? h('small', null, 'Translation language(s)') : null, ai ? picker('Teams translation language', TRANSLATION, d.translations) : null),
          row(h('span', null, 'Meeting Description', h('small', { class: 'k-mini' }, ' Optional')), h('textarea', { class: 'k-in', rows: 2, on: { input: (e) => { d.desc = e.target.value; } } }, d.desc)),
          row(h('span', null, 'Force Close KUDO Meeting', lock('s')), toggle(d.force, null, tg('force', 'Force Close KUDO Meeting'))),
          row(h('span', null, 'Recording and Transcript', lock('s')), toggle(d.rec, null, tg('rec', 'Recording and Transcript')), check(d.auto, 'Automatically record this meeting when it starts', (v) => { d.auto = v; log('toggle', `Teams KUDO: Automatically record: ${v}`); }, !d.rec)),
          row(h('span', null, 'Mobile Link', lock('c')), toggle(d.mobile, null, tg('mobile', 'Mobile Link'))),
          row(h('span', null, 'Audio Manager', lock('c')), toggle(d.audio, null, tg('audio', 'Audio Manager'))),
          h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { k.step = 'type'; draw(); } } }, 'Back'),
            h('button', { class: 'k-btn', type: 'button', on: { click: () => {
              if (!d.speakers.length || (ai && !d.translations.length)) return toastK('Choose the languages');
              Object.assign(k, { ttype: ai ? d.ttype : 'hi', speakers: [...d.speakers], translations: [...d.translations], desc: d.desc, force: d.force, rec: d.rec, auto: d.rec && d.auto, mobile: d.mobile, audio: d.audio, start: t.ev.start, step: 'overview', status: 'scheduled' });
              log('save', `Teams KUDO: meeting created (${k.type}, ${k.speakers.join(', ')} to ${k.translations.join(', ')}, ${k.start})`); toastK('Meeting created'); draw(); } } }, 'SAVE'))));
    }
    const m = tmKudoMeeting(), url = m ? LINK.mobile(m) : '';
    return h('div', { class: 'tm-kudo' }, h('div', { class: 'tm-ktabs' }, h('b', null, 'KUDO'), ...['Overview', 'Users', 'Recordings & transcripts', 'My glossaries'].map((x, i) => h('span', { class: i ? '' : 'on', on: { click: () => { if (i) { log('click', `Teams KUDO: ${x}`); detour(`Teams KUDO: ${x}`); } } } }, x))),
      h('div', { class: 'tm-ov' }, h('div', null,
        h('div', { class: 'k-row' }, h('b', null, 'Meeting Details'), h('button', { class: 'k-link', type: 'button', on: { click: () => { const was = k.start; k.start = t.ev.start; if (k.m) k.m.time = `${k.start} - ${hourEnd(k.start)}`; log('click', `Teams KUDO: Sync meeting (${was} to ${k.start})`); if (was !== k.start) S.flags.synced = true; toastK('Meeting synced with Teams'); draw(); } } }, 'Sync meeting'), h('span', { class: 'pv-gap' }),
          h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Teams KUDO: + Add bot'); if (['denied', 'gone'].includes(t.bot)) t.bot = k.status === 'live' ? 'lobby' : null; toastK('The bot is on its way to the meeting'); draw(); } } }, '+ Add bot')),
        h('h3', null, t.ev.title), h('small', { class: k.status === 'live' ? 'tm-live' : 'k-mini' }, k.status === 'live' ? 'LIVE' : 'Scheduled'),
        h('div', { class: 'k-kv' }, ...[['Description', k.desc || 'None'], ['Date', 'Today'], ['Time', `${k.start} - ${hourEnd(k.start)}`], ['Time zone', 'Europe/Brussels'], ['Languages', k.type === 'ai' ? k.translations.join(', ') : k.speakers.join(', ')]].map(([a, v]) => h('div', null, h('b', null, a), h('span', null, v))))),
      h('div', null, k.mobile ? h('div', null, h('b', null, 'Mobile Link'), h('small', { class: 'k-mini k-break' }, url), h('button', { class: 'k-link', type: 'button', on: { click: () => clipItem('mobile', url, 'Mobile Link (KUDO tab)') } }, 'Copy')) : null,
        h('div', { class: 'k-botbox' }, h('b', null, 'KUDO bot timeout'), h('p', { class: 'k-mini' }, 'The KUDO AI Translator bot will automatically disconnect if no participant is detected after 10 minutes. If the bot drops, simply click "Add bot" to reconnect and resume translation.')))));
  }
  function teamsScreen() {
    const t = S.tm, ev = t.ev;
    if (t.view === 'live') {
      const k = t.kudo, live = k?.step === 'overview';
      if (t.panel === 'chat' && t.bot === 'in' && !S.flags.tmSawChat) { S.flags.tmSawChat = true; log('view', 'Teams: the bot posted the Mobile Link in the chat'); }
      const m = tmKudoMeeting(), url = m ? LINK.mobile(m) : '';
      const opts = ['Original audio', ...(k?.translations || []).map((l) => [l, CODE[l] || l])], capOpts = [['', 'Off'], ...(k?.translations || []).map((l) => [l, CODE[l] || l])];
      const kudoPanel = h('aside', { class: 'tm-side' }, h('b', null, 'KUDO'),
        !t.ok ? h('div', { class: 'tm-disc' }, h('p', null, 'The interpretation and closed captions for this meeting are powered by Artificial Intelligence and automatically generated. The service provider has not actively reviewed the content for accuracy and disclaims any liability for errors or omissions. By continuing, you agree to our Terms of use and Privacy Policy.'), h('button', { class: 'k-btn', type: 'button', on: { click: () => { t.ok = true; log('click', 'Teams KUDO panel: OK'); draw(); } } }, 'OK'))
          : t.bot !== 'in' ? h('p', { class: 'k-mini' }, 'Waiting for the KUDO AI Translator bot to join the meeting.')
            : h('div', { class: 'tm-panel' }, h('div', { class: 'tm-keep' }, 'Keep this window open to continue the live translation and captions. To use the chat, please use the main meetings app.'),
              h('div', { class: 'tm-caps' }, t.cap ? LINE[t.cap] || `(${t.cap} captions)` : h('small', { class: 'k-mini' }, 'Select your preferred listening language')),
              h('small', { class: 'k-mini' }, 'Captions are AI generated'),
              h('div', { class: 'k-row' }, h('label', null, h('small', null, 'Voice'), select(opts, t.voice, (v) => { t.voice = v; log('change', `Teams KUDO panel: Voice ${v}`); draw(); }, 'sm')), h('label', null, h('small', null, 'Captions'), select(capOpts, t.cap, (v) => { t.cap = v; log('change', `Teams KUDO panel: Captions ${v || 'Off'}`); draw(); }, 'sm')))));
      const chat = h('aside', { class: 'tm-side' }, h('b', null, 'Meeting chat'), h('small', { class: 'k-mini' }, `${ev.title}: the meeting started`),
        live ? h('small', { class: 'k-mini' }, 'KUDO was added to this meeting') : null,
        t.bot === 'in' ? h('div', { class: 'vm-msg' }, h('b', null, 'KUDO AI Translator bot'), h('p', null, 'This is the KUDO AI Translator bot, which provides secure real-time speech translation and captions in this meeting. To access the meeting in the language of your choice, scan the QR code on screen. You can also join in your language directly via this link: ', h('button', { class: 'k-link', type: 'button', on: { click: () => clipItem('mobile', url, 'Mobile Link (from the bot)') } }, url))) : null);
      const setPanel = (p) => { const was = t.panel; t.panel = t.panel === p ? null : p; if (was === 'kudo' && t.panel !== 'kudo' && t.bot === 'in' && t.ok) { log('view', 'Teams: KUDO panel closed, translation stopped'); toastK('KUDO closed: the translated audio and captions stopped'); } log('click', `Teams: ${p === 'kudo' ? 'KUDO' : 'Chat'}`); draw(); };
      return h('div', { class: 'vm live tm' }, h('div', { class: 'tm-bar' }, h('b', null, ev.title), h('span', { class: 'pv-gap' }),
          h('button', { type: 'button', class: t.panel === 'chat' ? 'on' : '', on: { click: () => setPanel('chat') } }, 'Chat'), ...['People', 'Raise', 'React', 'Apps'].map((x) => h('button', { type: 'button', on: { click: () => log('click', `Teams: ${x}`) } }, x)),
          live ? h('button', { type: 'button', class: t.panel === 'kudo' ? 'on' : '', on: { click: () => setPanel('kudo') } }, 'KUDO') : null,
          h('button', { type: 'button', on: { click: () => log('click', 'Teams: Camera') } }, 'Camera'), h('button', { type: 'button', on: { click: () => log('click', 'Teams: Mic') } }, 'Mic'),
          h('button', { type: 'button', class: 'end', on: { click: () => { log('click', 'Teams: Leave'); S.flags.tmLeft = true; t.view = 'cal'; t.panel = null; draw(); } } }, 'Leave')),
        t.bot === 'lobby' ? h('div', { class: 'vm-note' }, h('span', null, 'In the waiting room: KUDO AI Translator bot '), h('small', { class: 'tm-unv' }, 'Unverified'), h('span', { class: 'pv-gap' }),
          h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { t.bot = 'denied'; S.flags.tmDenied = true; log('click', 'Teams: Deny the bot'); draw(); } } }, 'Deny'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => { t.bot = 'in'; S.flags.tmAdmitted = true; log('click', 'Teams: Admit the bot'); toastK('KUDO AI Translator bot joined'); draw(); } } }, 'Admit')) : null,
        t.bot === 'denied' ? h('div', { class: 'vm-note bad' }, 'The KUDO AI Translator bot was denied. Use "+ Add bot" in the KUDO tab of the meeting to bring it back.') : null,
        h('div', { class: 'vm-stage' }, h('div', { class: 'vm-grid' }, h('div', { class: 'vm-tile' }, h('span', null, 'You (Organiser)')),
          t.bot === 'in' ? h('div', { class: 'vm-tile bot' }, h('div', { class: 'vm-qr', 'aria-hidden': 'true' }, ...Array.from({ length: 49 }, (_, i) => h('i', { class: (i * 5 + (i >> 3)) % 3 ? '' : 'on' }))), h('span', null, 'KUDO AI Translator bot')) : null),
        t.panel === 'chat' ? chat : t.panel === 'kudo' ? kudoPanel : null));
    }
    const store = t.store ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal tm-store' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Add an app to this meeting'), h('button', { type: 'button', on: { click: () => { t.store = null; draw(); } } }, '×')),
      h('input', { class: 'k-in', placeholder: 'Search apps', value: t.store.q, on: { input: (e) => { t.store.q = e.target.value; }, change: (e) => { log('input', `Teams: app search "${e.target.value}"`); draw(); } } }),
      ...[['KUDO', 'KUDO Inc.', 'Add live translation to any Teams meeting.'], ['Team Polls', 'Poll Labs', 'Quick polls in your meetings.'], ['Whiteboard Plus', 'Draw Co.', 'A shared canvas for your meetings.']].filter(([n]) => !t.store.q || n.toLowerCase().includes(t.store.q.toLowerCase())).map(([n, by, d]) => h('div', { class: 'vm-item' }, h('div', null, h('b', null, n), h('small', { class: 'k-mini' }, `${by}. ${d}`)), h('span', { class: 'pv-gap' }),
        h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('click', `Teams: Add ${n}`); t.store = null; if (n === 'KUDO') { t.signin = { region: 'us' }; } else detour(`Teams: added ${n}`); draw(); } } }, 'Add'))))) : null;
    const signin = t.signin ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal tm-signin' }, h('div', { class: 'k-modal-h' }, h('b', null, 'KUDO'), h('button', { type: 'button', on: { click: () => { t.signin = null; draw(); } } }, '×')),
      h('h3', null, 'Log in'), h('small', null, 'Email'), h('div', { class: 'k-in fake' }, 'events@client-demo.com'), h('small', null, 'Password'), h('div', { class: 'k-in fake' }, '••••••••••  (filled in for you)'),
      h('small', null, 'Meeting data will be processed in:'), select(REGIONS, t.signin.region, (v) => { t.signin.region = v; log('change', `Teams KUDO: data region ${REGIONS.find((r) => r[0] === v)[1]}`); draw(); }),
      h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Teams KUDO: Use meeting link instead'); detour('Use meeting link instead'); toastK('Use the client account here'); } } }, 'Use meeting link instead'),
      h('p', { class: 'k-mini' }, 'Users must have an active KUDO account to access this integration. Please contact our Support Team to create an account.'),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { t.signin = null; draw(); } } }, 'Back'),
        h('button', { class: 'k-btn', type: 'button', on: { click: () => { t.region = t.signin.region; t.signin = null; t.added = true; t.kudo = { step: 'type', type: null }; t.etab = 'kudo'; log('save', `Teams: KUDO added, data in ${REGIONS.find((r) => r[0] === t.region)[1]}`); draw(); } } }, 'Save')))) : null;
    if (t.view === 'event') {
      const f = t.form;
      return h('div', { class: 'vm tm-light' }, h('div', { class: 'vm-top' }, h('b', null, 'Meeting'), h('span', { class: 'pv-gap' }),
          h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { t.store = { q: '' }; log('click', 'Teams: Apps'); draw(); } } }, 'Apps'),
          h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { ev.start = f.start; t.view = 'cal'; log('save', `Teams: meeting saved (${ev.start})`); toastK('Meeting updated'); draw(); } } }, 'Save and close'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => {
            ev.start = f.start; t.view = 'live'; t.panel = null; log('click', 'Teams: Join'); S.flags.tmJoined = true;
            const k = t.kudo; if (k?.step === 'overview') { k.status = 'live'; if (!t.bot) { t.bot = 'lobby'; log('view', 'Teams: the bot waits in the lobby'); } }
            draw(); } } }, 'Join')),
        h('div', { class: 'tm-etabs' }, h('span', { class: t.etab === 'details' ? 'on' : '', on: { click: () => { t.etab = 'details'; draw(); } } }, 'Details'), t.added ? h('span', { class: t.etab === 'kudo' ? 'on' : '', on: { click: () => { t.etab = 'kudo'; log('click', 'Teams: KUDO tab'); draw(); } } }, 'KUDO') : null),
        t.etab === 'kudo' && t.kudo ? tmKudoTab() : h('div', { class: 'vm-form' }, row('Title', h('div', { class: 'k-in fake' }, ev.title)),
          row('Start', h('div', { class: 'k-row' }, h('span', { class: 'k-mini' }, 'Today'), select(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'], f.start, (v) => { f.start = v; log('change', `Teams: start ${v}`); draw(); }, 'sm'), h('span', { class: 'k-mini' }, `to ${hourEnd(f.start)}`))),
          row('Attendees', h('div', null, 'All staff (412)')), row('Location', h('div', { class: 'k-mini' }, 'Teams meeting'))), store, signin);
    }
    return h('div', { class: 'vm tm-light' }, h('div', { class: 'vm-top' }, h('b', null, 'Calendar'), h('span', { class: 'k-mini' }, 'Client Events')),
      h('div', { class: 'vm-list' }, h('h3', null, 'Today'), h('div', { class: 'vm-item k-click', on: { click: () => { t.view = 'event'; t.form = { start: ev.start }; t.etab = 'details'; log('click', `Teams: open ${ev.title}`); draw(); } } }, h('div', null, h('b', null, ev.title), h('small', { class: 'k-mini' }, `Today ${ev.start} - ${hourEnd(ev.start)}, Teams meeting`)), h('span', { class: 'pv-gap' }), h('span', { class: 'k-mini' }, 'Open')),
        h('div', { class: 'vm-item' }, h('div', null, h('b', null, 'Team sync'), h('small', { class: 'k-mini' }, 'Today 16:00 - 16:30, Teams meeting')))));
  }
  const SCREENS = { preview: previewScreen, rtmp: rtmpScreen, interpreters: interpretersScreen, broadcast: broadcastScreen, login: loginScreen, home: homeScreen, meetings: meetingsScreen, glossaries: glossariesScreen, usage: usageScreen, 'new-ai': () => formScreen('new'), 'new-hi': () => formScreen('new'), edit: () => formScreen('edit'), meeting: meetingScreen,
    users: () => usersScreen('all'), participants: () => usersScreen('participants'), operators: () => usersScreen('operators'), viewers: () => usersScreen('viewers'), polls: pollsScreen, 'poll-new': pollNewScreen, poll: pollScreen, files: filesScreen, messages: messagesScreen, recordings: recordingsScreen, av: avScreen, features: featuresScreen, mglossaries: mGlossariesScreen, stats: statsScreen };
  function draw() {
    if (sc.apps?.includes('vmeet')) botTick();
    drawTabs(); const tw = root.querySelector('.sbx-tabs-wrap'); if (tw && !tw.contains(tabStrip)) tw.append(tabStrip);
    if (S.tab !== 'kudo') { root.querySelector('.sbx-url-t').textContent = S.tab === 'site' ? (S.site.mode === 'live' ? 'client-events.example.com/live' : 'editor.sitebuilder.example/client-events') : S.tab === 'vmeet' ? `${PL.host}/${S.vm.mode === 'live' ? 'meeting' : sc.vm === 'meet' ? 'calendar' : 'meetings'}` : S.tab === 'teams' ? (S.tm.view === 'live' ? 'meetings.teamapp.example/live' : 'meetings.teamapp.example/calendar') : 'studio.videoplatform.example/livestreaming'; app.replaceChildren(S.tab === 'site' ? siteScreen() : S.tab === 'vmeet' ? vmScreen() : S.tab === 'teams' ? teamsScreen() : studioScreen()); return; }
    root.querySelector('.sbx-url-t').textContent = S.screen === 'preview' ? (S.pv.role === 'mobile' ? LINK.mobile(S.pv.m).replace('https://', '') : `${LINK[S.pv.role](S.pv.m).replace('https://', '')}/join`) : url();
    app.replaceChildren(SCREENS[S.screen]());
  }
  app.addEventListener('click', (e) => {
    if (S.picker && !e.target.closest('.k-pick-wrap')) { S.picker = null; draw(); }
    if (S.menu && !e.target.closest('.k-tabw, .k-newwrap, .k-rel')) { S.menu = null; draw(); }
  });
  if (sc.setup) { const own = sc.setup({ base: baseMeeting, TODAY }); S.own = own.list; S.mine = own.mine; S.screen = 'login'; }
  log('start', 'Sandbox opened');
  draw();
  if (S.call) { taskBox.hidden = true; root.querySelector('.sbx-browser').hidden = true; drawCall(); } else callBox.hidden = true;
  return root;
}


const fmtS = (s) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
/** The client call in the report: what was asked, what was missed and why it mattered, the solution and why. */
function callReport(b, c) {
  const asked = new Set(c.asked || []), opt = b.options.find((o) => o.id === c.choice), best = b.options.find((o) => o.ok);
  const missed = b.questions.filter((q) => q.key && !asked.has(q.id)), noise = b.questions.filter((q) => !q.key && asked.has(q.id));
  return h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'row spread' }, h('h2', null, 'The client call'), h('span', { class: 'chip grey' }, `Client confidence ${c.confidence}%`)),
    h('div', { class: 'grid g2' },
      h('div', null, h('ul', { class: 'sbx-checks' }, b.questions.filter((q) => q.key).map((q) => h('li', { class: asked.has(q.id) ? 'yes' : 'no' }, mark(asked.has(q.id)), h('div', null, q.q, asked.has(q.id) ? null : h('div', { class: 'muted small' }, q.why))))),
        noise.length ? h('div', { class: 'sbx-traps' }, h('b', null, 'Did not change the set-up'), h('ul', null, noise.map((q) => h('li', null, `${q.q} ${q.why}`)))) : null),
      h('div', null, h('b', null, mark(opt?.ok), ' ', opt?.label || 'No solution chosen'), h('p', { class: 'muted small' }, opt?.why || ''),
        opt?.ok ? null : h('p', { class: 'small' }, h('b', null, 'Best fit: '), `${best.label}. ${best.why}`),
        missed.length ? null : h('p', { class: 'ok small' }, 'You asked every question that decides the set-up.'))));
}
export function report(sc, r, events, saved, onExit) {
  const bar = (label, v, note) => h('div', { class: 'sbx-sc' }, h('div', { class: 'row spread' }, h('b', null, label), h('span', null, `${v}%`)), h('i', { class: 'ph-bar' }, h('i', { style: `width:${v}%` })), h('span', { class: 'muted small' }, note));
  const steps = events.filter((e) => !['start'].includes(e.type));
  return h('div', { class: 'page sbx-report' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Your result: ${r.total}%`), h('p', null, `${sc.title}. ${r.total >= 80 ? 'Passed.' : 'Below the pass mark of 80%.'} ${saved?.record ? 'This first run is your result of record.' : saved ? 'This run is practice: your first run stays your result of record.' : ''}`)),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: () => onExit?.(true) } }, 'Try again'), h('a', { class: 'btn primary', href: `#module-${sc.module}` }, 'Back to the lesson'))),
    r.discovery != null ? h('div', { class: 'grid sbx-bars5' },
      bar('Outcome (45%)', r.outcome, 'Did it end up in the right state'),
      bar('Client call (20%)', r.discovery, 'The questions that decide the set-up'),
      bar('Solution (15%)', r.solution, r.solution ? 'The right fit' : 'Not the best fit'),
      bar('Path (10%)', r.path, `${r.detours} detour${r.detours === 1 ? '' : 's'}, ${r.traps.length} mistake${r.traps.length === 1 ? '' : 's'}, ${r.hints} hint${r.hints === 1 ? '' : 's'}`),
      bar('Time (10%)', r.time, `${fmtS(r.secs)}, full marks up to 7 min`))
    : h('div', { class: 'grid g3' },
      bar('Outcome (70%)', r.outcome, 'Did the meeting end up in the right state'),
      bar('Path (20%)', r.path, `${r.detours} detour${r.detours === 1 ? '' : 's'}, ${r.traps.length} mistake${r.traps.length === 1 ? '' : 's'}, ${r.hints} hint${r.hints === 1 ? '' : 's'}`),
      bar('Time (10%)', r.time, `${fmtS(r.secs)}, full marks up to 5 min`)),
    r.call && sc.brief ? callReport(sc.brief, r.call) : null,
    h('div', { class: 'grid g2', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'What you achieved'), h('ul', { class: 'sbx-checks' }, r.checks.map((c) => h('li', { class: c.ok ? 'yes' : 'no' }, mark(c.ok), c.label))),
        r.traps.length ? h('div', { class: 'sbx-traps' }, h('b', null, 'Mistakes'), h('ul', null, r.traps.map((t) => h('li', null, t)))) : null),
      h('div', { class: 'card' }, h('h2', null, 'The expert\'s path'), h('p', { class: 'sub' }, `About ${Math.round(sc.expertSeconds / 60)} minutes, ${sc.expert.length} steps. You took ${r.actions} actions`), h('ol', { class: 'sbx-expert' }, sc.expert.map((s) => h('li', null, s))))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Your path, step by step'), h('p', { class: 'sub' }, 'Detours and mistakes are marked'),
      h('ol', { class: 'sbx-path' }, steps.map((e) => h('li', { class: e.type }, h('span', { class: 'muted small' }, `${Math.floor(e.t / 60)}:${String(e.t % 60).padStart(2, '0')}`), h('span', null, e.what), e.type === 'detour' ? h('span', { class: 'chip amber' }, 'Detour') : e.type === 'trap' ? h('span', { class: 'chip coral' }, 'Mistake') : e.type === 'hint' ? h('span', { class: 'chip grey' }, 'Hint') : null)))));
}
