// KUDO Academy curriculum. Content is written for KUDO from: the CM Onboarding Guide V3, the KUDO explainer video scripts
// (Academy SharePoint folder) and the current Help Center (support.kudoway.com). Where the sources disagree, the
// decision recorded in the programme document is used (see SOURCE_DECISIONS at the bottom).
// Depth: know = explain it and when to propose it; setup = configure it with the client and run event day;
// handover = spot the trigger, brief Technical Support, stay in the conversation.

export const ACADEMY_FOLDER = 'https://kudolive.sharepoint.com/:f:/g/techsupport/IgC9rpe-0QEST7B7F2PXuJVnAeeaXCwU-OcQ9IxSHBq6pE0?e=lAaHQC';
const HC = 'https://support.kudoway.com/hc/en-us/articles/';
const hc = (id, title) => ({ type: 'article', title, url: HC + id });
const video = (title) => ({ type: 'video', title: `Explainer video: ${title}`, url: ACADEMY_FOLDER, note: 'In the Academy SharePoint folder' });
const guide = (part) => ({ type: 'guide', title: `CM Onboarding Guide V3: ${part}`, url: ACADEMY_FOLDER, note: 'In the Academy SharePoint folder' });

export const DEPTH = {
  know: { label: 'Know', can: 'Explain what it is, who it is for and when to propose it' },
  setup: { label: 'Set up', can: 'Configure it with the client and run event day' },
  handover: { label: 'Hand over', can: 'Spot the trigger, brief Technical Support and stay in the conversation' },
};

