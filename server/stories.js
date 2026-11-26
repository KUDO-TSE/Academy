// Step 1 · Learn as a story on slides (pilot: the Platform module).
// Method (from the scenario-based learning and e-learning storyboard skills): one real case carries the lesson;
// open with the situation, show the expert doing it and why, let the trainee decide at the moments that matter
// (wrong options are the mistakes people really make), name the traps, recap. One idea per slide; the slide text is
// short and the "say" line explains why, never repeating the slide word for word. Characters and the event are fictional.
// Every fact below comes from the module's lesson (server/curriculum.js), its worked example and common mistakes
// (server/curriculum-bank.js, CASES) and the expert recording of the Platform sandbox. The one-page view keeps the
// original sections, so nothing is lost.
//
// Slide kinds: scene, stakes, show (with a screen mock), decide (options with the consequence), traps, recap.
// Mock: { crumb, items: [{ t: 'button'|'field'|'check'|'row'|'path'|'note', label, value, hi }] } — hi marks
// the element the slide is about.

export const STORIES = {
  platform: {
    title: 'Quarterly Partner Update',
    slides: [
      { kind: 'scene', tag: 'Monday, 9:00',
        who: 'The client\'s event manager (fictional)',
        quote: 'Our Quarterly Partner Update is on Thursday. Our CEO speaks English; our partners need French and German. Can you set it up, and make sure we get a recording?',
        say: 'This is the most common request you will get: a meeting on the KUDO platform itself. Let\'s set it up the way an expert does, and see why each step matters.' },

      { kind: 'stakes', title: 'What is at stake on Thursday',
        points: [
          ['The right meeting', 'type and languages, set before anyone joins'],
          ['The right link', 'for each person: a watcher with a microphone can talk over the CEO'],
          ['A recording', 'ticked now: nobody remembers to press record on the day'],
        ],
        say: 'Ten minutes on Monday decides whether Thursday runs itself.' },

      { kind: 'show', step: 1, title: 'Choose AI or interpreters first',
        mock: { crumb: 'live.kudoway.com · Client account', items: [{ t: 'button', label: 'New Meeting' }, { t: 'row', label: 'AI Translation', hi: true }, { t: 'row', label: 'Human Interpretation' }] },
        say: 'Sign in with the Client account and select New Meeting. AI Translation or Human Interpretation decides everything after, so it comes first. Here the client wants AI.' },

      { kind: 'show', step: 2, title: 'Name it, then the languages',
        mock: { crumb: 'New meeting · AI Translation', items: [{ t: 'field', label: 'Meeting name', value: 'Quarterly Partner Update', hi: true }, { t: 'field', label: 'Speaker language', value: 'English' }, { t: 'field', label: 'Translation languages', value: 'French, German' }] },
        say: 'Give it a clear name: attendees see it on the QR landing page. The speaker language is what the CEO speaks; the translation languages are what partners hear.' },

      { kind: 'show', step: 3, title: 'Tick the recording now',
        mock: { crumb: 'New meeting · Recording and transcript', items: [{ t: 'check', label: 'Automatically record this meeting when it starts', hi: true }, { t: 'note', label: 'Advanced Settings: logo, Preparation Time' }] },
        say: 'Under Recording and transcript, tick "Automatically record this meeting when it starts". While you are here: Advanced Settings hold the logo and Preparation Time, which opens the room early for rehearsals.' },

      { kind: 'show', step: 4, title: 'Save, then add the Host',
        mock: { crumb: 'Quarterly Partner Update · Users', items: [{ t: 'path', label: 'Users › Participants › Add participant' }, { t: 'row', label: 'host@client-demo.com', value: 'Make host', hi: true }] },
        say: 'Save first. Then Users, Participants, Add participant, and Make host on their row. You can also use + Add host on the form: two hosts at most.' },

      { kind: 'show', step: 5, title: 'One link per kind of person',
        mock: { crumb: 'Quarterly Partner Update · Links', items: [
          { t: 'row', label: 'Participant link', value: 'Speakers and co-hosts: mic and camera' },
          { t: 'row', label: 'Viewer Only link', value: 'Livestream attendees: browser, no mic', hi: true },
          { t: 'row', label: 'Widget embed code', value: 'An iFrame for the client\'s event platform' },
          { t: 'row', label: 'Mobile Link and QR', value: 'Onsite or on a phone, no login' }] },
        say: 'The CEO gets the Participant link. The partners who only watch and listen get the Viewer Only link, so nobody can unmute over the CEO.' },

      { kind: 'show', step: 6, title: 'Thursday: the Host joins',
        mock: { crumb: 'Quarterly Partner Update · Overview · Live', items: [{ t: 'note', label: 'Chrome, Firefox or Edge (not Safari)', hi: true }, { t: 'row', label: 'Source audio reaching KUDO', value: '✓' }, { t: 'row', label: 'Speedometer', value: 'speaking pace' }] },
        say: 'The Host joins from the email link in Chrome, Firefox or Edge, never Safari, and checks the source audio reaches KUDO. Ten minutes of practice in a test session makes a big difference. If the Speedometer goes red, the AI is struggling: coach the speaker to a natural pace.' },

      { kind: 'decide', tag: 'Thursday, live',
        quote: 'Some Spanish partners just joined. Can we add Spanish?',
        question: 'The meeting is live. What do you do?',
        options: [
          { t: 'Change the speaker language to Spanish', then: 'The speaker language is locked once the meeting is live, and the CEO still speaks English.' },
          { t: 'Edit meeting, add Spanish to the translation languages, Update, then Restart translation service', ok: true, then: 'Spanish appears within a few seconds. Attendees may need to refresh.' },
          { t: 'End the meeting and create a new one with Spanish', then: 'Every partner drops out, and an AI meeting that has been stopped can never be restarted.' },
          { t: 'Edit meeting, add Spanish, Update, and leave it there', then: 'Spanish does not start until you restart the translation service: the circular arrow on the Overview.' },
        ] },

      { kind: 'show', step: 7, title: 'Quality drops? Restart first',
        mock: { crumb: 'Quarterly Partner Update · Overview · Live', items: [{ t: 'button', label: '↻ Restart translation service', hi: true }] },
        say: 'Mid-session, the French sounds off. The first troubleshooting step for quality issues is always the same: restart the translation service. It takes a few seconds.' },

      { kind: 'show', step: 8, title: 'Afterwards: the recordings',
        mock: { crumb: 'Quarterly Partner Update · Content', items: [{ t: 'path', label: 'Content › Recordings & transcripts', hi: true }, { t: 'row', label: 'French, German, original audio', value: 'one file each + transcript' }, { t: 'row', label: 'Download all', value: 'one zip' }] },
        say: 'Recordings appear under Content, Recordings & transcripts 15 to 20 minutes after the end: one file per language plus the original audio, each with its transcript, or everything as one zip. They are deleted after 30 days, so tell the client to download them.' },

      { kind: 'show', step: 9, title: 'What the client is billed',
        mock: { crumb: 'Quarterly Partner Update · Time', items: [{ t: 'row', label: 'Billed', value: 'from the first join until it is stopped', hi: true }, { t: 'row', label: 'Grace period', value: 'one hour after the end time' }, { t: 'button', label: 'Force Close' }] },
        say: 'Usage counts from when someone joins an active session until it is stopped. There is a one-hour grace period after the end time, or Force Close stops it on time. For a day with several sessions, create them all in advance so every link is ready.' },

      { kind: 'traps', title: 'Where people slip',
        points: [
          'Sending the Participant link to people who only watch: they get a mic and camera they do not need.',
          'Joining as Host from Safari.',
          'Changing the speaker language live: it is locked.',
          'Adding a language live and forgetting to restart the translation service.',
          'Promising the recording right at the end: it takes 15 to 20 minutes.',
        ] },

      { kind: 'recap', title: 'Remember these four',
        points: ['AI or interpreters first, then name and languages', 'Tick automatic recording when you create it', 'One link per kind of person: watchers get Viewer Only', 'Live change or bad quality: restart the translation service'],
        next: 'Now do it yourself: Step 2 runs this exact event in the sandbox.' },
    ],
  },
};
