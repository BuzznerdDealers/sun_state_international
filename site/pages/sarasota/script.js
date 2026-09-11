/* Sarasota location — open the first FAQ answer on load.
 *
 * The accordion itself is the platform's `dropdown` behaviour (see
 * site/sections/loc-faq.json): triggers and panels are marked with parts and
 * the platform binds the click handling, single-open semantics, aria wiring
 * and Escape handling. The one thing that behaviour has no option for is
 * starting with a panel already open, which is how the handoff presents this
 * section, so that is all this script does.
 *
 * It drives the behaviour through a real click rather than setting the
 * attributes itself, so the behaviour's own idea of which panel is open stays
 * correct and the first press on that trigger closes it as expected.
 *
 * Page scripts load after the platform's widgets.js, so the behaviour has
 * already bound by the time this runs. With the script absent — in the Design
 * canvas, and in the first paint — the accordion is simply all-closed, which
 * is a valid, fully editable state.
 */
(function () {
  var faq = document.querySelector('[data-bz-node="loc-faq-band"]');
  if (!faq) return;
  var first = faq.querySelector('[data-bz-part~="trigger"]');
  if (!first || first.getAttribute('aria-expanded') === 'true') return;
  first.click();
})();
