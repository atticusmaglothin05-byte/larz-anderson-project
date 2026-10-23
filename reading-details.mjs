export function selectDetail(widget, id) {
  const notes = [...widget.querySelectorAll('[data-detail-note]')];
  if (!notes.some(note => note.id === id)) return;
  notes.forEach(note => { note.hidden = note.id !== id; });
  widget.querySelectorAll('[data-detail-target]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.detailTarget === id));
  });
}
export function selectPerspective(widget, mode) {
  const panels = [...widget.querySelectorAll('[data-perspective-panel]')];
  if (!panels.some(panel => panel.dataset.perspectivePanel === mode)) return;
  widget.dataset.perspective = mode;
  panels.forEach(panel => { panel.hidden = panel.dataset.perspectivePanel !== mode; });
  widget.querySelectorAll('[data-perspective-mode]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.perspectiveMode === mode));
  });
}
function initReadingDetails() {
  document.querySelectorAll('[data-reading-details]').forEach(widget => {
    widget.classList.add('is-interactive');
    selectDetail(widget, widget.querySelector('[data-detail-target]').dataset.detailTarget);
    widget.addEventListener('click', event => {
      const button = event.target.closest('[data-detail-target]');
      if (button) selectDetail(widget, button.dataset.detailTarget);
    });
  });
  document.querySelectorAll('[data-reading-perspective]').forEach(widget => {
    widget.classList.add('is-interactive');
    selectPerspective(widget, 'first');
    widget.addEventListener('click', event => {
      const button = event.target.closest('[data-perspective-mode]');
      if (button) selectPerspective(widget, button.dataset.perspectiveMode);
    });
  });
}
if (typeof document !== 'undefined') initReadingDetails();
