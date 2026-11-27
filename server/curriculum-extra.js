// Assessment content beyond single-answer questions. Written for KUDO from the same sources as curriculum.js.
// Types: multi = pick all that fit (wrong picks cancel right ones, so guessing does not pay);
// match = match each situation to the right answer; order = put the steps in the right order.

export const EXTRA_ITEMS = {
  foundations: [
    { t: 'multi', q: 'An AI meeting is live. Which of these are still true?', o: ['Translation languages can still be added', 'Speaker languages can be changed', 'A stopped meeting can be restarted', 'The Host can start or stop recording'], a: [0, 3], why: 'Translation languages can be updated live and the Host controls recording. Speaker languages are locked, and a stopped AI meeting cannot be restarted.' },
    { t: 'match', q: 'Match each person to the link they get.', pairs: [['A keynote speaker', 'Participant link'], ['A livestream viewer who never speaks', 'Viewer Only link'], ['An attendee in the room with a phone', 'Mobile Link and QR'], ['The web team embedding access on the event site', 'Widget embed code']], why: 'Participants speak; Viewer Only is browser only with no mic; the Mobile Link is for phones with no login; the Widget code goes on a web page.' },
    { t: 'order', q: 'Put the meeting lifecycle in order.', steps: ['Plan the scenario and delivery type', 'Create the meeting and set the languages', 'Rehearse with real speakers and devices', 'Run the event', 'Download the recordings on the day'], why: 'Plan first (speaker languages cannot change later), rehearse before the event, and download on the day because files go after 30 days.' },
    { q: 'A roundtable where everyone answers each other quickly. Which AI type?', o: ['AI Speech & Captions', 'AI Captions Only', 'Human Interpretation only', 'Meet Now'], a: 1, why: 'Speed matters more than voice in a discussion: Captions Only has lower latency.' },
  ],
  platform: [
    { t: 'multi', q: 'Which of these should be set before the event?', o: ['Automatic recording, ticked on the meeting form', 'A Host added from Users, Participants', 'The speaker languages', 'The Speedometer', 'The order in which attendees will speak'], a: [0, 1, 2], why: 'The Speedometer is a live coaching tool, not a setting.' },
    { t: 'order', q: 'Adding a translation language during a live meeting: put the steps in order.', steps: ['Open Edit meeting', 'Add the language and click Update', 'Restart the translation service', 'Tell attendees to refresh if they do not see it'], why: 'Add, restart the translation service (about 30 seconds), then attendees may need to refresh.' },
    { q: 'The client cannot see the recordings right after the meeting. What do you say?', o: ['They are lost', 'Wait 15 to 20 minutes and refresh the Content tab', 'The Host will receive them by email', 'Restart the meeting'], a: 1, why: 'Processing takes 15 to 20 minutes after the end.' },
    { q: 'The Speedometer needle is in the red. What does it mean?', o: ['The network is down', 'The speaker is going too fast for the AI', 'Recording has stopped', 'Too many attendees'], a: 1, why: 'Red means the AI is struggling to keep up with the pace: coach the speaker to slow down.' },
  ],
  ai: [
    { t: 'multi', q: 'Which of these improve AI translation quality?', o: ['A good microphone or headset', 'Speakers taking turns', 'Configuring more speaker languages than needed', 'A natural, steady pace', 'Switching language mid-sentence'], a: [0, 1, 3], why: 'Clean audio, turn-taking and a natural pace help. Extra languages slow detection; switching mid-sentence confuses it.' },
    { t: 'match', q: 'Match each client need to the right delivery.', pairs: [['Attendees want to hear a translated voice', 'AI Speech & Captions'], ['Fast back-and-forth where speed matters most', 'AI Captions Only'], ['A legal hearing that needs professional interpreters', 'Human Interpretation']], why: 'Voice: Speech & Captions. Speed: Captions Only. Professional interpreters: Human Interpretation.' },
    { q: 'Captions lag for a few seconds right after a speaker switches from English to Spanish. Why?', o: ['A fault: restart the meeting', 'Detection needs a few phrases of the new language', 'Spanish is not supported', 'The glossary is missing'], a: 1, why: 'Automatic Language Detection needs several seconds and a few phrases to settle.' },
  ],
  hi: [
    { t: 'multi', q: 'What should a client upload for their interpreters?', o: ['Slides', 'Speaker list', 'Agenda', 'Glossary', 'Their KUDO password', 'The attendee email list'], a: [0, 1, 2, 3], why: 'Preparation materials, drafts welcome. Never credentials.' },
    { t: 'match', q: 'Match each case to the right answer.', pairs: [['The bot on a Human Interpretation meeting', '15 minutes before'], ['The bot on an AI meeting', '1 minute before'], ['A 90-minute meeting', 'Two interpreters per language']], why: 'The bot joins 15 minutes early on HI meetings so interpreters can prepare, 1 minute on AI meetings. One interpreter works one hour at most.' },
    { q: 'What makes captions appear on the Mobile Link in a Human Interpretation meeting?', o: ['Nothing, they always appear', 'AI Assist & Transcripts is enabled', 'A glossary is applied', 'Captions Only mode'], a: 1, why: 'In HI meetings captions only show when AI Assist & Transcripts is enabled.' },
  ],
  teams: [
    { t: 'multi', q: 'Which Teams setups does the KUDO app support?', o: ['A scheduled meeting on Teams desktop', 'A recurring scheduled meeting', 'Teams in a web browser', 'A town hall', 'The Teams mobile app'], a: [0, 1, 4], why: 'Scheduled meetings, including recurring, on desktop and mobile. Not browser Teams, town halls, webinars, channel meetings or breakout rooms.' },
    { t: 'order', q: 'Day one of an AI meeting in Teams: put it in order.', steps: ['The bot arrives about 1 minute before and waits in the lobby', 'The host opens People and admits the bot', 'Attendees open the KUDO tab', 'Attendees choose Captions, Voice or both'], why: 'The bot always waits in the lobby; once admitted, attendees use the KUDO tab.' },
    { t: 'match', q: 'Match each problem to the fix.', pairs: [['The bot left after waiting too long in the lobby', 'Add bot, then admit it again'], ['The Teams meeting moved to Thursday', 'Sync meeting'], ['An attendee hears nothing in the KUDO tab', 'Match the audio device in Teams and on the computer'], ['1,500 attendees expected', 'Share the Mobile Link for the overflow']], why: 'Each has a standard fix; the in-app limit is 1,000 attendees.' },
  ],
  zoom: [
    { t: 'multi', q: 'Which Zoom settings can stop the KUDO bot?', o: ['"Only authenticated users can join"', 'A waiting room where nobody admits it', 'End-to-end encryption', 'Gallery view', 'A recording request the host did not approve', 'Speaker view', 'Meeting chat turned off'], a: [0, 1, 2, 4], why: 'Authentication, the waiting room, end-to-end encryption and recording approval all block or silence the bot.' },
    { t: 'order', q: 'Linking a Zoom meeting to KUDO: put the steps in order.', steps: ['Create a standard, new, non-recurring Zoom meeting', 'Set encryption to Enhanced', 'Create the KUDO AI meeting with the same title, date and time', 'Turn on Zoom Meeting and paste the full invite link'], why: 'Zoom first, by the rules, then KUDO with the full link.' },
    { q: 'The bot was in the meeting and disconnected. What do you use?', o: ['Add bot', 'Restart bot service', 'A new Zoom meeting', 'Nothing'], a: 1, why: 'Add bot brings a missing bot; Restart bot service reconnects one that dropped.' },
  ],
  external: [
    { t: 'multi', q: 'Which Webex settings can keep the KUDO bot out?', o: ['Blocked email domains', 'The guest rule ("Guests can\'t join")', 'The lobby', 'Auto-lock', 'Virtual backgrounds', 'Screen sharing limited to the host', 'Meeting chat turned off'], a: [0, 1, 2, 3], why: 'These four belong to the client\'s Webex admin.' },
    { t: 'order', q: 'Setting up KUDO in ON24: put it in order.', steps: ['Paste the ON24 attendee link in KUDO (External Meeting)', 'Copy the KUDO Mobile Link', 'Add the URL tool in Console Builder and paste the link', 'Test in Preview, then publish'], why: 'KUDO first, then the Mobile Link into the ON24 console, then test.' },
    { q: 'An attendee follows on the same computer as the meeting and hears two voices. What do you advise?', o: ['Mute the meeting\'s browser tab', 'Turn captions off', 'Switch to Safari', 'Leave the meeting'], a: 0, why: 'Mute the original meeting tab, or better, use a second device for the Mobile Link.' },
  ],
  onsite: [
    { t: 'order', q: 'Put the onsite audio chain in order.', steps: ['Mixing desk', 'USB audio interface', 'Dedicated laptop on wired internet', 'KUDO session, joined as a Participant'], why: 'The AV team owns this chain; one laptop per translated room.' },
    { t: 'multi', q: 'What should the attendee network have?', o: ['UDP allowed', 'No captive portal', 'A captive portal for registration', 'No per-device bandwidth limits', 'A dedicated 5 GHz network', 'A separate network for each language', 'Bluetooth turned on at the access points'], a: [0, 1, 3, 4], why: 'No captive portal, no per-device limits, UDP allowed, ideally a dedicated 5 GHz network.' },
    { q: 'About how much wireless capacity do 300 listeners need?', o: ['About 1.5 Mbps', 'About 15 Mbps', 'About 150 Mbps', 'About 1.5 Gbps'], a: 1, why: '300 × 48 kbps ≈ 14.4 Mbps. Then check listeners per access point.' },
  ],
  meetnow: [
    { t: 'match', q: 'Match each situation to the Meet Now mode.', pairs: [['Two colleagues on a site visit, both with the app, both speaking', 'Two-Way'], ['Visitors who only want to listen, no app', 'One-Way'], ['A quick one-to-one in a noisy warehouse', 'Only Captions']], why: 'Two-Way is interactive, One-Way is passive by QR, Only Captions is text only.' },
    { q: 'What is the difference between Meet Now and the Mobile Link?', o: ['None', 'Meet Now is the app for small spontaneous conversations; the Mobile Link is a browser selector for large audiences', 'The Mobile Link needs the app', 'Meet Now needs a desktop'], a: 1, why: 'Different products for different situations.' },
  ],
  widget: [
    { t: 'order', q: 'The full Widget test before an event: put it in order.', steps: ['The AV operator sends the platform audio into KUDO', 'Confirm translation is running', 'Open the event page and check the language list loads', 'Check captions and audio play where expected'], why: 'Ingest first, then translation, then the page.' },
    { t: 'multi', q: 'Which are true about the Widget?', o: ['It is the Mobile Link selector embedded as an iFrame', 'It captures the platform audio automatically', 'The code changes for every session', 'Attendees should mute the player to hear only the translation', 'Viewers need a KUDO account to use it'], a: [0, 2, 3], why: 'There is no automatic capture: someone must ingest the audio.' },
  ],
  hybrid: [
    { t: 'match', q: 'Match each need to the right piece.', pairs: [['Send KUDO translations to the room\'s receivers', 'Venue Audio OUT'], ['Bring onsite booth interpreters into KUDO for remote attendees', 'Venue Audio IN'], ['Software that creates Dante devices on Windows', 'Dante Virtual Soundcard']], why: 'OUT goes to the venue (AI and HI), IN comes from the venue (HI only), DVS bridges Dante.' },
    { t: 'multi', q: 'What do you collect before handing a Hybrid request to Technical Support?', o: ['The conference system brand', 'Whether Dante is available', 'The AV contact', 'The event date and languages', 'The client\'s network passwords', 'The attendees\' phone models', 'The speakers\' slides'], a: [0, 1, 2, 3], why: 'Enough for Technical Support to plan the routing. Never credentials.' },
  ],
  rtmp: [
    { t: 'order', q: 'Streaming three languages to YouTube: put it in order.', steps: ['Create one YouTube Live destination per language', 'In KUDO, add one RTMP stream per language with its URL and key', 'Start the KUDO meeting', 'Start the RTMP broadcast'], why: 'One destination and key per language; meeting first, then broadcast.' },
    { t: 'multi', q: 'A stream will not start. What do you check?', o: ['The Stream URL and key', 'That the destination stream is active', 'That the language channel is available', 'That the broadcast was started in KUDO', 'The glossary', 'The attendees\' browsers', 'The meeting\'s caption font'], a: [0, 1, 2, 3], why: 'The four standard checks. The glossary has nothing to do with it.' },
  ],
  hls: [
    { t: 'match', q: 'Match each need to the right option.', pairs: [['Unlimited viewers on the client\'s page, delay is fine', 'Broadcasting (HLS) widget'], ['Push each language to YouTube', 'RTMP'], ['A normal-sized audience who register with name and email', 'Real Time Widget']], why: 'HLS for unlimited viewers with delay, RTMP for social platforms, Real Time Widget for normal capacity.' },
    { t: 'multi', q: 'Which limits apply to HLS?', o: ['Only on .com and .eu servers', 'No sign language on the HLS widget', 'Interpreters must publish within 15 minutes of the start', 'Viewers must install an app', 'Viewers hear the stream with under 1 second of delay'], a: [0, 1, 2], why: 'Viewers need no app; the other three are real limits.' },
  ],
  glossary: [
    { t: 'match', q: 'Match each term to the right glossary action.', pairs: [['The client\'s product name keeps being misheard', 'Recognize'], ['The CEO\'s name must stay as it is in every language', 'Do-not-translate'], ['An unannounced product must never appear', 'Block'], ['Legal wants an approved French translation of a term', 'Translate as']], why: 'Hearing: Recognize. Keep as is: Do-not-translate. Keep out: Block. Approved translation: Translate as.' },
    { t: 'multi', q: 'Which actions work in an AI Captions Only meeting?', o: ['Recognize', 'Replace', 'Block', 'Do-not-translate', 'Translate as'], a: [0, 1, 2], why: 'Do-not-translate and Translate as need AI Speech & Captions.' },
  ],
  network: [
    { t: 'multi', q: 'What do you give the client IT team?', o: ['TCP 443', 'UDP 3478', 'The kudoway domain for their region', '*.tokbox.com and *.opentok.com', 'TCP 21', 'TCP 22', 'The KUDO admin password'], a: [0, 1, 2, 3], why: 'TCP 443 required, UDP 3478 recommended, regional kudoway domains plus tokbox and opentok.' },
    { q: 'What can a VPN do to a KUDO meeting?', o: ['Nothing', 'Cause a time zone mismatch that delays the bot, and hurt audio', 'Delete recordings', 'Double the languages'], a: 1, why: 'Check both platforms show the same time zone when a VPN is used.' },
  ],
  marketplace: [
    { t: 'match', q: 'Match each cancellation to the charge.', pairs: [['5 days before', 'No charge'], ['2 days before', '50%'], ['12 hours before', '100%']], why: 'More than 72 hours: free. 72 to 24 hours: 50%. Under 24 hours: 100%.' },
    { q: 'The client moved the meeting date after booking. Who do they tell?', o: ['Nobody, it updates itself', 'Language Services', 'The interpreter directly', 'The Host'], a: 1, why: 'Changes are not passed on to interpreters automatically.' },
  ],
  ringcentral: [
    { t: 'order', q: 'Setting up KUDO for a RingCentral event: put it in order.', steps: ['Schedule the KUDO meeting and set the languages', 'Copy the Meeting ID from the Mobile Link', 'Enable the KUDO app in RingCentral with that Meeting ID', 'The AV operator sends the event audio to KUDO', 'Test end to end'], why: 'Both parts must run together, then test.' },
    { q: 'Why clear the RingCentral captions option?', o: ['They are English only and KUDO has its own captions', 'They cost extra', 'They block audio', 'It is required by law'], a: 0, why: 'KUDO provides captions in its own tab.' },
  ],
};

