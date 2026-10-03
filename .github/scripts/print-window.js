// Build phone print previews before opening them, so an empty tab never suspends the writer.
(function () {
  const nativePrint = window.AndroidPrint && typeof window.AndroidPrint.printHtml === 'function';
  if (!nativePrint && (!window.matchMedia || !window.matchMedia('(max-width:760px)').matches)) return;
  if (nativePrint) window.print = () => window.AndroidPrint.printHtml(document.documentElement.outerHTML, document.title || 'LOS Studio Document');
  const openWindow = window.open.bind(window);
  window.open = function (url, target, features) {
    if (url && url !== 'about:blank') return openWindow(url, target, features);
    let html = '', preview = null, closed = false;
    function openReadyPage(href) {
      if (closed) return;
      preview = openWindow(href, target || '_blank', features);
      if (!preview) {
        const box = document.createElement('div');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-label', 'Print preview');
        box.style.cssText = 'position:fixed;inset:16px;z-index:2147483647;background:#fff;padding:24px;color:#1e405e;overflow:auto;border:2px solid #bfe1f0;border-radius:8px';
        const link = document.createElement('a');
        link.textContent = 'Open prepared document';
        link.href = href;link.target = '_blank';
        link.style.cssText = 'display:block;padding:16px;background:#e1f0f7;color:#1e405e;margin-bottom:16px';
        const cancel = document.createElement('button');cancel.textContent = 'Cancel';cancel.onclick = () => box.remove();
        link.addEventListener('click', () => box.remove());
        box.append(link, cancel);document.body.appendChild(box);
      }
    }
    const locationProxy = {};
    Object.defineProperty(locationProxy, 'href', {set: openReadyPage});
    const handle = {
      document: {
        open() { html = ''; },
        write(...parts) { html += parts.join(''); },
        writeln(...parts) { html += parts.join('') + '\n'; },
        close() {
          if (closed || !html) return;
          if (nativePrint) {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            const name = parsed.title || 'LOS Studio Document';
            window.AndroidPrint.printHtml(html, name);
            return;
          }
          const toolbar = '<div id="los-ready-print" style="background:#e1f0f7;color:#1e405e;padding:12px;font-family:Arial,sans-serif"><button type="button" style="font-size:16px;padding:12px 18px" onclick="window.print()">Print / Save PDF</button></div><style>@media print{#los-ready-print{display:none!important}}</style>';
          const ready = /<body\b[^>]*>/i.test(html) ? html.replace(/<body\b[^>]*>/i, m => m + toolbar) : toolbar + html;
          const blob = new Blob([ready], {type:'text/html'});
          // Keep this URL alive while the user reads or prints the preview.
          openReadyPage(URL.createObjectURL(blob));
        }
      },
      focus() {},
      print() {},
      close() { closed = true;if (preview) preview.close(); }
    };
    Object.defineProperty(handle, 'location', {get: () => locationProxy, set: openReadyPage});
    Object.defineProperty(handle, 'closed', {get: () => closed});
    return handle;
  };
})();
