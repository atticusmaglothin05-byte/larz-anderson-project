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

## Placeholder sections

The homepage contains mostly blank areas for the project, museum context, discourse and literacy, field notes, and sources. The Fun Facts page has six empty slots. Section links and expandable analysis panels remain functional.