// Decision walkthroughs: a realistic prompt, choices that matter, feedback after each choice. Quality 2 = best, 1 = acceptable, 0 = wrong.
export const WALKTHROUGHS = {
  teams: {
    title: 'The all-hands on Teams',
    intro: 'Ana, an event manager at a client, writes: "Our all-hands is on Teams next Thursday. 600 staff, half need Spanish. Can KUDO do it?"',
    steps: [
      { text: 'What do you ask first?', choices: [
        { t: 'Is it a scheduled Teams meeting, or a town hall or webinar?', q: 2, fb: 'Right. The KUDO app works in scheduled meetings, including recurring ones, but not in town halls, webinars, channel meetings or browser Teams. The format decides everything else.' },
        { t: 'Has your IT already approved the KUDO app in the Teams admin center?', q: 1, fb: 'You will need it, but first check the format: if it is a town hall, the app cannot be used at all.' },
        { t: 'Great: add the KUDO app to the meeting invite and you are all set.', q: 0, fb: 'Too fast. If it is a town hall the app will not work, and IT may not have approved it yet.' }] },
      { text: 'Ana: "It\'s a scheduled meeting. Our IT is strict, and the event is in three days."', choices: [
        { t: 'Send the IT guide today: approval can take 24 hours. Ask about the external-bot policy too.', q: 2, fb: 'Yes. Microsoft can take 24 hours or more, and the bot policy decides whether it waits in the lobby.' },
        { t: 'Involve IT the day before, once the agenda and speakers are final, so they approve once.', q: 0, fb: 'Approval can take more than 24 hours. The day before is too late.' },
        { t: 'Skip IT: everyone can follow on the Mobile Link instead, so no approval is needed.', q: 1, fb: 'A real fallback, but you give up translation inside Teams without trying.' }] },
      { text: 'Event day, one minute before the start: "The KUDO bot is stuck in the lobby, even though our lobby is open to everyone. Is it broken?"', choices: [
        { t: 'That is expected: open People and admit "KUDO AI Translator".', q: 2, fb: 'Correct. Teams holds detected bots in the lobby by default.' },
        { t: 'Cancel and recreate the KUDO meeting, then send the new link to everyone.', q: 0, fb: 'Nothing is broken. Recreating it now would lose the setup.' },
        { t: 'Wait: the bot comes in by itself once the meeting has started.', q: 0, fb: 'It will not. After 10 minutes in the lobby it leaves, and you need Add bot.' }] },
      { text: '"Done. One attendee says he hears nothing in the KUDO tab."', choices: [
        { t: 'Check his audio device is the same in Teams and on his computer.', q: 2, fb: 'The usual cause. If he closed and reopened the panel, clicking away and back also helps.' },
        { t: 'Restart the whole meeting so every attendee reconnects to the audio.', q: 0, fb: 'That disrupts 600 people for one person\'s device problem.' },
        { t: 'Tell him to follow the captions instead while you look into it.', q: 1, fb: 'A workaround, but the problem is almost always the device.' }] },
    ],
  },
  zoom: {
    title: 'The Zoom webinar',
    intro: 'A client says: "We have a Zoom webinar for 300 people on Monday. We want French and German AI translation."',
    steps: [
      { text: 'What is your first answer?', choices: [
        { t: 'KUDO needs a standard Zoom Meeting, not a Webinar. Can you create one?', q: 2, fb: 'Right: standard Meeting, new Meeting ID, not recurring.' },
        { t: 'Fine: paste the webinar link into KUDO and the bot will join it.', q: 0, fb: 'The bot needs a standard Meeting. A webinar link will not work.' },
        { t: 'Zoom is not supported, so run the event on the KUDO platform instead.', q: 1, fb: 'Possible, but unnecessary: Zoom works with a standard Meeting.' }] },
      { text: 'The client created the meeting. "Anything else to change in Zoom?"', choices: [
        { t: 'Set encryption to Enhanced; check authentication, waiting room and recording rights.', q: 2, fb: 'Exactly the settings that block or silence the bot.' },
        { t: 'No change needed: once the meeting exists, the KUDO bot adjusts the Zoom settings itself.', q: 0, fb: 'End-to-end encryption alone stops the bot from capturing audio.' },
        { t: 'Just turn the waiting room off so the bot can always get in, and leave the rest.', q: 1, fb: 'Helps, but encryption and recording permissions matter more.' }] },
      { text: 'On the day: "The bot is in, but nothing is being translated."', choices: [
        { t: 'Has the host approved the bot\'s recording request?', q: 2, fb: 'Zoom treats the bot as a recorder: without approval it hears nothing.' },
        { t: 'Use Restart bot service so the bot reconnects to the audio.', q: 1, fb: 'Right tool if it disconnected, but a bot that is in and hears nothing usually lacks approval.' },
        { t: 'Add more translation languages so the bot has something to translate.', q: 0, fb: 'Languages are not the problem.' }] },
      { text: '"How do attendees get French?"', choices: [
        { t: 'The Mobile Link or its QR code: no login or Zoom account. Put it in the invite.', q: 2, fb: 'Yes, on a phone or a second tab.' },
        { t: 'From Zoom\'s language interpretation menu, like any interpreted Zoom call.', q: 0, fb: 'KUDO for Zoom delivers translation through the Mobile Link, not Zoom\'s menu.' },
        { t: 'They each need a KUDO account, sent with the meeting invitation.', q: 0, fb: 'No login is needed.' }] },
    ],
  },
  onsite: {
    title: 'The 500-person conference',
    intro: 'A client runs a 500-person conference in a hotel. The keynote is in English, with AI translation into three languages, and listeners use their own phones.',
    steps: [
      { text: 'What do you raise first?', choices: [
        { t: 'The venue network: we need the hotel\'s network provider involved now.', q: 2, fb: 'The network makes or breaks onsite events. Involve the provider early.' },
        { t: 'Printing the QR codes for every seat and the entrance signs.', q: 1, fb: 'Needed, but it is not what fails on the day.' },
        { t: 'Nothing special: the phones will simply use the hotel guest Wi-Fi.', q: 0, fb: '500 phones streaming at once need a planned network.' }] },
      { text: 'Hotel IT: "We have a 100 Mbps line, so we are fine."', choices: [
        { t: 'Bandwidth is not the limit: listeners per access point is. Ask for a channel plan and a seat test.', q: 2, fb: 'Yes. Airtime per access point is the real constraint: plan about 35 listeners per access point with Wi-Fi 6, and test in the seats.' },
        { t: '100 Mbps is plenty for audio streams, so the network side is covered for this event.', q: 0, fb: '500 × 48 kbps is only 24 Mbps, but the access points are what saturate.' },
        { t: 'Ask them to double the line to 200 Mbps to be on the safe side.', q: 0, fb: 'More internet speed does not fix airtime on the access points.' }] },
      { text: 'The AV team asks how the audio gets to KUDO.', choices: [
        { t: 'Mixing desk to a USB interface to a dedicated laptop on wired internet, as a Participant.', q: 2, fb: 'The standard chain, one laptop per room.' },
        { t: 'Put a laptop close to the stage speakers and let its built-in microphone pick up the room.', q: 0, fb: 'Room sound through a laptop mic gives poor translation.' },
        { t: 'The same chain with the laptop on the hotel Wi-Fi, so it can sit anywhere in the room.', q: 1, fb: 'Close, but the laptop must be wired.' }] },
      { text: 'The morning of the event.', choices: [
        { t: 'Scan the QR on a real phone, pick a language, check audio and captions.', q: 2, fb: 'The 60-second test catches most day-of issues.' },
        { t: 'Trust the setup: it worked in yesterday\'s test, so nothing has changed.', q: 0, fb: 'Test every time.' },
        { t: 'Ask attendees to report any problems at the help desk as they arrive.', q: 0, fb: 'By then the audience has noticed.' }] },
    ],
  },
  external: {
    title: 'The ON24 webinar',
    intro: 'A client runs an ON24 webinar and wants AI translation inside the ON24 console.',
    steps: [
      { text: 'What do you check first?', choices: [
        { t: 'That the webcast exists, External Meeting is enabled on their account, and who hosts it.', q: 2, fb: 'The three prerequisites: the webcast and its attendee link, External Meeting enabled on their KUDO account, and who hosts the event.' },
        { t: 'Ask for their ON24 admin password so you can log in and set the whole integration up yourself.', q: 0, fb: 'Never ask for credentials.' },
        { t: 'Suggest moving the event to the Teams app, where the KUDO setup is simpler.', q: 0, fb: 'ON24 is supported with External Meeting and the Widget.' }] },
      { text: 'Setup is done. In Preview, the language list is cut off.', choices: [
        { t: 'Resize the widget so the full list shows.', q: 2, fb: 'The standard fix.' },
        { t: 'Remove some languages so the list fits in the space.', q: 0, fb: 'The languages are fine; the widget is too small.' },
        { t: 'Publish anyway: attendees can scroll, and you can fix it later.', q: 0, fb: 'Test before you publish.' }] },
      { text: 'Live: attendees say they hear two voices.', choices: [
        { t: 'Ask attendees to keep the ON24 player muted: KUDO is the audio source.', q: 2, fb: 'Yes. Share this rule with attendees in advance.' },
        { t: 'Restart bot service so the KUDO audio reconnects cleanly.', q: 0, fb: 'The bot is fine; the player is still on.' },
        { t: 'Switch the meeting to AI Captions Only so attendees hear just one voice.', q: 0, fb: 'The meeting type cannot change live, and it is not the cause.' }] },
    ],
  },
  hybrid: {
    title: 'The parliament with a Televic system',
    intro: 'A client with a Televic system in their parliament wants remote attendees to hear the onsite interpreters, and delegates in the room to hear KUDO channels.',
    steps: [
      { text: 'What is this, and what do you do?', choices: [
        { t: 'KUDO Hybrid with an Audio Manager: booths IN, room OUT. I bring in Technical Support.', q: 2, fb: 'Right scenario, right hand-over.' },
        { t: 'Use the Widget on their website so remote attendees can follow the booths.', q: 0, fb: 'The Widget does not connect to a conference system.' },
        { t: 'Configure the Dante routing with their AV team on this call, so it is ready well in time.', q: 0, fb: 'The first Dante routing is a technical project for Technical Support.' }] },
      { text: '"Could we use AI translation instead, with the booth feed going into KUDO?"', choices: [
        { t: 'IN works with Human Interpretation only, OUT with both. Let\'s confirm with Technical Support.', q: 2, fb: 'Correct, and you stay in the conversation.' },
        { t: 'Yes: Venue Audio IN works with AI meetings too, so the booth feed can go straight into the KUDO meeting.', q: 0, fb: 'On AI meetings the channels are already used by the AI.' },
        { t: 'No: Hybrid does not support AI at all, so it has to be interpreters.', q: 0, fb: 'Venue Audio OUT supports AI.' }] },
      { text: 'What do you send Technical Support?', choices: [
        { t: 'Conference system, Dante or not, the AV contact, the date and the languages.', q: 2, fb: 'Enough to plan the routing.' },
        { t: 'Just the event date for now, and the rest once the client confirms.', q: 1, fb: 'They will have to come back to you for the rest.' },
        { t: 'Nothing until the client is ready to sign, so Technical Support is not busy for nothing.', q: 0, fb: 'Hybrid needs lead time. Hand over early.' }] },
    ],
  },
  ai: {
    title: 'The bilingual panel',
    intro: 'A client\'s panel: four speakers switching between English and Spanish, fast back-and-forth. Attendees mostly read captions.',
    steps: [
      { text: 'Which AI type?', choices: [
        { t: 'AI Captions Only: lower latency for a discussion.', q: 2, fb: 'Speed matters more than voice here.' },
        { t: 'AI Speech & Captions, so everyone hears a translated voice.', q: 1, fb: 'Works, but Captions Only fits fast back-and-forth better.' },
        { t: 'Human Interpretation is required for a live discussion like this.', q: 0, fb: 'AI handles this well.' }] },
      { text: 'Languages?', choices: [
        { t: 'English and Spanish as speaker languages with Automatic Language Detection, set up front.', q: 2, fb: 'Detection cannot be switched on later.' },
        { t: 'English only to start with; add Spanish live if someone needs it.', q: 0, fb: 'Speaker languages lock once the meeting is live.' },
        { t: 'All ten possible speaker languages, just in case someone switches.', q: 1, fb: 'Detection is slower with more languages. Set only what is spoken.' }] },
      { text: 'What do you tell the speakers?', choices: [
        { t: 'Take turns, pause before switching language, use good mics, and rehearse.', q: 2, fb: 'This is what drives quality.' },
        { t: 'Nothing special: the AI copes with any speaking style, pace or microphone they use.', q: 0, fb: 'Overlapping speech and quick switches hurt quality.' },
        { t: 'Switch language mid-sentence to show what the AI can do.', q: 0, fb: 'Never mid-sentence: detection needs a few phrases.' }] },
    ],
  },
};

