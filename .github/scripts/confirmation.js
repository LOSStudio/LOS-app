(async function () {
  const params = new URLSearchParams(location.hash.slice(1)), query = new URLSearchParams(location.search);
  const heading = document.querySelector('h1'), description = document.getElementById('confirmation-description');
  const form = document.getElementById('reset-password-form'), status = document.getElementById('reset-password-status');
  const type = params.get('type');
  const clearAddress = () => history.replaceState(null, '', location.pathname);
  const unavailable = () => { heading.textContent = 'Link unavailable'; description.textContent = 'This link has expired or has already been used. Return to the app and request a new link.'; form.hidden = true; };
  if (params.get('error') || query.get('error')) { unavailable(); clearAddress(); return; }
  if (type === 'signup' && params.get('access_token')) {
    heading.textContent = 'Email confirmed successfully';
    description.textContent = 'Your LOS Studio account is ready. Please close this page, open the LOS Studio app, and log in.';
    clearAddress(); return;
  }
  if (params.get('message') && !params.get('access_token')) {
    heading.textContent = 'Confirmation received';
    description.textContent = 'Please also confirm the link sent to your other email address to finish changing your email. Then return to the app. All your saved information stays in the same account.';
    clearAddress(); return;
  }
  if (!['recovery', 'email_change'].includes(type) || !params.get('access_token') || !params.get('refresh_token')) { clearAddress(); return; }
  heading.textContent = type === 'recovery' ? 'Checking your reset link…' : 'Checking your email change…';
  description.textContent = 'Please wait a moment.';
  let sb;
  try {
    if (!window.supabase?.createClient) throw new Error('The confirmation service could not load.');
    // The email browser never stores a login or touches the app's account cache.
    sb = supabase.createClient('https://nydbklqskvctwxemzoyf.supabase.co', atob('c2JfcHVibGlzaGFibGVfWkdsSjdEWmc1aXBHOFFFbzVNaUt1Z181Q283c2NiRg=='), {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'los-email-confirmation'}});
    const session = await sb.auth.setSession({access_token: params.get('access_token'), refresh_token: params.get('refresh_token')});
    if (session.error || !session.data?.session) throw new Error('Invalid link');
    const verified = await sb.auth.getUser();
    if (verified.error || !verified.data?.user || verified.data.user.id !== session.data.session.user.id) throw new Error('Invalid link');
    clearAddress();
    if (type === 'email_change') {
      heading.textContent = verified.data.user.new_email ? 'Confirmation received' : 'Email updated successfully';
      description.textContent = verified.data.user.new_email ? 'Confirm the link in your other inbox to finish changing your email. Your saved information stays in the same account.' : 'Your email address has been updated. Please close this page, return to LOS Studio, and use your new email address to log in. All your saved information is still there.';
      await sb.auth.signOut({scope: 'local'}); return;
    }
    heading.textContent = 'Reset your password'; description.textContent = 'Choose a new password for your LOS Studio account.';
    form.hidden = false;
    form.addEventListener('submit', async event => {
      event.preventDefault(); const password = document.getElementById('reset-new-password'), confirm = document.getElementById('reset-confirm-password'), button = document.getElementById('reset-password-submit');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (password.value !== confirm.value) { status.textContent = 'The passwords do not match.'; return; }
      button.disabled = true; status.textContent = 'Updating your password…';
      try {
        const {error} = await sb.auth.updateUser({password: password.value}); if (error) throw error;
        password.value = ''; confirm.value = ''; form.hidden = true;
        heading.textContent = 'Password updated successfully'; description.textContent = 'Please close this page, return to the LOS Studio app, and log in with your new password. All your saved information stays in your account.';
        status.textContent = ''; await sb.auth.signOut({scope: 'global'});
      } catch (error) { status.textContent = error.message || 'Password could not be updated. Please request a new reset link.'; }
      finally { button.disabled = false; }
    });
  } catch { unavailable(); }
  finally { clearAddress(); }
})();
