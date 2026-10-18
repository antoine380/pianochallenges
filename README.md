# Piano Challenges

Learn piano scales, chords, inversions, harmony and chord progressions by playing on your own piano (MIDI or microphone), with ear training, daily practice, levels and challenges.

Live site: https://pianochallenges.com

## Deployment

The site is a static page. OVHcloud web hosting deploys this repository automatically (Git integration on the `main` branch, triggered by a GitHub webhook on each push).

- `index.html` – the whole application
- `assets/fonts/` – self-hosted fonts
- `.htaccess` – HTTPS redirect, permissions for microphone and MIDI, caching