// Explain it: record or write an explanation for a client. Key points are shown after submitting, for self-review.
export const EXPLAIN = {
  foundations: { prompt: 'A new client asks how KUDO delivers languages. Explain Human Interpretation, AI Speech & Captions and AI Captions Only, and how you would help them choose.', points: ['Interpreters on channels vs AI translation', 'Speech & Captions for one speaker to many', 'Captions Only for fast discussions', 'Speaker languages are set before the meeting', 'Rehearse first'] },
  platform: { prompt: 'Walk a client\'s new Host through what they do on event day.', points: ['Join from the email link in Chrome, Firefox or Edge', 'Check the source audio reaches KUDO', 'Recording, participants, ending the meeting', 'Restart the translation service first if quality drops', 'Download recordings the same day'] },
  ai: { prompt: 'A client asks why the translation is a few seconds behind the speaker. Explain why and what they can do.', points: ['Some delay is normal', 'Detection needs a few phrases after a language switch', 'Captions Only has lower latency', 'Clean audio and a natural pace help most'] },
  hi: { prompt: 'Explain to a client how to book interpreters and what makes interpretation go well.', points: ['Book Interpreters from the meeting', 'The sooner the better; 48 hours usually, 24 for common pairs', 'Upload materials under Users, Interpreters', 'Interpreters join 15 minutes early', 'Changes go to Language Services'] },
  teams: { prompt: 'Explain to a client\'s IT manager what they need to do so KUDO works in their Teams meetings, and when.', points: ['Approve the KUDO app in the Teams admin center', 'Allow hosts to use third-party apps', 'Review the external-bot policy (lobby)', 'Start now: approval can take 24 hours or more', 'The Mobile Link as a fallback'] },
  zoom: { prompt: 'Explain to a client how KUDO works with their Zoom meeting, from setup to event day.', points: ['Standard, new, non-recurring Meeting', 'Enhanced encryption, not end-to-end', 'Same title and time in KUDO, full invite link', 'Admit the bot and approve the recording request', 'Attendees use the Mobile Link'] },
  external: { prompt: 'Explain to an ON24 client how their attendees get translation, and the one rule for the webcast player.', points: ['External Meeting with the attendee link', 'The Mobile Link in the ON24 URL tool', 'Test in Preview before publishing', 'The host approves the bot', 'Keep the ON24 player muted'] },
  onsite: { prompt: 'Explain to a venue\'s network provider what KUDO needs from their Wi-Fi for 400 listeners.', points: ['Every listener streams audio at the same time', '48 kbps per listener', 'The limit is listeners per access point, not internet speed', 'UDP allowed, no captive portal, no per-device limits', 'A channel plan and a test in the seats'] },
  meetnow: { prompt: 'Explain when you would suggest Meet Now instead of the Mobile Link, and the one rule before starting.', points: ['Meet Now is the app for small spontaneous conversations', 'The Mobile Link is for large audiences', 'The three modes', 'Languages cannot change once started'] },
  widget: { prompt: 'Explain to a client why the Widget needs two teams on event day.', points: ['The Widget only delivers language access', 'AV ingest with OBS or VB-Cable', 'The web team embeds a new code per session', 'One joint test', 'When you bring in Technical Support'] },
  hybrid: { prompt: 'Explain what the Audio Manager does, and when and how you hand the request to Technical Support.', points: ['Bridges KUDO and the venue system', 'Venue Audio IN (Human Interpretation only) and OUT', 'Dante Virtual Soundcard run by the AV engineer', 'Hand over early with the system, Dante, AV contact and date'] },
  rtmp: { prompt: 'Explain to a client how to stream three languages to YouTube.', points: ['Large Meeting, RTMP enabled on the account', 'One YouTube destination and key per language', 'Start the meeting, then the broadcast', 'Expect 10 to 25 seconds of delay'] },
  hls: { prompt: 'Explain when you would choose HLS over RTMP or the real-time widget.', points: ['Unlimited viewers on the client\'s own page', '15 to 20 seconds of delay', 'Large Meeting and HLS enabled', 'Limits: servers, sign language, interpreters within 15 minutes'] },
  glossary: { prompt: 'Explain to a client how to prepare a glossary for their event.', points: ['Client role creates it', 'Pick the right action per term', 'Company, product and presenter names as a minimum', 'Apply it to the meeting before it starts', 'Live changes pause captions, and not in Teams'] },
};

