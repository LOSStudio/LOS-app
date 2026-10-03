// Runs inside the cloud-sync closure after account-sync initialization.
(function () {
  const view = document.getElementById('viewCloudSync');
  if (!view) return;
  const css = document.createElement('style');
  css.textContent = '#los-account-settings input{box-sizing:border-box;width:100%;max-width:420px;padding:12px;border:1px solid #bcddeb;border-radius:12px;font-size:16px;background:#fff;color:#31566e}#los-delete-dialog{width:min(90vw,440px);box-sizing:border-box;border:1px solid #edc9dd;border-radius:24px;padding:26px;color:#31566e;background:#fff9fc}#los-delete-dialog::backdrop{background:#31566e60}#los-delete-dialog input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #bcddeb;border-radius:12px;font-size:16px}#los-delete-dialog .btnrow{margin-top:20px}#los-account-settings label{display:block;margin:12px 0 6px}#los-account-settings [role=status],#los-delete-dialog [role=status]{line-height:1.5;min-height:24px;margin-top:12px}';
  document.head.appendChild(css);
  const panel = document.createElement('div');
  panel.id = 'los-account-settings'; panel.className = 'panel pink';
  panel.innerHTML = '<h3>Account settings</h3><p id="los-settings-email"></p><form id="los-email-form"><label for="los-new-email">New email address</label><input id="los-new-email" type="email" autocomplete="email" required><p>Your orders, photos, files and all other saved information stay in this account. Confirm the change using the links sent to your current and new email addresses.</p><button class="btn secondary" type="submit" id="los-change-email">Change email</button></form><p id="los-email-status" role="status"></p><hr><h3>Delete account</h3><p>Permanently remove your account and its saved information.</p><button class="btn danger" type="button" id="los-delete-open">Delete account</button>';
  view.appendChild(panel);
  const dialog = document.createElement('dialog'); dialog.id = 'los-delete-dialog';
  dialog.innerHTML = '<form id="los-delete-form"><h3>Are you sure you want to delete your account?</h3><p>This permanently deletes your account and saved data, including orders, photos and files. This cannot be undone.</p><label for="los-delete-password">Enter your current password to confirm</label><input id="los-delete-password" type="password" autocomplete="current-password" required><p id="los-delete-status" role="status"></p><div class="btnrow"><button type="button" class="btn secondary" id="los-delete-cancel">Cancel</button><button type="submit" class="btn danger" id="los-delete-confirm">Delete account</button></div></form>';
  document.body.appendChild(dialog);
  const el = id => document.getElementById(id);
  let busy = false;
  const message = (id, text) => el(id).textContent = text;
  async function refreshEmail() {
    try {
      const {data, error} = await initClient().auth.getUser();
      if (error || !data?.user || data.user.id !== __losAccountId) return;
      __losAccountEmail = data.user.email || '';
      el('losAccountEmail').textContent = __losAccountEmail;
      el('los-settings-email').textContent = 'Signed in as ' + __losAccountEmail + (data.user.new_email ? ' · Email change awaiting confirmation' : '');
    } catch {}
  }
  const previousSwitch = window.switchView;
  window.switchView = function (name) { const result = previousSwitch?.apply(this, arguments); if (name === 'CloudSync') refreshEmail(); return result; };
  window.addEventListener('focus', () => { if (view.classList.contains('active')) refreshEmail(); });
  el('los-email-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = el('los-new-email'), email = input.value.trim();
    if (!input.checkValidity() || !email) { input.reportValidity(); return; }
    if (email.toLowerCase() === __losAccountEmail.toLowerCase()) { message('los-email-status', 'Enter a different email address.'); return; }
    const button = el('los-change-email'); button.disabled = true;
    message('los-email-status', 'Sending confirmation emails…');
    try {
      const sb = initClient();
      const verified = await sb.auth.getUser();
      if (verified.error || verified.data?.user?.id !== __losAccountId) throw new Error('Please sign in again before changing your email.');
      const {error} = await sb.auth.updateUser({email}, {emailRedirectTo: 'https://losstudio.github.io/LOS-app/confirmed.html'});
      if (error) throw error;
      message('los-email-status', 'Check your current and new inboxes and confirm the change. Keep using your current email until both confirmations are complete. Your saved information stays in this account.');
      input.value = ''; await refreshEmail();
    } catch (error) { message('los-email-status', error.message || 'Email could not be changed. Please try again.'); }
    finally { button.disabled = false; }
  });
  el('los-delete-open').onclick = () => { el('los-delete-password').value = ''; message('los-delete-status', ''); dialog.showModal(); };
  el('los-delete-cancel').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { el('los-delete-password').value = ''; });
  el('los-delete-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const password = el('los-delete-password').value; if (!password) return;
    busy = true; el('los-delete-confirm').disabled = true; el('los-delete-cancel').disabled = true;
    message('los-delete-status', 'Deleting your account…');
    const wasUnlocked = __losAuthUnlocked, wasHydrated = __losSyncHydrated;
    let deletedOnServer = false;
    // Cancel in-flight merges and stop retries while deletion is in progress.
    __losGeneration++; __losAuthUnlocked = false; clearTimeout(__losPushTimer);
    try {
      const sb = initClient();
      const {data, error} = await sb.auth.getSession();
      if (error || !data?.session?.access_token) throw new Error('Please sign in again.');
      const response = await fetch('https://nydbklqskvctwxemzoyf.supabase.co/functions/v1/delete-account', {method: 'POST', headers: {'Content-Type': 'application/json', apikey: cfg().key, Authorization: 'Bearer ' + data.session.access_token}, body: JSON.stringify({confirm: true, password})});
      const result = await response.json();
      if (!response.ok || result.deleted !== true) throw new Error(result.error || 'Account could not be deleted.');
      deletedOnServer = true;
      __losSyncHydrated = false;
      const account = __losAccountId;
      __losSyncApplying = true;
      try {
        for (const spec of __losFileStores) {
          const db = await spec.open();
          await new Promise((resolve, reject) => { const tx = db.transaction(spec.store, 'readwrite'); tx.objectStore(spec.store).clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; });
        }
        // Remove old, unscoped migration copies belonging to this device too.
        const existing = await indexedDB.databases();
        for (const spec of __losFileStores) {
          if (!existing.some(entry => entry.name === spec.db)) continue;
          await new Promise((resolve, reject) => {
            const req = __losOriginalDBOpen.call(indexedDB, spec.db);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => { const db = req.result; if (!db.objectStoreNames.contains(spec.store)) { db.close(); resolve(); return; } const tx = db.transaction(spec.store, 'readwrite'); tx.objectStore(spec.store).clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; };
          });
        }
        const db = await __losMetaDB();
        await new Promise((resolve, reject) => { const tx = db.transaction('accounts', 'readwrite'), store = tx.objectStore('accounts'), req = store.openCursor(); req.onsuccess = () => { const cursor = req.result; if (!cursor) return; if (cursor.key === account || String(cursor.key).startsWith(account + ':')) cursor.delete(); cursor.continue(); }; tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; });
        const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.filter(key => __losIsSyncableStorageKey(key) || key === 'losStudioCloudLocalOwnerV1' || key === 'losStudioBlueprintV1' || key === 'losStudioFileMigrationV2:' + account).forEach(key => localStorage.removeItem(key));
        state = __losFreshState();
      } finally { __losSyncApplying = false; }
      await sb.auth.signOut({scope: 'local'});
      __losCloudReset(); __losAccountEmail = '';
      document.body.classList.add('los-auth-locked');
      if (!__losAuthGate.isConnected) document.body.appendChild(__losAuthGate);
      __losAuthRender(); __losAuthMsg('Your account has been deleted. You can create a new account when you are ready.', true);
      dialog.close(); message('los-settings-email', '');
    } catch (error) {
      if (deletedOnServer) {
        __losSyncHydrated = false; __losAuthUnlocked = false;
        state = __losFreshState();
        const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        __losSyncApplying = true;
        try { keys.filter(key => __losIsSyncableStorageKey(key) || key === 'losStudioCloudLocalOwnerV1' || key === 'losStudioBlueprintV1').forEach(key => localStorage.removeItem(key)); }
        finally { __losSyncApplying = false; }
        await initClient().auth.signOut({scope: 'local'}).catch(() => {});
        __losCloudReset();
        document.body.classList.add('los-auth-locked');
        if (!__losAuthGate.isConnected) document.body.appendChild(__losAuthGate);
        __losAuthRender(); __losAuthMsg('Your account has been deleted. Please close and reopen the app before creating a new account.', true);
        dialog.close();
      } else {
        __losAuthUnlocked = wasUnlocked; __losSyncHydrated = wasHydrated;
        message('los-delete-status', error.message || 'Deletion could not be completed. Please try again.');
      }
    } finally { busy = false; el('los-delete-password').value = ''; el('los-delete-confirm').disabled = false; el('los-delete-cancel').disabled = false; }
  });
})();
