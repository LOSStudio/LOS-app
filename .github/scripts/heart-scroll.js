(function () {
  if (window.__losHeartScrollInstalled) return;
  window.__losHeartScrollInstalled = true;
  const sidebar = document.querySelector('.nav-sidebar');
  const workspace = document.querySelector('.workspace');
  if (!sidebar || !workspace) return;
  const style = document.createElement('style');
  style.textContent = `
    .los-heart-rail{position:fixed;width:44px;z-index:1500;pointer-events:none;display:none}
    .los-heart-rail::before{content:'';position:absolute;left:20px;top:22px;bottom:22px;width:4px;border-radius:4px;background:var(--heart-track)}
    .los-heart-handle{position:absolute;left:0;width:44px;height:44px;display:grid;place-items:center;pointer-events:auto;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;outline:none}
    .los-heart-handle svg{width:32px;height:32px;overflow:visible;filter:drop-shadow(0 2px 3px #57758b35)}
    .los-heart-handle:focus-visible{outline:2px solid #31566e;border-radius:12px;outline-offset:1px}
    .los-heart-handle.is-dragging{cursor:grabbing}
    @media print{.los-heart-rail{display:none!important}}
  `;
  document.head.appendChild(style);
  const root = () => document.scrollingElement || document.documentElement;
  const range = el => Math.max(0, el.scrollHeight - el.clientHeight);
  const pageTarget = () => range(workspace) > range(root()) ? workspace : root();
  let scheduled = false;
  const items = [];
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; items.forEach(update); });
  }
  function update(item) {
    if (item.drag) return;
    const mobile = matchMedia('(max-width:760px)').matches;
    const menuOpen = document.body.classList.contains('los-menu-open');
    const target = item.menu ? sidebar : pageTarget();
    const rect = item.menu ? sidebar.getBoundingClientRect() : { top: 0, bottom: innerHeight, right: innerWidth };
    const max = range(target);
    const visible = !document.body.classList.contains('los-auth-locked') && !document.getElementById('los-startup') && max > 1 && rect.bottom > rect.top && (item.menu ? !mobile || menuOpen : !mobile || !menuOpen);
    item.rail.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    item.target = target;
    target.id = target.id || 'los-page-root';
    item.handle.setAttribute('aria-controls', target.id);
    item.top = Math.max(12, rect.top + 12);
    const bottom = Math.min(innerHeight - 12, rect.bottom - 12);
    item.travel = Math.max(1, bottom - item.top - 44);
    item.rail.style.top = item.top + 'px';
    item.rail.style.height = (item.travel + 44) + 'px';
    item.rail.style.left = Math.max(0, Math.min(innerWidth - 44, rect.right - 44)) + 'px';
    const progress = Math.max(0, Math.min(1, target.scrollTop / max));
    item.handle.style.top = (progress * item.travel) + 'px';
    item.handle.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  }
  function create(menu) {
    const rail = document.createElement('div');
    rail.className = 'los-heart-rail';
    rail.style.setProperty('--heart-track', menu ? '#c9e7f580' : '#f4c6de80');
    const handle = document.createElement('div');
    handle.className = 'los-heart-handle';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'scrollbar');
    handle.setAttribute('aria-label', menu ? 'Scroll menu' : 'Scroll page');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-valuenow', '0');
    const target = menu ? sidebar : workspace;
    target.id = target.id || (menu ? 'los-navigation' : 'los-workspace');
    handle.setAttribute('aria-controls', target.id);
    const colour = menu ? '#91cce9' : '#edaccd';
    const border = menu ? '#579abf' : '#c979a2';
    handle.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 32C14 28 3 20 3 11A8 8 0 0 1 18 7a8 8 0 0 1 15 4c0 9-11 17-15 21Z" fill="${colour}" stroke="${border}" stroke-width="1.5"/><path d="M8 11c0-2 2-4 4-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>`;
    rail.appendChild(handle);
    document.body.appendChild(rail);
    const item = { menu, rail, handle, drag: null };
    items.push(item);
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      update(item);
      event.preventDefault();
      item.drag = { id: event.pointerId, y: event.clientY, scroll: item.target.scrollTop, max: range(item.target) };
      handle.classList.add('is-dragging');
      handle.setPointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      const drag = item.drag;
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(drag.max, drag.scroll + (event.clientY - drag.y) / item.travel * drag.max));
      item.target.scrollTop = next;
      handle.style.top = (next / Math.max(1, drag.max) * item.travel) + 'px';
      handle.setAttribute('aria-valuenow', String(Math.round(next / Math.max(1, drag.max) * 100)));
    });
    function finish() { item.drag = null; handle.classList.remove('is-dragging'); schedule(); }
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
    handle.addEventListener('keydown', event => {
      update(item);
      if (!item.target) return;
      const max = range(item.target), step = Math.max(40, item.target.clientHeight * .1);
      const values = { ArrowUp: -step, ArrowDown: step, PageUp: -item.target.clientHeight * .8, PageDown: item.target.clientHeight * .8, Home: -max, End: max };
      if (!(event.key in values)) return;
      event.preventDefault();
      item.target.scrollTop = Math.max(0, Math.min(max, item.target.scrollTop + values[event.key]));
      schedule();
    });
  }
  create(true);
  create(false);
  document.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.los-heart-rail'))) schedule();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(schedule);
    observer.observe(sidebar);
    observer.observe(workspace);
  }
  schedule();
})();