export const RUBRIC = [
  { key: 'accurate', label: 'Accurate', hint: 'The facts and limits are right' },
  { key: 'complete', label: 'Complete', hint: 'Covers the key steps and what the client must do' },
  { key: 'clear', label: 'Clear for a client', hint: 'Plain words, well ordered, confident' },
  { key: 'handover', label: 'Knows when to hand over', hint: 'Says who to involve, and when' },
];

// End-of-programme survey, adapted from Coursecheck's end-of-course and follow-up templates.
export const SURVEY = [
  { key: 'readiness', type: 'scale5', q: 'How ready do you feel to handle KUDO scenarios with clients now?' },
  { key: 'understand', type: 'scale5', q: 'How well do you understand the scenarios your role covers?' },
  { key: 'confident', type: 'scale5', q: 'How confident are you applying them with a client?' },
  { key: 'applied', type: 'choice', q: 'Have you used what you learned with a client yet?', o: ['Yes, several times', 'Yes, once', 'Not yet, but I will in the next month', 'Not yet, no opportunity'] },
  { key: 'impact', type: 'scale5', q: 'How much has the programme improved how you work with clients?' },
  { key: 'jack', type: 'scale5', q: 'How useful were your KUDO Trainer sessions?' },
  { key: 'barrier', type: 'text', q: 'What gets in the way of applying what you learned?' },
  { key: 'nps', type: 'nps', q: 'How likely are you to recommend the Academy to a colleague? (0 to 10)' },
  { key: 'worked', type: 'text', q: 'What worked best for you?' },
  { key: 'improve', type: 'text', q: 'What should we improve?' },
];

