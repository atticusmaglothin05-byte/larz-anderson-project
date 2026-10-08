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

## Content sections

The homepage includes museum context, analysis prompts, a field-notes layout, and source links. `fun-facts.html` provides a separate museum facts page. The photograph placeholder and observation prompts are examples to replace with original evidence from a visit.

Video replacements should retain both existing asset filenames. The full 16:9 frame remains visible so titles and Google Earth attribution are preserved. The park aerial image is a frame from the earlier introduction footage.
