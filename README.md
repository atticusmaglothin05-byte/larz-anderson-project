# Larz Anderson Auto Museum — Discourse & Literacy

Static website for the Larz Anderson Auto Museum project. The opening sequence is a scroll-controlled aerial video: scrolling forward advances the video; scrolling upward reverses it.

## Site files

- `index.html` — page structure
- `styles.css` — layout and visual styling
- `script.js` — scroll-to-video synchronization
- `assets/larz-intro-scroll.mp4` — 1080p desktop intro
- `assets/larz-intro-scroll-720.mp4` — lighter mobile intro
- `assets/larz-poster.jpg` — loading/poster image
- `.github/workflows/deploy-pages.yml` — automatic GitHub Pages deployment

## Editing

The site is plain HTML, CSS, and JavaScript. There is no framework or build step. Edit the files directly and push to `main`; the Pages workflow deploys the updated site automatically after GitHub Pages is enabled for the repository.

To change how much scrolling controls the intro, edit `--intro-scroll-length` near the top of `styles.css`.

## Project content

The homepage contains the final “Automotive Literacy at Larz Anderson” written portion by Atticus Maglothin, with ten optimized JPEG photographs from the October 10, 2026 visit. The sections cover automotive art and history, discourse, practical knowledge, place and identity, field notes, and Works Cited. Photographs enlarge in an accessible dialog. The separate Fun Fact page retains the eagle fluid reveal and its remaining placeholders.
