# Piano Challenges

Learn piano scales, chords, inversions, harmony and chord progressions by playing on your own piano (MIDI or microphone), with ear training, daily practice, levels and challenges.

Live site: https://pianochallenges.com

## Deployment

The site is a static page. OVHcloud web hosting deploys this repository automatically (Git integration on the `main` branch, triggered by a GitHub webhook on each push).

- `src/piano-challenges.html` – the editable source of the whole application
- `tools/build.py` – builds `index.html` from the source (`python3 tools/build.py`)
- `index.html` – the built application (do not edit by hand)
- `CLAUDE.md` – project brief for Claude sessions
- `assets/fonts/` – self-hosted fonts
- `.htaccess` – HTTPS redirect, permissions for microphone and MIDI, caching

## Project file

Summary, decisions, deployment checklist and roadmap: https://claude.ai/code/artifact/dd48f85b-47b8-4364-87fe-94bf68509759
