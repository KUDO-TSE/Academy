# KUDO Academy: pending items

Updated 26 Nov 2026. Ask "what is still pending?" at any time; this list is kept up to date with every change.

## Waiting on Nils
- **Claude API key for the virtual coach.** Add `ANTHROPIC_API_KEY` in Railway (service variables). Until then the coach gives built-in answers only; with it, it answers any question from the trainee's own data. Optional: `COACH_MODEL`.
- **Recordings (announced for 27 Nov):**
  - The client's side of each integration, to rebuild as generic look-alikes and to correct the screen mocks in the lesson slides: Microsoft Teams (KUDO app panel and admin center), Zoom (meeting settings), Google Meet, Webex, ON24 (Console Builder), RingCentral Events (app settings).
  - KUDO screens not recorded yet: the external meeting form, the live meeting page, Create glossary and term screens, AI detection and voices, Audio Manager, onsite QR, the KUDO app in Teams, the KUDO Live phone app (Meet Now), the preparation materials page, partial booking, the full Usage & analytics.
- **Facts to confirm** (wording drafted from the lessons, a step beyond them):
  - Platform story: ending the meeting makes "every partner drop out"; "ten minutes on Monday decides whether Thursday runs itself".
  - RingCentral story: pasting the whole Mobile Link "gives no access" (treated as a wrong Meeting ID).
  - HLS client call: the seven deciding questions and the client's answers are KUDO's real discovery list for a "put it on our website" request (anything missing, such as a rehearsal with the web team?).
- **Open decisions:**
  - Is a Large Meeting required for the RTMP and HLS exercises (scored or not)?
  - Does starting an RTMP broadcast need a confirmation step?
  - Interpreter booking lead time used in the exercises.
  - Should a passed sandbox sign off the practice for scenarios 5, 10, 11, 12 and 15 (today only scenario 1 does)?
  - Should sandbox runs count towards the level?
  - Who records the expert runs: the KUDO Trainer, or a product specialist per area?
  - The sandbox scoring split (outcome / path / time).
- **Custom address academy.kudo.ai:** DNS records to add on kudo.ai.
- **Security:** reset the YouTube stream key visible in the RTMP recording.

## Next to build (Claude)
- Client call before the build for the Widget and RTMP exercises, as in HLS (once the HLS format is confirmed).
- Third-party look-alikes for Teams, Zoom, Meet/Webex/ON24 and RingCentral Events, from the recordings.
- Correct the slide mocks of the client tools from the recordings.
- Regenerate Jack's handover ZIP (outdated: predates card rules v2, both UX passes, the client call, the lesson stories, the virtual coach and trainer messages). Do it once the recordings are in, so he gets one current version.

## Known limits
- The virtual coach is for trainee accounts; an admin who is also on the team uses "Try as a trainee" to see it.
- Questions to the coach are not stored; messages to the KUDO Trainer are (they need a reply).
