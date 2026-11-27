# KUDO Academy: pending items

Updated 27 Nov 2026 (Zoom recording in: sandbox exercise 6 and the Zoom lesson corrected; KUDOG answers with Claude, test trainees start fresh, content from the old KUDO Academy course). Ask "what is still pending?" at any time; this list is kept up to date with every change.

## Waiting on Nils
- **Slack webhook for "Brag to the team".** In Slack, create an incoming webhook for the channel the brags should go to (Slack app settings, Incoming Webhooks, Add New Webhook). In Railway add `SLACK_WEBHOOK_URL` (the hooks.slack.com address) and `SLACK_CHANNEL_NAME` (for example `kudo-academy`, shown on the button). Until then the brag button stays hidden. Once academy.kudo.ai is live, also set `ACADEMY_URL` so the message links there.
- **Recordings (announced for 27 Nov):**
  - The client's side of each integration, to rebuild as generic look-alikes and to correct the screen mocks in the lesson slides: Microsoft Teams (KUDO app panel and admin center), Google Meet, Webex, ON24 (Console Builder), RingCentral Events (app settings).
  - KUDO screens not recorded yet: the live meeting page, Create glossary and term screens, AI detection and voices, Audio Manager, onsite QR, the KUDO app in Teams, the KUDO Live phone app (Meet Now), the preparation materials page, partial booking, the full Usage & analytics.
- **Recordings asked for on 27 Nov (old course follow-up):** a live meeting seen by the Operator (chats, user list, mute and remove, recording, a poll from start to published results, a live document upload, End meeting); screen sharing a Chrome tab with sound, then a window; Users, Interpreters for a client's own interpreters; the Book Interpreters screens (subject and tags, credits, confirmation); the AI meeting setup today (translation types, what a speaker sees on joining); the Mobile Link caption display.
- **To confirm before teaching (from the 3-year-old KUDO Academy course):**
  - Do voting-only meetings (multiple choice, or Yes / No / Abstain) and Events (a folder of meetings) still exist? If yes: a Platform section and a "board vote" client story.
  - Is asia.kudoway.com still a server? (Our IT module says .com covers Asia-Pacific.)
  - Is it still 20 people on camera or microphone at most?
  - Does the Operator still need a password and an email used for no other role?
  - Marketplace booking: is the interpreter credits estimate (languages and duration) and the "non-refundable" confirmation still shown? Our lesson says cancellation is free more than 72 hours ahead.
  - Does a speaker still pick the language they will speak when joining an AI meeting, or does Automatic Language Detection handle it?
  - The Zoom recording lists Microsoft Teams, Google Meet, Zoom and Webex as external meeting platforms, without ON24. Is ON24 still offered? (The sandbox now follows the recording; the External platforms module still teaches ON24.)
  - Zoom exercise: with the Waiting Room on, the bot waits to be admitted (small deduction), and the bot is refused when the meeting uses end-to-end encryption. Both follow the lesson and the recording; confirm the bot's exact behaviour with a waiting room.
- **Facts to confirm** (wording drafted from the lessons, a step beyond them):
  - Platform story: ending the meeting makes "every partner drop out"; "ten minutes on Monday decides whether Thursday runs itself".
  - RingCentral story: pasting the whole Mobile Link "gives no access" (treated as a wrong Meeting ID).
  - Client calls (Zoom, Widget, RTMP, HLS exercises): the seven deciding questions and the client's answers per exercise are KUDO's real discovery list for that request (anything missing?).
- **Open decisions:**
  - Is a Large Meeting required for the RTMP and HLS exercises (scored or not)?
  - Does starting an RTMP broadcast need a confirmation step?
  - Interpreter booking lead time used in the exercises.
  - Should a passed sandbox sign off the practice for scenarios 5, 6, 10, 11, 12 and 15 (today only scenario 1 does)?
  - Should sandbox runs count towards the level?
  - Who records the expert runs: the KUDO Trainer, or a product specialist per area?
  - The sandbox scoring split (outcome / path / time).
- **Custom address academy.kudo.ai:** DNS records to add on kudo.ai.
- **Security:** reset the YouTube stream key visible in the RTMP recording.

## Next to build (Claude)
- "Be the Operator" sandbox exercise (chats, mute, recording, poll published, End meeting), once the live meeting recording as Operator is in.
- Third-party look-alikes for Teams, Meet/Webex/ON24 and RingCentral Events, from the recordings (Zoom done 27 Nov).
- Correct the slide mocks of the client tools from the recordings.
- Regenerate Jack's handover ZIP (outdated: predates card rules v2, both UX passes, the client call, the lesson stories, the virtual coach and trainer messages). Do it once the recordings are in, so he gets one current version.

## Known limits
- The virtual coach shows on trainee pages, and for an admin who is also on the team, in their own Academy (My Academy in the menu).
- Questions to the coach are not stored; messages to the KUDO Trainer are (they need a reply).
- KUDOG answers with Claude since 27 Nov (ANTHROPIC_API_KEY in Railway): grounded in the lessons, the KUDO Trainer's FAQ and the trainee's own data; built-in answers if Claude does not respond. The server log says "KUDOG AI: ready" at start-up when the key works.
