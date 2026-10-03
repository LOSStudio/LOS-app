(function () {
  if (!window.AndroidDownload || typeof window.AndroidDownload.saveFile !== 'function') return;
  const originalClick = HTMLAnchorElement.prototype.click;
  const pending = new WeakSet();
  async function save(anchor) {
    if (pending.has(anchor)) return;
    pending.add(anchor);
    try {
      const response = await fetch(anchor.href);
      if (!response.ok) throw new Error('The file could not be loaded.');
      const blob = await response.blob();
      if (blob.size > 50 * 1024 * 1024) throw new Error('This file is too large to download in the app. Use Chrome for files above 50 MB.');
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('The file could not be read.'));
        reader.readAsDataURL(blob);
      });
      window.AndroidDownload.saveFile(data, blob.type.split(';')[0] || 'application/octet-stream', anchor.download || 'LOS-Studio-file');
    } catch (error) {
      alert('Could not download: ' + error.message);
    } finally { pending.delete(anchor); }
  }
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download')) { save(this);return; }
    return originalClick.apply(this, arguments);
  };
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a[download]');
    if (!link) return;
    event.preventDefault();save(link);
  }, true);
})();