// Practice tasks the system reviews on its own. One per module; the trainee writes it (email, runsheet, briefing),
// records it, or describes step by step what they did in a test account. Reviewed like explain-it: key points by
// meaning plus keyword cues, clarity and hand-over. A pass signs the practice off automatically; the KUDO Trainer only spot-checks.
// type: write | speak | steps. kw: keyword cues per point (any one counts).
export const PRACTICE = {
  foundations: { type: 'speak', prompt: 'A colleague asks which AI type to offer for a board town hall, and which for a roundtable. Explain your choice and why, in under two minutes.',
    points: ['Town hall: AI Speech & Captions', 'One speaker to many listeners, a translated voice', 'Roundtable: AI Captions Only', 'Lower latency matters in a discussion', 'Speaker languages are set before the meeting'],
    kw: [['speech and captions', 'speech & captions', 'speech and caption'], ['one speaker', 'many listeners', 'voice', 'keynote'], ['captions only', 'caption only'], ['latency', 'faster', 'speed', 'back and forth', 'quick'], ['speaker language', 'before the meeting', 'cannot change', "can't change", 'locked']] },
  platform: { type: 'steps', prompt: 'In a test account, run a meeting with a colleague as Host: add a translation language while it is live, then find the recording. Describe each step you took, in order.',
    points: ['Created the meeting and added the Host', 'Switched on Automatic Recording', 'Added the language with Edit meeting, then Update', 'Restarted the translation service', 'Found the recording in the Content tab'],
    kw: [['host', 'participant', 'add participant'], ['automatic recording', 'auto record', 'auto-record', 'automatically record', 'recording and transcript'], ['edit meeting', 'translation settings', 'added a language', 'add a language', 'added the language', 'update'], ['restart', 'translation service'], ['content tab', 'recordings & transcripts', 'recordings and transcripts', 'recording', 'download']] },
  ai: { type: 'write', prompt: 'Write the short briefing you would send speakers before an AI-translated event (5 to 8 lines).',
    points: ['Use a good microphone or headset', 'Speak at a natural, steady pace', 'One speaker at a time, no overlapping', 'Pause before switching language, never mid-sentence', 'Rehearse with the real setup'],
    kw: [['microphone', 'mic', 'headset'], ['pace', 'slow', 'steady', 'natural', 'speed'], ['one at a time', 'take turns', 'overlap', 'interrupt'], ['switch', 'pause', 'mid-sentence', 'language change'], ['rehears', 'test', 'dry run']] },
  hi: { type: 'write', prompt: 'Write the email to a client confirming their interpreter booking: what they must send, where, and what happens on the day.',
    points: ['Upload materials under Users, Interpreters (not Documents)', 'Slides, agenda, speaker list, glossary', 'Interpreters join at least 15 minutes early; the Host joins early too', 'Changes to date, time or languages go to Language Services', 'Cancellation charges apply within 72 hours'],
    kw: [['users', 'interpreters tab', 'interpreter tab', 'preparation material'], ['slides', 'agenda', 'speaker', 'glossary'], ['15 minutes', 'fifteen minutes', 'early', 'sound check'], ['language services', 'any change', 'changes'], ['72', 'cancel']] },
  teams: { type: 'write', prompt: 'Write the email to the client\'s IT manager before their first KUDO event in Teams.',
    points: ['Approve the KUDO app in the Teams admin center', 'Allow hosts to use third-party apps', 'Review the external-bot policy (the bot waits in the lobby)', 'Start now: approval can take 24 hours or more', 'The Mobile Link as a fallback'],
    kw: KW_TEAMS() },
  zoom: { type: 'steps', prompt: 'Link a test Zoom meeting to KUDO and admit the bot. Describe what you set in Zoom, what you set in KUDO, and what you did when the bot arrived.',
    points: ['A standard, new, non-recurring Zoom meeting', 'Encryption set to Enhanced, not end-to-end', 'KUDO meeting with the same title and time, full invite link pasted', 'Automatic Language Detection and Auto-Record on', 'Admitted the bot and approved the recording request'],
    kw: [['standard meeting', 'new meeting', 'not a webinar', 'recurring', 'meeting id'], ['encryption', 'enhanced', 'end-to-end', 'end to end'], ['same title', 'same time', 'invite link', 'pasted', 'full link'], ['language detection', 'auto-record', 'auto record', 'automatic recording'], ['admit', 'approve', 'recording request', 'waiting room']] },
  external: { type: 'write', prompt: 'Write the instructions you would send attendees of an ON24 webinar with KUDO translation.',
    points: ['Open the KUDO widget in the event console', 'Choose your language', 'Keep the ON24 webcast player muted', 'No login or app needed', 'What to do if the widget does not appear'],
    kw: [['widget', 'kudo tab', 'console', 'panel'], ['choose', 'select', 'pick', 'language'], ['mute', 'player', 'two voices'], ['no login', 'no app', 'no account', 'nothing to install'], ['refresh', 'reload', 'not appear', "doesn't appear", 'contact', 'support']] },
  onsite: { type: 'write', prompt: 'Write the email to a venue\'s network provider for a 600-person conference where listeners follow KUDO on their phones.',
    points: ['Every listener streams audio at the same time', 'About 48 kbps per listener (roughly 29 Mbps for 600)', 'The limit is listeners per access point, not internet speed', 'UDP allowed, no captive portal, no per-device limits', 'A channel plan and a coverage test in the seats'],
    kw: [['same time', 'simultaneous', 'every listener', 'each listener', 'all at once'], ['48', 'kbps', 'kilobit', '29'], ['access point', 'airtime', 'per access point'], ['udp', 'captive portal', 'per-device', 'per device'], ['channel plan', 'test', 'seats', 'coverage']] },
  meetnow: { type: 'speak', prompt: 'Explain to a field colleague how to start a Meet Now conversation with a visitor who only speaks Spanish.',
    points: ['Open KUDO Live and sign in', 'Set speaker and translation languages before tapping Start', 'Share the QR code', 'Pick the mode: Two-Way, One-Way or Only Captions', 'Headset, one at a time, stable connection'],
    kw: [['kudo live', 'the app', 'sign in'], ['before', 'start', 'cannot change', "can't change"], ['qr', 'share'], ['two-way', 'two way', 'one-way', 'one way', 'captions'], ['headset', 'one at a time', 'connection', 'wifi', 'wi-fi']] },
  widget: { type: 'write', prompt: 'Write the two-track runsheet for a client webinar on their own event platform with the KUDO Widget.',
    points: ['AV operator captures the platform audio (OBS or VB-Cable) and joins KUDO as a Participant', 'Web team embeds the new Widget code for this session', 'Widget placed beside the player', 'One joint test with everyone live', 'Attendees mute the player to hear only the translation'],
    kw: [['obs', 'vb-cable', 'vb cable', 'capture', 'ingest'], ['embed', 'widget code', 'new code', 'iframe'], ['beside', 'next to', 'below', 'player'], ['test', 'rehearsal', 'together'], ['mute']] },
  hybrid: { type: 'write', prompt: 'Write the hand-over email to Technical Support for a client with a Televic conference system who wants remote attendees to hear their onsite interpreters.',
    points: ['The conference system (Televic) and whether Dante is available', 'The AV contact at the venue', 'The date and the languages', 'Venue Audio IN for the booths (Human Interpretation) and OUT to the room', 'Why it needs to start early'],
    kw: [['televic', 'conference system', 'dante'], ['av contact', 'av engineer', 'technician', 'contact'], ['date', 'languages', 'language'], ['audio in', 'audio out', 'booth', 'human interpretation'], ['early', 'lead time', 'in advance', 'test', 'asap']] },
  rtmp: { type: 'write', prompt: 'Write the email explaining to a client how to stream English, French and Spanish to YouTube with KUDO.',
    points: ['Large Meeting, with RTMP enabled on the account', 'One YouTube destination and stream key per language', 'Add one RTMP stream per language in KUDO', 'Start the KUDO meeting first, then the broadcast', 'Expect 10 to 25 seconds of delay'],
    kw: [['large meeting', 'enabled', 'broadcast tab'], ['stream key', 'each language', 'per language', 'three', 'separate'], ['rtmp stream', 'add', 'server url'], ['start the meeting', 'meeting first', 'then the broadcast', 'then start'], ['delay', 'seconds', 'latency']] },
  hls: { type: 'write', prompt: 'Recommend HLS, RTMP or the Real Time Widget for each of these clients, with one reason each: (a) 20,000 viewers on their own website, (b) their YouTube channel, (c) 200 registered partners.',
    points: ['(a) HLS: unlimited viewers on their own page', '(b) RTMP to YouTube', '(c) Real Time Widget: normal capacity with registration', 'HLS has about 15 to 20 seconds of delay', 'HLS needs a Large Meeting and HLS enabled'],
    kw: [['hls', 'broadcasting widget'], ['rtmp', 'youtube'], ['real time widget', 'real-time widget', 'registration', 'register'], ['delay', '15', '20 seconds'], ['large meeting', 'enabled']] },
  glossary: { type: 'write', prompt: 'Draft a glossary for a fictional product launch: at least 8 terms, each with the action you would use and why.',
    points: ['Recognize for terms the AI mishears', 'Do-not-translate for company, product or people names', 'Block for something that must not appear', 'Translate as for approved translations', 'Applied to the meeting before it starts'],
    kw: [['recognize', 'recognise'], ['do-not-translate', 'do not translate', 'dnt'], ['block'], ['translate as'], ['before the meeting', 'before it starts', 'apply', 'use for this meeting', 'default']] },
  network: { type: 'write', prompt: 'Write the email to a client\'s IT team before their first KUDO event.',
    points: ['TCP 443 (required)', 'UDP 3478 (recommended), do not throttle UDP', 'The kudoway domain for their region', '*.tokbox.com and *.opentok.com', 'No proxy that requires authentication'],
    kw: [['443'], ['3478', 'udp'], ['kudoway'], ['tokbox', 'opentok'], ['proxy', 'authentication']] },
  marketplace: { type: 'speak', prompt: 'Explain KUDO Marketplace to a new client in about a minute.',
    points: ['Vetted, KUDO Certified professional interpreters', 'Booked from the meeting with Book Interpreters', 'The sooner the better: usually 48 hours, 24 for common pairs', 'Preparation materials under Users, Interpreters', 'Changes and questions go to Language Services'],
    kw: [['vetted', 'certified', 'professional', 'kudo pro'], ['book interpreters', 'book', 'booking'], ['48', '24', 'sooner', 'advance'], ['material', 'slides', 'upload'], ['language services']] },
  ringcentral: { type: 'write', prompt: 'Write the setup checklist for a RingCentral event with KUDO translation.',
    points: ['Schedule the KUDO meeting and set the languages', 'Copy the Meeting ID from the Mobile Link', 'Enable the KUDO app in RingCentral with that ID as Widget ID', 'Clear the RingCentral captions option', 'An AV operator sends the event audio to KUDO, then test end to end'],
    kw: [['schedule', 'languages', 'kudo meeting'], ['meeting id', 'mobile link'], ['widget id', 'enabled', 'apps'], ['captions', 'closed caption'], ['av operator', 'audio', 'virtual cable', 'test']] },
};
function KW_TEAMS() { return [['admin center', 'admin centre', 'approve'], ['third party', 'third-party', 'permission policy'], ['bot', 'lobby', 'external'], ['24 hours', 'a day', 'today', 'start now', 'in advance'], ['mobile link', 'browser', 'fallback', 'backup']]; }