export const MODULES = [
  {
    key: 'foundations', title: 'Foundations: how KUDO delivers languages', scenario: null, track: 'core', depth: 'setup', minutes: 60, delivery: 'both',
    summary: 'The two ways KUDO delivers languages, who does what in a meeting, and the lifecycle every scenario follows.',
    objectives: [
      'Explain the difference between Human Interpretation and AI Translation, and say which one a client scenario needs.',
      'Choose between AI Speech & Captions and AI Captions Only with the one-speaker-to-many rule.',
      'Describe the Client, Host, Participant and Viewer roles.',
      'Walk through the meeting lifecycle: plan, create, prepare, rehearse, run, record, review.',
      'Say what to escalate, to whom, and with what information.',
    ],
    sections: [
      { title: 'Two ways to deliver languages', points: [
        'Human Interpretation (HI): professional interpreters work on dedicated language channels.',
        'AI Translation: KUDO listens to the speaker and translates live into speech, captions and transcripts.',
        'Some scenarios are AI only: KUDO for Zoom and the external meeting platforms (Google Meet, Webex, ON24) work with AI Translation only.',
      ] },
      { title: 'The two AI types', points: [
        'AI Speech & Captions: one speaker, many listeners (keynotes, webinars, town halls). AI voice, captions, multilingual recordings and the AI customisation tools. About 90% of clients use it.',
        'AI Captions Only: discussions where speed matters more than voice. Lower latency, captions and transcripts, no AI speech.',
        'The rule: one speaker to many listeners, Speech & Captions. Everyone talks and speed matters, Captions Only. The type is chosen when the meeting is created.',
      ] },
      { title: 'Roles', points: [
        'Client: the admin account where meetings are created and recordings downloaded. It belongs to the team, so recommend a shared inbox.',
        'Host: operates the live meeting (recording, ending the meeting, participants). Joins from an email link and is separate from the Client account.',
        'Participant: speaks with mic and camera. Viewer Only: watches and listens, no mic. Mobile Link and QR: attendees in the room or on mobile, no login.',
      ] },
      { title: 'Lifecycle and habits', points: [
        'Plan the scenario and delivery type before scheduling. Speaker languages are the one decision that cannot change once the meeting starts.',
        'Rehearse with real speakers and real devices before every event.',
        'Recording is not automatic by default: recommend Automatic Recording.',
        'Recordings and transcripts are deleted after 30 days: download on event day.',
        'KUDO has no pause, and a stopped AI meeting cannot be restarted. A full-day event uses one session per block.',
      ] },
    ],
    learn: [video('AI meetings'), guide('Product 01 KUDO Platform'), hc('41123904451735', 'What is the difference between AI Speech & Captions and AI Captions Only?'), hc('41124561864727', 'What happens if the meeting is stopped?')],
    practice: [
      'In a test account, create one AI Speech & Captions meeting and one AI Captions Only meeting, and find the Overview page links.',
      'Explain to a colleague in two minutes which type you would offer for a board town hall and which for a roundtable, and why.',
    ],
    escalate: [
      'Client needs interpreters: Language Services (see the Marketplace module).',
      'A setting is locked or a meeting must be recreated: Technical Support, with the meeting link and what the client expected.',
    ],
    quiz: [
      { q: 'A client runs a keynote with one speaker and 400 listeners who want to hear a translated voice. Which AI type fits?', o: ['AI Captions Only', 'AI Speech & Captions', 'Human Interpretation only', 'Meet Now on the speaker\'s phone'], a: 1, why: 'One speaker to many listeners who want a voice is the AI Speech & Captions case. Captions Only gives text, no AI speech.' },
      { q: 'Which decision cannot be changed once an AI meeting has started?', o: ['The translation languages', 'The speaker languages', 'The Host', 'The meeting links shared'], a: 1, why: 'Speaker languages (and AI customisation) are locked once live. Translation languages can still be updated.' },
      { q: 'Who operates the live meeting (recording, ending it, managing participants)?', o: ['The Client account', 'The Host', 'Any Viewer', 'The interpreter'], a: 1, why: 'The Host is the live operator. They join from an email link and are separate from the Client account.' },
      { q: 'How long are KUDO recordings and transcripts kept?', o: ['7 days', '30 days', '90 days', 'Forever'], a: 1, why: 'They are permanently deleted after 30 days, so the habit is to download them on event day.' },
      { q: 'A full-day event has a lunch break. What is the standard way to handle it in KUDO?', o: ['Press Pause', 'Leave the meeting running', 'One session per content block', 'Restart the stopped meeting after lunch'], a: 2, why: 'KUDO has no pause, and a stopped AI meeting cannot be restarted. Plan one session per block.' },
    ],
  },
  {
    key: 'platform', title: 'The KUDO Meeting Platform', scenario: 'platform', track: 'scenario', depth: 'setup', minutes: 75, delivery: 'both',
    summary: 'Creating and running a meeting on the KUDO platform itself, from New Meeting to downloading recordings.',
    objectives: [
      'Create a meeting with the right type, languages, Host and recording settings.',
      'Map each meeting link to the right audience.',
      'Coach a Host on the live controls and the first troubleshooting step.',
      'Explain billing, the grace period and multi-session events.',
      'Guide the client to the Content tab and the 30-day rule.',
    ],
    sections: [
      { title: 'Create the meeting', points: [
        'Sign in at live.kudoway.com with the Client account, select New Meeting and choose AI Translation or Human Interpretation.',
        'Give it a clear name: attendees see it on the QR landing page.',
        'Set speaker and translation languages, add the Host (Users, Participants, Add Participant) and switch on Automatic Recording in Advanced Settings.',
        'Advanced Settings also hold the logo and Preparation Time, which opens the room early for rehearsals.',
      ] },
      { title: 'Who gets which link', points: [
        'Participant link: speakers and co-hosts with mic and camera.',
        'Viewer Only link: livestream attendees, browser only, no mic.',
        'Widget embed code: an iFrame for third-party event platforms.',
        'Mobile Link and QR: onsite or mobile attendees, no login.',
      ] },
      { title: 'Running it live', points: [
        'The Host joins from the email link in Chrome, Firefox or Edge (not Safari) and checks the source audio reaches KUDO.',
        'Host controls: start and stop recording, end the meeting, manage participants. Ten minutes of practice in a test session makes a big difference.',
        'Adding a language live: Translation Settings, add the language, restart the translation service. Attendees may need to refresh.',
        'First troubleshooting step for quality issues: restart the translation service.',
        'The Speedometer shows speaking pace. Red means the AI is struggling: coach speakers to a natural pace.',
      ] },
      { title: 'Time, billing and recordings', points: [
        'Usage is billed from when someone joins an active session until it is stopped. There is a one-hour grace period after the end time, or Force Close stops it on time.',
        'Create all sessions of a multi-session day in advance so links are ready.',
        'Recordings appear in the Content tab 15 to 20 minutes after the end: one MP4 per language and a VTT transcript per language, including the Floor. Deleted after 30 days.',
      ] },
    ],
    learn: [guide('Product 01 KUDO Platform (setup, live, post-meeting)'), hc('40522205896087', 'Schedule and Configure a KUDO AI Meeting'), hc('28327799023127', 'Advanced Settings for KUDO Meetings'), hc('40843242019095', 'Download KUDO Recordings and Transcripts'), hc('360049665174', 'Is KUDO compatible with all browsers?')],
    practice: [
      'Create a meeting with two speaker languages, three translation languages, a Host and Automatic Recording on.',
      'Run it with a colleague as Host: add a translation language live, then find the recording in the Content tab afterwards.',
    ],
    escalate: [
      'Recording missing after 20 minutes and a refresh: Technical Support, with the meeting ID and end time.',
      'Joining or audio problems on a corporate network: use the IT and network module, then Technical Support.',
    ],
    quiz: [
      { q: 'An attendee will only watch a livestream in a browser and never speak. Which link do they get?', o: ['Participant link', 'Viewer Only link', 'Host email link', 'Operator link'], a: 1, why: 'Viewer Only is browser only with no mic. The Participant link is for people with mic and camera.' },
      { q: 'Translation quality drops during a live AI meeting. What is the first step?', o: ['End the meeting and recreate it with the same links', 'Restart the translation service', 'Change the speaker language to match the speaker', 'Ask every participant to leave and rejoin'], a: 1, why: 'Restarting the translation service resolves most real-time quality issues without disrupting the meeting.' },
      { q: 'Which browser is not recommended for joining KUDO?', o: ['Chrome', 'Edge', 'Firefox', 'Safari'], a: 3, why: 'KUDO needs the latest Chrome, Firefox or Edge. Safari has limitations, such as no screen sharing.' },
      { q: 'The meeting runs past its scheduled end time. What happens by default?', o: ['It stops at the scheduled end time', 'A one-hour grace period applies', 'It keeps running until the Host ends it', 'It pauses until the Host resumes it'], a: 1, why: 'A one-hour grace period applies by default. Force Close stops it exactly at the end time.' },
      { q: 'Where does the client find recordings after the meeting?', o: ['In the Host invitation email', 'In the Content tab of the meeting', 'Behind the Mobile Link, after the event', 'In an email sent to the client automatically'], a: 1, why: 'The Content tab, 15 to 20 minutes after the end. One MP4 and one VTT per language.' },
    ],
  },
  {
    key: 'ai', title: 'AI Translation in depth', scenario: 'ai', track: 'scenario', depth: 'setup', minutes: 60, delivery: 'ai',
    summary: 'What drives AI quality, Automatic Language Detection, latency and what can change once a meeting is live.',
    objectives: [
      'Set speaker languages and Automatic Language Detection correctly.',
      'Explain why delay happens and what improves quality.',
      'Say what can and cannot change once the meeting is live.',
      'Brief speakers so the AI performs well.',
    ],
    sections: [
      { title: 'Languages and detection', points: [
        'Speaker languages are what people speak. Translation languages are what attendees hear or read.',
        'Automatic Language Detection: choose up to ten speaker languages when scheduling. Only those are detected, and it cannot be switched on later: create a new session instead.',
        'Switching is not instant: KUDO needs several seconds and a few phrases. Speak one at a time and never change language mid-sentence. Fewer configured languages means faster detection.',
        'For fast panels, a technician can switch the speaker language manually instead.',
      ] },
      { title: 'Delay and quality', points: [
        'Several seconds of delay is normal: at the start, after a restart, when speakers switch language quickly, or when the connection fluctuates.',
        'Captions Only has lower latency. Speech & Captions listens to the full sentence, like an interpreter, for better output with a slight lag.',
        'The biggest factor is clean audio: a good microphone or headset, natural pace, little background noise, no overlapping speakers.',
        'Attendees can keep the original audio and read translated captions at the same time.',
      ] },
      { title: 'Live changes', points: [
        'Translation languages can be added live (Edit Meeting or Translation Settings, then update).',
        'Speaker languages and AI customisation are locked during the live session.',
        'A stopped AI meeting can never be restarted.',
        'Choose the voice variant where relevant, such as European or Latin American Spanish.',
      ] },
    ],
    learn: [video('AI meetings'), hc('40853761949719', 'Set Up Automatic Language Detection in KUDO'), hc('41124339587735', 'What affects AI translation quality?'), hc('41124350537111', 'Why are captions or translated speech delayed?'), hc('41123952550423', 'Can Speaker (Source) Languages be modified after the meeting begins?')],
    practice: [
      'Run a test AI meeting with Automatic Language Detection on two languages and switch between them. Note how long detection takes.',
      'Write the three-line speaker briefing you would send a client before an AI event.',
    ],
    escalate: ['Consistently poor output despite clean audio and a restart: Technical Support, with the time, languages and a recording.'],
    quiz: [
      { q: 'How many speaker languages can be set for Automatic Language Detection?', o: ['Up to 3', 'Up to 10', 'Up to 32', 'Unlimited'], a: 1, why: 'Up to ten speaker languages are chosen when scheduling, and only those are detected.' },
      { q: 'The client forgot to set up Automatic Language Detection and the meeting is live. What now?', o: ['Switch it on in Translation Settings', 'Create a new session', 'Restart the translation service', 'Ask the Host to enable it'], a: 1, why: 'It cannot be switched on later. Create a new session.' },
      { q: 'Which factor has the biggest effect on AI translation quality?', o: ['The number of attendees', 'The quality of the captured audio', 'The meeting name', 'The number of translation languages'], a: 1, why: 'Clean audio matters most: good mic, natural pace, no background noise, no overlapping speakers.' },
      { q: 'What can still be changed once the AI meeting is live?', o: ['Speaker languages', 'AI customisation', 'Translation languages', 'The AI type'], a: 2, why: 'Translation languages can be updated live. Speaker languages and AI customisation are locked.' },
    ],
  },
  {
    key: 'hi', title: 'Human Interpretation', scenario: 'hi', track: 'scenario', depth: 'setup', minutes: 60, delivery: 'hi',
    summary: 'Running meetings with professional interpreters: channels, booking, preparation materials and timing.',
    objectives: [
      'Set up interpretation language channels and explain how interpreters work on them.',
      'Explain how interpreters are booked and why preparation materials matter.',
      'Know the timing rules for interpreters and the bot on Human Interpretation meetings.',
      'Know which hybrid audio options apply to Human Interpretation only.',
    ],
    sections: [
      { title: 'Channels', points: [
        'Human Interpretation has no locked speaker language: select every language the interpreters will work in, and confirm the list with the interpreter team before saving.',
        'Interpreters join their channel and interpret in both directions.',
        'On the Mobile Link, captions only appear on Human Interpretation meetings when AI Assist & Transcripts is enabled.',
      ] },
      { title: 'Booking and preparation', points: [
        'From the meeting dashboard, Book Interpreters: dates, times, subject matter and any regional variants, then Complete Booking.',
        'Upload preparation materials under Users, Interpreters (slides, glossaries, speaker list, agenda). The Documents tab does not reach interpreters.',
        'Tell the KUDO Project Manager or Language Services about any change to date, languages or schedule. Cancellation charges may apply within 72 hours.',
        'Lead time: the sooner the better. Language Services can usually accommodate 48 hours before the meeting, down to 24 hours for common pairs such as French-English or German-English.',
      ] },
      { title: 'Timing', points: [
        'On Human Interpretation meetings the bot joins 15 minutes before the start, so interpreters have preparation time. (AI meetings: 1 minute before.)',
        'Interpreters join at least 15 minutes early for a sound check. The Host should join early too.',
        'An interpreter works alone for one hour at most, so a longer meeting needs two.',
      ] },
      { title: 'Venue audio (hybrid)', points: [
        'Venue Audio IN brings onsite interpreter booth audio into KUDO. It is for Human Interpretation only: on AI meetings the channels are already used by the AI.',
        'Venue Audio OUT sends KUDO audio to venue systems and works for both AI and Human Interpretation.',
      ] },
    ],
    learn: [guide('Product 01, Human Interpretation steps'), hc('40565164189335', 'Booking Interpreters for KUDO Meetings'), hc('41128252596247', 'What materials should be uploaded for interpreters?'), hc('41128186465687', 'Can meeting details be changed after interpreters are booked?'), hc('41125655990807', 'What is the difference between Venue Audio IN and Venue Audio OUT?')],
    practice: [
      'Create a Human Interpretation meeting with three languages and walk through Book Interpreters up to (not including) Complete Booking.',
      'Explain to a colleague, as if to a client, why preparation materials matter and where to upload them.',
    ],
    escalate: ['Bookings under 48 hours, uncommon pairs, date or language changes after booking: Language Services, straight away.'],
    quiz: [
      { q: 'When does the KUDO bot join a Human Interpretation meeting?', o: ['1 minute before', '5 minutes before', '15 minutes before', 'At the start time'], a: 2, why: 'Fifteen minutes before, so interpreters can prepare. On AI meetings it joins 1 minute before.' },
      { q: 'Where should the client upload preparation materials so interpreters receive them?', o: ['The Documents tab', 'Users, Interpreters', 'The Mobile Link', 'By email to the Host'], a: 1, why: 'Users, Interpreters. The Documents tab does not reach interpreters.' },
      { q: 'Venue Audio IN (bringing booth audio into KUDO) is available for which meetings?', o: ['AI meetings only', 'Human Interpretation only', 'AI and Human Interpretation meetings', 'Neither'], a: 1, why: 'Human Interpretation only. On AI meetings the channels are already used by the AI translation.' },
      { q: 'A client asks for interpreters for a French-English meeting in 30 hours. What do you tell them?', o: ['Not possible: Language Services needs at least 72 hours for every pair', 'Likely: common pairs can go to 24 hours, ask Language Services now', 'Book interpreters yourself in the meeting settings', 'Not possible: offer an AI meeting instead'], a: 1, why: 'The sooner the better, 48 hours is the usual minimum, and common pairs such as French-English can go down to 24 hours.' },
    ],
  },
  {
    key: 'teams', title: 'KUDO for Microsoft Teams', scenario: 'teams', track: 'scenario', depth: 'setup', minutes: 90, delivery: 'both',
    summary: 'Translation inside the Teams meeting through the KUDO app and bot, from the IT setup to the recordings.',
    objectives: [
      'Explain how KUDO works in Teams: a bot joins as an external guest and delivers captions and speech in the KUDO tab.',
      'Name what the client IT must do and send the guide on the first call.',
      'Add KUDO to a Teams meeting and choose the meeting type.',
      'Use Sync Meeting, Add Bot and Cancel Meeting.',
      'Run day one: admit the bot, fix the common audio problem, use the Mobile Link as a fallback.',
      'State what Teams does not support and what to offer instead.',
    ],
    sections: [
      { title: 'IT first', points: [
        'Send the IT guide on the first call: approval can take 24 hours or more.',
        'The Teams admin approves the KUDO app in the Teams admin center and checks the permission policy lets hosts use third-party apps.',
        'The external-bot policy decides whether the bot waits in the lobby. The bot needs no tenant-level permissions.',
        'If third-party apps are off for the organisation, or KUDO is blocked, nobody can add it. Attendees from other organisations follow the host\'s policies; anonymous attendees need app interaction on. Anyone left out still has the Mobile Link.',
      ] },
      { title: 'Setting up', points: [
        'Scheduled meetings work, including recurring meetings, on Teams desktop and mobile.',
        'Invite at least one attendee, then open the meeting in the Teams calendar, Apps, search KUDO, add it and sign in with an active KUDO account (or use a session link) and choose the server region.',
        'Choose Human Interpretation or AI translation, and for AI, Speech & Captions or Captions Only. The choice is locked once created.',
        'Add speaker and translation languages, switch on Automatic Recording and the Mobile Link.',
        'Pick the glossary before the meeting: changes during a live Teams meeting do not apply.',
        'If the Teams meeting moves, click Sync Meeting. Run a full end-to-end test before the first live event.',
      ] },
      { title: 'On the day', points: [
        'AI meetings: the bot arrives about 1 minute before the start and waits in the lobby even if the lobby is open. That is expected. The host opens People and admits it.',
        'If the bot waits more than 10 minutes it leaves: use Add Bot and admit it again. If another organisation hosts the meeting, their organiser admits it.',
        'Attendees open the KUDO tab and choose Captions, Voice or both. Voice in one language and captions in another work together.',
        'No sound: match the audio device in Teams with the computer. If the panel was closed and reopened, click away and back, or reload the app.',
      ] },
      { title: 'Limits and after', points: [
        'Not supported: channel meetings, town halls, webinars, Live events, breakout rooms and Teams in a browser. Town halls and webinars use a manual setup with the Mobile Link.',
        'The in-app limit is 1,000 attendees; the Mobile Link takes the overflow, so share both links for big events.',
        'Check KUDO\'s Content tab, not the Teams recording. Files are deleted after 30 days.',
      ] },
    ],
    learn: [video('KUDO for Teams'), guide('Product 05 KUDO for MS Teams'), hc('44072899383319', 'Allow the KUDO app in your Teams environment'), hc('43884055707031', 'Which Teams meeting types and apps support KUDO?'), hc('44116343509783', 'Why is the KUDO bot waiting in the lobby?'), hc('43884276472087', 'Why is KUDO translation playing through the wrong device in Teams?'), hc('44074923541143', 'Set up a Teams meeting with the KUDO app')],
    practice: [
      'Create a Teams meeting, add KUDO, start it, admit the bot from the lobby and join as an attendee on a second device with Voice in one language and Captions in another.',
      'Remove the bot and bring it back with Add Bot. Move the meeting time and use Sync Meeting.',
      'Role-play the first client call with a colleague acting as IT: explain the admin tasks and timing in under three minutes.',
    ],
    escalate: [
      'Bot never appears after Add Bot, or the app cannot be added: Technical Support with the tenant name, meeting link and a screenshot of the policy.',
      'Town hall, webinar, channel meeting or browser Teams: offer the manual setup with the Mobile Link and involve Technical Support before scheduling.',
    ],
    quiz: [
      { q: 'The KUDO bot is waiting in the Teams lobby although the lobby is open to everyone. What is going on?', o: ['A KUDO fault: the bot should skip the lobby, so call Technical Support', 'Expected: Teams holds detected bots in the lobby, the host admits it', 'The Teams admin has blocked the KUDO app for the organisation', 'The bot joined too early and waits for the scheduled start time'], a: 1, why: 'Teams treats it as an external bot and holds it in the lobby by default. The host admits it from People.' },
      { q: 'Which Teams setup does KUDO NOT support?', o: ['A scheduled meeting on Teams desktop', 'A recurring scheduled meeting', 'A Teams town hall through the KUDO app', 'A scheduled meeting joined from the Teams mobile app'], a: 2, why: 'Town halls, webinars, channel meetings, Live events, breakout rooms and browser Teams are not supported in-app. Town halls use a manual setup with the Mobile Link.' },
      { q: 'A Teams meeting with KUDO is moved to another time. What does the client do in KUDO?', o: ['Nothing', 'Sync Meeting', 'Cancel and recreate', 'Add Bot'], a: 1, why: 'Sync Meeting updates the KUDO meeting and bot timing.' },
      { q: 'What is the in-app attendee limit, and what takes the overflow?', o: ['300, with the Widget on the event page taking the overflow', '1,000, with the Mobile Link taking the overflow', '5,000, with no overflow needed', 'No limit, so no overflow is needed'], a: 1, why: '1,000 attendees in the app. The Mobile Link takes the overflow.' },
      { q: 'An attendee hears nothing in the KUDO tab. What is the first check?', o: ['Recreate the meeting and send everyone the new Teams link', 'Match the audio device in Teams and on the computer', 'Change the speaker language in the KUDO tab', 'Switch the meeting to AI Captions Only'], a: 1, why: 'The common cause is a device mismatch between Teams and the computer.' },
    ],
  },
  {
    key: 'zoom', title: 'KUDO for Zoom', scenario: 'zoom', track: 'scenario', depth: 'setup', minutes: 75, delivery: 'ai',
    summary: 'AI translation next to a Zoom meeting: a bot listens in Zoom, attendees follow on the Mobile Link.',
    objectives: [
      'Explain the two-platform model: Zoom stays Zoom, attendees use the Mobile Link.',
      'Create the Zoom meeting by the three rules and fix the encryption setting.',
      'Name the Zoom admin settings that block the bot.',
      'Link the meeting in KUDO and run the day-of checks.',
    ],
    sections: [
      { title: 'How it works', points: [
        'A KUDO bot joins the Zoom meeting as an external participant and listens. Attendees open translation in the KUDO Mobile Link, on a phone or a second tab.',
        'KUDO for Zoom works with AI Translation only.',
      ] },
      { title: 'In Zoom', points: [
        'Three rules: a standard Meeting (not a Webinar), a new Meeting ID (not the Personal Meeting Room), not recurring.',
        'End-to-end encryption must be off: choose Enhanced encryption, otherwise the bot cannot capture audio.',
        'What blocks the bot: "Only authenticated users can join", the waiting room (the host must admit it), and recording permissions. Zoom treats the bot as a recorder; to auto-approve, allow recording to computer files, allow external participants to record and auto-approve recording permissions. Greyed-out options mean an admin locked them.',
      ] },
      { title: 'In KUDO', points: [
        'New meeting, AI Translation, same title, date and time as in Zoom. Pick the AI type and languages.',
        'Turn on Zoom Meeting and paste the full invite link with every parameter. No Zoom option: ask the Client Manager.',
        'Turn on Automatic Language Detection and Auto-Record. Check both show the same time zone, especially with a VPN.',
        'The glossary chosen on KUDO carries over automatically.',
      ] },
      { title: 'On the day and after', points: [
        'The bot tries to join 1 minute before the start and waits in the waiting room. The host admits it and approves the recording request; without approval the bot hears nothing.',
        'Missing bot: Add Bot. Disconnected: Restart Bot Service. Once in, it shares a QR code; put the Mobile Link in the invitation.',
        'Bot will not join: check the link, that the schedules match, recording permissions, and host approval. Last step: a new Zoom meeting, reconnected.',
        'Afterwards check KUDO for the multilingual recordings, not Zoom.',
      ] },
    ],
    learn: [video('KUDO for Zoom'), guide('Product 04 KUDO for Zoom'), hc('40516264139415', 'Connect KUDO to Zoom, Google Meet or ON24'), hc('41125087550487', 'Why is the KUDO Bot not joining my Zoom meeting?'), hc('41124967575447', 'Why is the KUDO AI Bot requesting recording permissions in Zoom?')],
    practice: [
      'Create a Zoom meeting by the three rules with Enhanced encryption, link it in KUDO and admit the bot, approving the recording request.',
      'Follow the translation on the Mobile Link on your phone while watching Zoom on your computer.',
    ],
    escalate: ['Bot still refused after the four checks and a new meeting: Technical Support with the Zoom account type and a screenshot of the admin settings.'],
    quiz: [
      { q: 'Which Zoom setting stops the KUDO bot from capturing audio?', o: ['A waiting room with the host admitting people', 'End-to-end encryption', 'Enhanced encryption', 'Gallery view for all participants'], a: 1, why: 'With end-to-end encryption on, the bot cannot capture audio. Use Enhanced encryption.' },
      { q: 'Which Zoom meeting is right for KUDO?', o: ['A Zoom Webinar with panelists and attendees', 'The Personal Meeting Room', 'A new, standard, non-recurring Meeting', 'A recurring meeting reused every week'], a: 2, why: 'Standard Meeting, new Meeting ID, not recurring.' },
      { q: 'The bot is in the Zoom meeting but nothing is translated. What is the likely cause?', o: ['The glossary is missing the speaker names', 'The host did not approve the recording request', 'Too many attendees for the bot to translate at once', 'The meeting name has special characters'], a: 1, why: 'Zoom treats the bot as a recorder. Without approval, the bot hears nothing.' },
      { q: 'How do Zoom attendees follow the translation?', o: ['In a KUDO tab inside the Zoom meeting window', 'In the KUDO Mobile Link, on a phone or second tab', 'Through the Zoom language interpretation channels in the toolbar', 'In the KUDO app, signed in with a KUDO account'], a: 1, why: 'Through the Mobile Link or its QR code: no login, no app, no Zoom account needed.' },
    ],
  },
  {
    key: 'external', title: 'External meeting platforms: Google Meet, Webex and ON24', scenario: 'external', track: 'scenario', depth: 'setup', minutes: 75, delivery: 'ai',
    summary: 'The same bot model on other platforms, with the settings each one uses to keep guests out.',
    objectives: [
      'Link a Google Meet, Webex or ON24 event to KUDO with External Meeting.',
      'Name the Webex settings that block the bot.',
      'Set up the KUDO Widget inside the ON24 console.',
      'Run the day-of checks and avoid double audio.',
    ],
    sections: [
      { title: 'The shared model', points: [
        'A KUDO bot joins as an external guest, listens and translates. AI Translation only.',
        'Platform rules: a standard meeting (not a webinar, seminar or live stream), a new meeting ID, not recurring.',
        'In KUDO: AI Translation, same title, date and time, turn on External Meeting, choose the platform and paste the full link. No option: ask the Client Manager. Automatic Language Detection and Auto-Record on, same time zone.',
        'The bot tries to join 1 minute before the start and must be let in by the host. Without that it hears nothing. The glossary carries over automatically.',
        'Attendees use the Mobile Link, ideally on a second device. On the same computer, mute the meeting tab to avoid two audio sources.',
      ] },
      { title: 'Webex', points: [
        'Four settings can block the bot: blocked email domains (Control Hub, Services, Meeting, Settings), the guest rule ("Guests can\'t join" when unlocked), the lobby, and auto-lock.',
        'These belong to the client\'s Webex admin. If the bot is missing, check the lobby list first.',
      ] },
      { title: 'ON24', points: [
        'Check first: the webcast exists and you have its attendee link, External Meeting is enabled on the KUDO account, and coordinate with whoever hosts.',
        'Paste the attendee link in KUDO, then copy the KUDO Mobile Link.',
        'In ON24 Console Builder, Tools Manager, add the URL tool, paste the Mobile Link in Configuration and save. Resize so the full language list shows, test in Preview, then publish.',
        'The host must approve the bot. The ON24 webcast player must stay muted: KUDO is now the audio source. Two voices means the player is still on.',
        'Bot disconnected: Restart Bot Service in the KUDO dashboard.',
      ] },
    ],
    learn: [guide('Product 10 External Meeting Link'), hc('40516264139415', 'Connect KUDO to Zoom, Google Meet or ON24'), hc('40601760089367', 'Start KUDO translation in a Zoom or Google Meet meeting'), hc('40629295397271', 'Add the KUDO Widget to an ON24 webinar')],
    practice: [
      'Link a Google Meet or Webex test meeting to KUDO, let the bot in and follow the translation on your phone.',
      'Explain to a colleague, as to an ON24 client, why the webcast player must stay muted.',
    ],
    escalate: ['A platform not listed, or a client admin who cannot change the guest settings: Technical Support before scheduling.'],
    quiz: [
      { q: 'On ON24, attendees hear two voices at once. What is the fix?', o: ['Restart the KUDO bot in the webcast', 'Mute the ON24 webcast player', 'Remove the glossary from the KUDO meeting', 'Switch the meeting to AI Captions Only'], a: 1, why: 'KUDO is the audio source in the Widget, so the ON24 player must stay muted.' },
      { q: 'Which Webex setting was built to keep AI bots out and can refuse the KUDO bot?', o: ['Blocked email domains', 'Screen share permissions', 'Breakout session assignment', 'Video layout lock'], a: 0, why: 'Admins can block external users by email domain in Control Hub. Ask them to remove the bot\'s domain.' },
      { q: 'When does the bot try to join a Google Meet or Webex AI meeting?', o: ['15 minutes before', '1 minute before', 'At the end', 'Only when the host clicks Add Bot'], a: 1, why: 'For AI meetings the bot joins 1 minute before the start.' },
      { q: 'Where does the KUDO Mobile Link go in ON24?', o: ['The webcast title and description', 'The URL tool in Console Builder', 'A field on the registration form', 'The presenter notes in Studio'], a: 1, why: 'Tools Manager, URL tool, Configuration: paste the Mobile Link there.' },
    ],
  },
  {
    key: 'onsite', title: 'Onsite events and the Mobile Link', scenario: 'onsite', track: 'scenario', depth: 'setup', minutes: 90, delivery: 'both',
    summary: 'A passive audience in a room listening on their own phones: the audio chain, the venue network and the QR journey.',
    objectives: [
      'Describe the audio chain from the mixing desk to KUDO.',
      'Size the venue Wi-Fi with the venue network provider.',
      'Explain the attendee journey and the Mobile Link settings.',
      'Run the pre-event checks and the 60-second test.',
    ],
    sections: [
      { title: 'Audio chain', points: [
        'Mixing desk, to a USB audio interface, to a dedicated laptop joined to the KUDO session as a Participant. One laptop per translated room, on wired internet.',
        'Laptop: Intel Core i5 or equivalent, 8 GB memory, Chrome preferred (Firefox or Edge also work, never Safari), 20 Mbps down and 10 up, TCP 443 and UDP 3478 open, notifications, sleep and updates off.',
        'Passive audience only. If the audience also speaks, it is a hybrid meeting.',
      ] },
      { title: 'Venue network', points: [
        'Involve the venue network provider early and give them the number of attendees: every listener streams audio at the same time.',
        'Plan 48 kbps per listener (500 listeners, about 24 Mbps of wireless capacity).',
        'The limit is airtime per access point, not internet speed: plan 35 listeners or fewer per access point with Wi-Fi 6 and OFDMA (about 11 without), never more than 80 seats per access point. A dedicated 5 GHz network, UDP allowed, no captive portal, no per-device limits. Ask for a written channel plan and test coverage in the seats.',
      ] },
      { title: 'Attendee journey', points: [
        'The Mobile Link and QR are generated with every session on the Overview page. Scan, a browser page opens, pick Voice and Captions, earphones in. No app, no login.',
        'Voice and Captions are independent. Wired earphones are best; keep a supply at registration.',
        'Auto Floor (on by default) sends the original audio. Horizontal Screen Projection suits captions on a big screen. Dynamic QR suits permanent signage.',
        'Each session has its own Mobile Link and QR. Plan one session per block.',
      ] },
      { title: 'Event day', points: [
        'The AV team opens the Participant link on the dedicated laptop, selects the USB interface as the microphone and checks KUDO receives the room audio.',
        'The 60-second ritual before every event: scan the QR on a real phone, choose a language, confirm audio and captions.',
        'No sound after scanning: first ask whether they have earphones in and the volume is up.',
      ] },
    ],
    learn: [video('Onsite events'), guide('Product 02 KUDO Mobile Link'), hc('15106976725399', 'Set up KUDO translation for an onsite event'), hc('44597099026199', 'Plan Wi-Fi requirements for a large event'), hc('41124477228183', 'What Are the KUDO Mobile Link and QR Code?'), hc('43884691886231', 'Why Is There No Audio After I Scan the KUDO QR Code?')],
    practice: [
      'Work out the wireless capacity and the number of access points for a 600-person conference, and write the email to the venue network provider.',
      'Run the 60-second test on a test session with your phone.',
    ],
    escalate: ['Venues with more than a few hundred listeners, or a venue that cannot meet the network requirements: involve Technical Support early.'],
    quiz: [
      { q: 'How much wireless capacity should be planned per listener?', o: ['8 kbps', '48 kbps', '1 Mbps', '5 Mbps'], a: 1, why: '48 kbps per listener is the minimum in KUDO\'s guide, so 500 listeners need about 24 Mbps.' },
      { q: 'What usually limits how many listeners a venue Wi-Fi can serve?', o: ['Internet speed at the venue', 'Airtime per access point', 'The number of languages offered', 'The phone brands attendees use'], a: 1, why: 'Each listener receives many small audio packets, so the limit is listeners per access point.' },
      { q: 'What should the room laptop use to connect?', o: ['Venue guest Wi-Fi', 'Wired internet', 'A phone hotspot', 'Bluetooth'], a: 1, why: 'Wired internet, 20 Mbps down and 10 up.' },
      { q: 'An attendee scanned the QR code and hears nothing. First question?', o: ['Which phone and operating system do you have?', 'Do you have earphones in and the volume up?', 'Did you register for the event first?', 'Is the KUDO app updated on your phone?'], a: 1, why: 'The most common cause is no earphones or volume. No app is needed.' },
      { q: 'The audience also asks questions into microphones. What scenario is this?', o: ['Onsite', 'Hybrid', 'Meet Now', 'HLS'], a: 1, why: 'The onsite setup is for a passive audience. An interactive audience is a hybrid meeting.' },
    ],
  },
  {
    key: 'meetnow', title: 'Meet Now in the KUDO Live app', scenario: 'meetnow', track: 'scenario', depth: 'setup', minutes: 40, delivery: 'ai',
    summary: 'Instant multilingual conversations from a phone, for field teams and spontaneous meetings.',
    objectives: [
      'Say when to recommend Meet Now and how it differs from the Mobile Link.',
      'Start a Meet Now meeting with the right languages and share the QR.',
      'Pick the right participation mode.',
      'Fix the common issues and know the limit to flag.',
    ],
    sections: [
      { title: 'What it is', points: [
        'The instant meeting in the KUDO Live mobile app (iOS and Android, free). Sign in with the KUDO account.',
        'Not the Mobile Link: the Mobile Link is a browser selector for large audiences; Meet Now is the app, for small spontaneous conversations.',
        'More than 60 languages and about 3,000 pairs.',
      ] },
      { title: 'Running it', points: [
        'Tap Meet Now, enter the details with speaker and translation languages, tap Start, then Share to show the participant QR.',
        'Speaker and translation languages cannot be changed once the meeting has started.',
        'Two-Way: everyone has the app and speaks. One-Way: scan the QR, listen or read, no app. Only Captions: text only, good for one-to-one or noisy rooms. Older names: Speaker mode is Two-Way, Viewer-Only is One-Way.',
      ] },
      { title: 'Tips and limits', points: [
        'Use a headset, speak clearly at a natural pace, one at a time, on a stable connection.',
        'Cannot hear: check the listening language and volume. QR fails: check the meeting is active and update the app.',
        'Meet Now has no documented recording or transcript export. If a client asks, take it to the product team.',
      ] },
    ],
    learn: [video('Meet Now'), guide('Product 09 Meet Now'), hc('41136066081047', 'Scheduling to Meet Now on KUDO Live App')],
    practice: ['Start a Meet Now meeting with a colleague in Two-Way mode, then join a second one in One-Way mode by QR only.'],
    escalate: ['Recording or export requests: product team, through Technical Support.'],
    quiz: [
      { q: 'A participant only wants to listen and does not want to install anything. Which mode?', o: ['Two-Way', 'One-Way', 'Only Captions', 'Speaker mode'], a: 1, why: 'One-Way: scan the QR and listen or read along. No app, no login.' },
      { q: 'What cannot change once a Meet Now meeting starts?', o: ['Who can join the meeting', 'Speaker and translation languages', 'The listening volume on each phone', 'Whether the QR code is on screen'], a: 1, why: 'Set the languages before tapping Start.' },
      { q: 'A client asks to download the Meet Now transcript. What do you say?', o: ['It is in the meeting\'s Content tab, like any other KUDO recording', 'There is no documented export: you take it to the product team', 'It is emailed to the organiser automatically after the meeting ends', 'Embed the Widget on a page and export the transcript from there'], a: 1, why: 'Meet Now has no documented recording or transcript export.' },
    ],
  },
  {
    key: 'widget', title: 'Third-party event platforms: the KUDO Widget', scenario: 'widget', track: 'scenario', depth: 'handover', minutes: 60, delivery: 'both',
    summary: 'The Mobile Link embedded in the client\'s website or event platform, fed by a manual AV ingest.',
    objectives: [
      'Explain the two parts that must both run: AV ingest and the embed.',
      'Spot when a technical person and Technical Support are needed.',
      'Brief the web team on the session-specific code and placement.',
      'Plan the joint end-to-end test.',
    ],
    sections: [
      { title: 'Two parts', points: [
        'The Widget is the Mobile Link language selector embedded as an iFrame. It only delivers language access: KUDO does not tap into the platform audio like a bot.',
        'Part one, AV ingest: an AV operator captures the platform audio and video with OBS Studio or VB-Cable and joins the KUDO session as a Participant. Needs a technical person, tested in advance.',
        'Part two, the embed: copy the Widget code from Language Access on the Overview page and give it to the web team. Place it beside the player (starting size 375 by 500 pixels), below it on mobile.',
      ] },
      { title: 'Rules', points: [
        'The code is specific to the session: every event needs a new one, and it deactivates when the session ends.',
        'The player and the Widget are separate audio sources: mute the player to hear only the translation. The Auto-Floor API can automate this; the iFrame alone does not.',
        'Up to 32 languages per event, spoken and sign.',
        'One full test with the AV operator, the web team and KUDO active at the same time.',
      ] },
    ],
    learn: [video('Widget'), guide('Product 03 KUDO Widget'), hc('43897688162711', 'Embed the KUDO Widget Beside a Livestream on Your Website'), hc('10726578611223', 'Implement Auto-Floor API for KUDO Widget'), hc('40782565823895', 'Send Computer Audio and Video to KUDO')],
    practice: ['Draw the two-track runsheet (AV ingest and web) for a client webinar on their own platform and review it with a TSE.'],
    escalate: ['Every first Widget deployment and any ingest setup: Technical Support, with the platform name, who the AV operator is and the event date.'],
    quiz: [
      { q: 'The Widget shows on the page but nothing is translated. What is missing?', o: ['A glossary for the speaker names', 'The AV ingest into the KUDO session', 'A KUDO bot admitted to the platform meeting', 'AI Captions Only on the session'], a: 1, why: 'Without someone capturing the platform audio and sending it into KUDO, there is nothing to translate.' },
      { q: 'Can the same Widget code be reused for next month\'s event?', o: ['Yes, the code stays valid for the account', 'No, the code is session-specific', 'Only if the event uses the same platform', 'Only if Auto Floor is switched on'], a: 1, why: 'Each session has its own code. Updating it is a fixed step every time.' },
      { q: 'Which tools are typically used for AV ingest?', o: ['Dante and DVS on the venue network', 'OBS Studio or VB-Cable', 'YouTube Studio', 'The KUDO Live app on a phone'], a: 1, why: 'OBS Studio or VB-Cable capture the platform audio and send it into KUDO as a Participant.' },
    ],
  },
  {
    key: 'hybrid', title: 'Hybrid events and the Audio Manager', scenario: 'hybrid', track: 'scenario', depth: 'handover', minutes: 60, delivery: 'both',
    summary: 'Connecting KUDO to a venue conference system (Bosch, Televic, TAIDEN) through the Audio Manager and Dante.',
    objectives: [
      'Explain what the Audio Manager does and when Hybrid is the answer.',
      'Know the difference between Venue Audio IN and OUT, and which meetings each supports.',
      'Know what the client\'s AV engineer needs, and hand the routing to Technical Support.',
    ],
    sections: [
      { title: 'The bridge', points: [
        'KUDO Hybrid adds the Audio Manager role, which routes language channels OUT of KUDO to the room and IN from the venue for remote attendees.',
        'Typical case: a venue with Bosch DICENTIS, Televic PLIXUS or TAIDEN that the client keeps.',
        'The host switches Audio Manager on in Advanced settings, chooses who joins via KUDO, and adds the Audio Manager on the Users tab before the meeting starts.',
      ] },
      { title: 'IN and OUT', points: [
        'Venue Audio OUT sends KUDO audio to Dante networks, PA systems, recorders or listening devices. AI and Human Interpretation.',
        'Venue Audio IN brings venue audio such as interpreter booth feeds into KUDO. Human Interpretation only.',
        'The Audio Manager is a technical person, usually the AV engineer, running Dante Virtual Soundcard on Windows (WDM, 16 by 16 channels) on a wired connection. The browser tab stays open all meeting.',
      ] },
      { title: 'Hand over', points: [
        'The first Dante routing is a technical project, not a day-of setup: involve KUDO Technical Support from the start.',
        'Test everything together in the real venue, channel by channel, IN and OUT, at least 30 minutes before go-live.',
        'Two roles during the event: the Audio Manager on routing and the KUDO Host on the meeting, with a direct line between them.',
      ] },
    ],
    learn: [video('Hybrid'), guide('Product 06 KUDO Hybrid'), hc('41125660822423', 'What is Audio Manager used for?'), hc('41125655990807', 'What is the difference between Venue Audio IN and Venue Audio OUT?'), hc('40782661072279', 'Route KUDO Translation Audio to a Dante Network'), hc('40563161655319', 'Receiving Interpreter Booth Audio Via Dante')],
    practice: ['Write the hand-over email to Technical Support for a client with a Televic system, using what you would ask on the first call.'],
    escalate: ['Any Hybrid request: Technical Support, with the conference system, whether Dante is available, the AV contact and the date.'],
    quiz: [
      { q: 'A client wants onsite interpreter booth audio sent into KUDO for an AI meeting. Is that possible?', o: ['Yes: Venue Audio IN works for AI and Human Interpretation meetings', 'No: Venue Audio IN is for Human Interpretation only', 'Yes, if the AV ingest sends it through the Widget', 'Yes, by running it as a Meet Now session'], a: 1, why: 'Venue Audio IN works only for Human Interpretation. Venue Audio OUT works for both.' },
      { q: 'Who usually acts as Audio Manager?', o: ['The keynote speaker', 'The client\'s AV engineer', 'An interpreter in the booth', 'Any attendee with a laptop'], a: 1, why: 'A technical person, usually the AV engineer or conference system operator.' },
      { q: 'What is your role on a first Hybrid deployment?', o: ['Configure the Dante routing yourself with the AV team', 'Spot it, brief Technical Support, stay in the loop', 'Decline it: KUDO does not support hybrid events', 'Send the Mobile Link and let the venue handle the rest'], a: 1, why: 'Hybrid is a hand-over scenario: the first routing is a technical project for Technical Support.' },
    ],
  },
  {
    key: 'rtmp', title: 'Streaming to YouTube, Facebook and IBM (RTMP)', scenario: 'rtmp', track: 'scenario', depth: 'handover', minutes: 45, delivery: 'both',
    summary: 'Pushing each KUDO language as its own live stream to social or video platforms.',
    objectives: [
      'Explain RTMP and when to propose it instead of HLS.',
      'Know the prerequisites and the per-platform limits.',
      'Avoid the most common mistake: reusing a stream key.',
      'Know the first troubleshooting checks and when to hand over.',
    ],
    sections: [
      { title: 'Prerequisites and limits', points: [
        'The meeting must be a Large Meeting and RTMP must be enabled on the account. No Broadcast tab means it is not enabled: customer service.',
        'YouTube and Facebook: one language per stream, three streams maximum each. IBM Video Streaming: several languages per stream and its own IBM account.',
        'Up to 15 stream and language combinations per meeting, at most three of them sign language.',
      ] },
      { title: 'Setup', points: [
        'Each language needs its own YouTube destination and stream key. Reusing a key interrupts the live stream.',
        'Settings, Broadcast, RTMP Stream on, Add RTMP Stream: casting medium, Server URL, Stream Key and language. Repeat per language.',
        'Start the KUDO meeting first, then the broadcast. Expect 10 to 25 seconds of delay on YouTube.',
        'Avoid Safari, which publishes audio only.',
      ] },
      { title: 'Troubleshooting', points: [
        'Won\'t start: check the URL and key, that the destination stream is active, the language channel is available, and the broadcast was started in KUDO.',
        'Unstable: check upload bandwidth, stop, verify URL and key, restart.',
      ] },
    ],
    learn: [video('YouTube RTMP'), guide('Product 08 Broadcast to YouTube / Facebook'), hc('40566660461847', 'Configuring RTMP Streaming to YouTube'), hc('41128268189847', 'Can multiple languages share the same YouTube Stream Key?')],
    practice: ['Explain to a colleague, as to a client, why three languages on YouTube need three destinations and three keys.'],
    escalate: ['First RTMP setup for a client, IBM streams and sign language combinations: Technical Support.'],
    quiz: [
      { q: 'A client wants English, French and Spanish on YouTube. How many stream keys?', o: ['One', 'Two', 'Three', 'None'], a: 2, why: 'One language, one destination, one key. Reusing a key interrupts the stream.' },
      { q: 'The Broadcast tab is missing in the meeting. Most likely reason?', o: ['The Host joined from Safari, which hides the Broadcast tab', 'RTMP is off for the account, or it is not a Large Meeting', 'The meeting has more languages than the Broadcast tab allows', 'The glossary has not been published for the meeting'], a: 1, why: 'RTMP must be enabled on the account and the meeting set to Large Meeting.' },
      { q: 'In which order do you start things?', o: ['Broadcast first, then the meeting', 'Meeting first, then the broadcast', 'Either order works', 'YouTube starts both together'], a: 1, why: 'The RTMP stream needs a live session to connect.' },
    ],
  },
  {
    key: 'hls', title: 'Broadcast to another web page (HLS)', scenario: 'hls', track: 'scenario', depth: 'handover', minutes: 45, delivery: 'both',
    summary: 'An unlimited audience on the client\'s own web page through the Broadcasting widget.',
    objectives: [
      'Say when HLS is the right choice and how it differs from RTMP and the real-time widget.',
      'Know the setup steps and the limits to flag up front.',
      'Set expectations on delay and auto-floor.',
    ],
    sections: [
      { title: 'When', points: [
        'For large or unlimited audiences on the client\'s own page, or a platform that cannot take RTMP.',
        'Three viewer options for Large Meetings: Real Time Widget (normal capacity, registration), Broadcasting HLS widget (unlimited viewers, about 15 to 20 seconds delay, no registration) and SmartLink.',
      ] },
      { title: 'Setup', points: [
        'Large Meeting only. Resolution 720 at 30 fps on Configuration, then Broadcast tab, HLS on. Missing tab: customer service to enable it.',
        'Stream duration up to 4 hours (default 30 minutes).',
        'Copy Widget Code, choose Broadcasting (not Real Time) and place it inside the page body.',
        'Up to 9 video tiles and 50 audio language streams. Only add languages that will be used.',
      ] },
      { title: 'Limits and live behaviour', points: [
        'Only on .com and .eu servers. No sign language on the HLS widget. Interpreters must publish within 15 minutes of the broadcast start.',
        'Start the meeting, have participants and interpreters join with mics on, then Start Broadcast.',
        'A channel idle for 50 seconds switches viewers to the Floor. If everyone stops publishing for 1 minute, the broadcast stops.',
      ] },
    ],
    learn: [guide('Product 07 Broadcast to another Web Page'), hc('41128351153687', 'Can KUDO stream both original audio and translated languages?')],
    practice: ['Compare HLS, RTMP and the real-time widget for three client cases with a colleague and agree on the right one for each.'],
    escalate: ['Any HLS setup and any event over a few thousand viewers: Technical Support.'],
    quiz: [
      { q: 'What delay should a client expect on the HLS widget?', o: ['None', 'About 1 second', 'About 15 to 20 seconds', 'About 2 minutes'], a: 2, why: 'Fifteen to twenty seconds behind the live session is normal.' },
      { q: 'Which meeting setting is required for HLS?', o: ['Captions Only', 'Large Meeting', 'Recurring', 'Meet Now'], a: 1, why: 'HLS only works on meetings set to Large Meeting.' },
      { q: 'Interpreters must start publishing within what time of the broadcast start?', o: ['1 minute', '15 minutes', '1 hour', 'Any time'], a: 1, why: 'Within 15 minutes, or their channel will not be available to viewers.' },
    ],
  },
  {
    key: 'glossary', title: 'KUDO Glossary', scenario: null, related: ['ai'], track: 'cross', depth: 'setup', minutes: 45, delivery: 'ai',
    summary: 'The briefing pack for the AI: the five actions, the limits and how a glossary reaches each meeting.',
    objectives: [
      'Choose the right action for a term.',
      'Know the limits and who can create glossaries.',
      'Apply a glossary to a meeting and know what happens live.',
    ],
    sections: [
      { title: 'Five actions', points: [
        'Recognize helps the AI hear a term (KUDO, not kudos). Replace enforces a spelling. Block keeps a term out. Do-not-translate keeps a name as it is. Translate as uses an approved translation, in up to 32 languages.',
        'Do-not-translate and Translate as work only with AI Speech & Captions. Human Interpretation and Captions Only meetings support Recognize, Replace and Block.',
        'Minimum for every event: the client\'s company, product and presenter names.',
      ] },
      { title: 'Limits', points: [
        'Unlimited glossaries per account, one per meeting. Only the Client role creates them.',
        'Per glossary: Recognize 1,000 terms, Do-not-translate 1,000, Replace 500, Block 500, Translate as 2,000 entries. AI generation: up to 100 terms per request, 1,000 per day per account.',
      ] },
      { title: 'Using it', points: [
        'My glossaries, Create glossary, then Add term, Import terms (KUDO template, one action per import) or Generate terms with AI, reviewed before adding.',
        'In the meeting: My glossaries tab, Use for this meeting. Otherwise the default glossary applies. It carries over to Zoom, Webex, ON24 and Google Meet.',
        'Live, a Client can add terms and restart translation: captions pause about five seconds. Not in the KUDO app in Teams: finish the glossary first.',
      ] },
    ],
    learn: [video('Glossary'), hc('44101630720663', 'Get started with KUDO glossaries'), hc('44219832457367', 'What are the limits for KUDO glossaries?'), hc('28614844039703', 'Which glossary action should I use for a term?'), hc('44133495219991', 'How do KUDO glossaries work in Microsoft Teams meetings?')],
    practice: ['Build a 10-term glossary for a fictional client event using at least four actions, and apply it to a test meeting.'],
    escalate: ['Glossary not applied on a platform where it should carry over: Technical Support with the meeting ID.'],
    quiz: [
      { q: 'The AI keeps writing "kudos" instead of "KUDO". Which action?', o: ['Block', 'Recognize', 'Translate as', 'Do-not-translate'], a: 1, why: 'Recognize helps the AI hear the term correctly.' },
      { q: 'How many glossaries can a meeting use?', o: ['One', 'Five', 'Ten', 'Unlimited'], a: 0, why: 'Unlimited per account, one per meeting.' },
      { q: 'Which actions need AI Speech & Captions?', o: ['Recognize and Block', 'Replace and Block', 'Do-not-translate and Translate as', 'All five'], a: 2, why: 'Do-not-translate and Translate as only work with AI Speech & Captions.' },
      { q: 'What is the Replace limit per glossary?', o: ['100', '500', '1,000', '2,000'], a: 1, why: 'Replace and Block: 500. Recognize and Do-not-translate: 1,000. Translate as: 2,000 entries.' },
    ],
  },
  {
    key: 'network', title: 'IT, security and network basics', scenario: null, related: ['onsite', 'teams', 'widget', 'platform'], track: 'cross', depth: 'know', minutes: 40, delivery: 'both',
    summary: 'What to tell a client IT team: domains, ports, proxies, VPNs and the signs of a blocked network.',
    objectives: ['Give IT the domains and ports KUDO needs.', 'Recognise the signs of a network restriction.', 'Know when to bring in Technical Support.'],
    sections: [
      { title: 'What IT allows', points: [
        'Domains by region: *.kudoway.com (USA and Asia-Pacific), *.kudoway.eu (Europe), *.kudoway.ca (Canada), plus *.tokbox.com and *.opentok.com.',
        'Ports: TCP 443 required; UDP 3478 recommended for better quality. Do not block or throttle UDP; without it media falls back to TCP 443 at lower quality.',
        'Proxies must be transparent or set in the browser. Proxies that need authentication are not supported.',
        'SSO is available for client accounts.',
      ] },
      { title: 'Signs and habits', points: [
        'Signs: meetings that won\'t join, endless loading, missing audio, channels that don\'t load, the KUDO panel missing in Teams, frequent disconnects.',
        'Page and captions load but no audio: check whether UDP is blocked first.',
        'VPNs can cause time zone mismatches that delay the bot and can hurt audio.',
        'At onsite events: no captive portal, no per-device limits, no UDP filtering on the attendee network.',
      ] },
    ],
    learn: [hc('360023782574', 'Firewall & Network Requirements'), hc('360062473013', 'How using VPNs affect KUDO meetings'), hc('40387422089239', 'KUDO Single Sign-On (SSO) Implementation'), hc('360050873954', 'Network Access & Regional Restrictions')],
    practice: ['Write the short email you would send a client IT team before their first KUDO event.'],
    escalate: ['Firewall inspection, regional restrictions or SSO setup: Technical Support with the client IT contact.'],
    quiz: [
      { q: 'Which port is required for KUDO?', o: ['TCP 21', 'TCP 443', 'UDP 53', 'TCP 8080'], a: 1, why: 'TCP 443 is required. UDP 3478 is recommended for quality.' },
      { q: 'The page and captions load but there is no audio on a corporate network. First thing to check?', o: ['Whether the glossary loaded', 'Whether UDP is blocked', 'Whether the meeting name is valid', 'The browser zoom level'], a: 1, why: 'Blocked or filtered UDP is the first suspect.' },
      { q: 'Which proxies does KUDO not support?', o: ['Transparent proxies', 'Proxies set in the browser', 'Proxies that require authentication', 'None: every proxy is supported'], a: 2, why: 'Proxies that need authentication are not supported.' },
    ],
  },
  {
    key: 'marketplace', title: 'Marketplace and KUDO interpreters', scenario: null, related: ['hi'], track: 'cross', depth: 'know', minutes: 30, delivery: 'hi',
    summary: 'What Marketplace is, what it does and how clients reach it. Surface level: Language Services owns the detail.',
    objectives: ['Explain what Marketplace does for a client.', 'Say how a client books and what they must provide.', 'Give the right lead time and point to Language Services.'],
    sections: [
      { title: 'What it is', points: [
        'KUDO Marketplace books professional simultaneous interpreters: KUDO Pro interpreters, vetted and KUDO Certified.',
        'It matches interpreters by language, expertise and availability. If an interpreter does not show, another is engaged automatically.',
      ] },
      { title: 'How clients reach it', points: [
        'Schedule the meeting with its languages, then Book Interpreters from the meeting. Book only part of a meeting if needed; add subject matter and tags.',
        'Upload preparation materials under Users, Interpreters. Interpreters join at least 15 minutes early.',
        'Lead time: the sooner the better for the best match. Language Services can usually do 48 hours, down to 24 hours for common pairs.',
        'Cancellation: free more than 72 hours ahead, 50% between 72 and 24 hours, 100% under 24 hours. Changes to date, time or languages go to Language Services.',
      ] },
    ],
    learn: [video('Marketplace'), hc('40565164189335', 'Booking Interpreters for KUDO Meetings'), hc('41128176050711', 'Can interpreters be booked for only part of a meeting?'), hc('41128153728279', 'Why should preparation materials be uploaded?')],
    practice: ['Explain Marketplace to a colleague in one minute, including the lead time and where materials go.'],
    escalate: ['Everything beyond surface level (rates, specific interpreters, quality complaints, last-minute bookings): Language Services.'],
    quiz: [
      { q: 'What lead time do you give a client for interpreters?', o: ['12 hours is enough for any language pair', '48 hours usually, 24 for common pairs', 'One month minimum for any human interpretation', 'Same day is always possible for common pairs'], a: 1, why: 'Language Services can usually do 48 hours, down to 24 hours for common pairs like French-English.' },
      { q: 'A client cancels 50 hours before the meeting. What applies?', o: ['No charge', '50%', '100%', 'It depends on the interpreter'], a: 1, why: 'Between 72 and 24 hours: 50%. More than 72 hours: free. Under 24 hours: 100%.' },
    ],
  },
  {
    key: 'ringcentral', title: 'KUDO for RingCentral events', scenario: null, related: ['widget', 'external'], track: 'cross', depth: 'handover', minutes: 30, delivery: 'both',
    summary: 'A KUDO tab inside RingCentral stages and sessions, fed by the event audio. Not a bot.',
    objectives: ['Explain the two parts that must run together.', 'Know where the KUDO Meeting ID goes in RingCentral.', 'Run the basic checks.'],
    sections: [
      { title: 'How it works', points: [
        'Not a bot: a KUDO tab inside the RingCentral stage or session. AI or Human Interpretation.',
        'Two parts: the event audio and video must reach KUDO (an AV operator joins with the Participant link, virtual audio cable as mic, OBS virtual camera for video), and the KUDO tab must be enabled in RingCentral.',
      ] },
      { title: 'Setup and checks', points: [
        'Copy the Mobile Link: the 11 or 12 digit Meeting ID inside it goes into Widget ID under Venue, Stages or Sessions, Apps, KUDO. Name the tab, select Enabled, clear RingCentral captions (English only), save.',
        'Speaker language cannot change once the meeting starts.',
        'No tab: not enabled. No access: wrong Meeting ID. No audio: the KUDO meeting has not started. Changes not applied: save again and refresh.',
      ] },
    ],
    learn: [video('RingCentral'), hc('40788487466391', 'Integrating with RingCentral')],
    practice: ['Walk a colleague through where the Meeting ID goes in RingCentral, from memory.'],
    escalate: ['Every first RingCentral event and the AV ingest: Technical Support.'],
    quiz: [
      { q: 'What does RingCentral need from KUDO to show the KUDO tab?', o: ['The Zoom link of the event', 'The KUDO Meeting ID from the Mobile Link', 'The Webinar ID that RingCentral shows on the event page', 'The glossary file for the event'], a: 1, why: 'The 11 or 12 digit Meeting ID inside the Mobile Link goes into Widget ID.' },
      { q: 'The KUDO tab shows but there is no audio. Likely cause?', o: ['The KUDO meeting has not started', 'The tab name is wrong', 'RingCentral captions are switched on for the event', 'Too many attendees in the event'], a: 0, why: 'No audio usually means the KUDO meeting is not running.' },
    ],
  },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m]));
