// Run after account-sync has initialized its session and hydration state.
Promise.resolve().then(async function () {
  const dismissStartup = () => document.getElementById('los-startup')?.remove();
  if (__losAuthConfirmed || __losAuthRecovery) { dismissStartup(); return; }
  __losAuthSubmit.disabled = true;
  const style = document.createElement('style');
  style.textContent = '#los-auth-gate[data-restoring] input,#los-auth-gate[data-restoring] button{display:none!important}';
  document.head.appendChild(style);
  __losAuthGate.setAttribute('data-restoring', 'true');
  let failure = '';
  const controls = __losAuthGate.querySelectorAll('input,button');
  controls.forEach(el => el.hidden = true);
  __losAuthDesc.textContent = 'Opening your LOS Studio account...';
  try {
    const sb = initClient();
    const {data, error} = await sb.auth.getSession();
    if (error) throw error;
    if (!data?.session) return;
    const verified = await sb.auth.getUser();
    if (verified.error) throw verified.error;
    if (!verified.data?.user || verified.data.user.id !== data.session.user.id) return;
    if (__losAuthRecovery) return;
    __losAuthUnlocked = true;
    await __losCloudReconcile();
    if (!__losSyncHydrated) throw new Error('Could not load your account. Check your connection and log in to retry.');
    document.body.classList.remove('los-auth-locked');
    __losAuthGate.remove();
  } catch (error) {
    __losAuthUnlocked = false;
    failure = error.message || 'Please log in again.';
  } finally {
    dismissStartup();
    if (__losAuthGate.isConnected) {
      __losAuthGate.removeAttribute('data-restoring');
      controls.forEach(el => el.hidden = false);
      __losAuthSubmit.disabled = false;
      __losAuthRender();
      if (failure) __losAuthMsg(failure);
    }
  }
});