export const MODULE_FOR_SCENARIO = Object.fromEntries(MODULES.filter((m) => m.scenario).map((m) => [m.scenario, m.key]));

// Decisions where sources disagree (shown in the admin Curriculum page).
export const SOURCE_DECISIONS = [
  { topic: 'Bot join time', decision: 'AI meetings: 1 minute before the start. Human Interpretation meetings: 15 minutes before. The Guide says 15 minutes for Zoom and external platforms, which are AI meetings.' },
  { topic: 'Glossary limits', decision: 'Glossary video and Help Center: unlimited glossaries, one per meeting; Recognize and Do-not-translate 1,000, Replace and Block 500, Translate as 2,000 entries. The Guide figures (5 glossaries, 500 terms) are outdated.' },
  { topic: 'Venue Audio IN', decision: 'Human Interpretation only (confirmed by Nils). Venue Audio OUT works for both.' },
  { topic: 'Interpreter lead time', decision: 'The sooner the better; Language Services can usually do 48 hours, down to 24 hours for common pairs. The Marketplace video says 12 hours, which is outdated.' },
  { topic: 'Teams bot join time', decision: 'Kept at about 1 minute before for AI meetings (Nils\'s rule and the Teams video). The Help Center article "Set up a Teams meeting with the KUDO app" says about 10 minutes: to be aligned.' },
  { topic: 'Teams recurring meetings', decision: 'Help Center (October 2026): recurring scheduled meetings are supported. The Guide says never use them, which is outdated. Breakout rooms are still not supported.' },
];
