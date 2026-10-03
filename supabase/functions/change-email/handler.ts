const origin = 'https://losstudio.github.io';
const headers = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store'};
const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});
export async function changeEmail(req, currentClient, passwordClient) {
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return reply(403, {error: 'This request is not allowed.'});
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (req.method !== 'POST') return reply(405, {error: 'Use POST.'});
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return reply(401, {error: 'Please sign in again.'});
  let signedIn = false;
  try {
    const verified = await currentClient.auth.getUser(auth.slice(7));
    const user = verified.data?.user;
    if (verified.error || !user?.id || !user.email) return reply(401, {error: 'Please sign in again.'});
    const text = await req.text();
    if (text.length > 5000) return reply(400, {error: 'Invalid request.'});
    let body; try { body = JSON.parse(text); } catch { return reply(400, {error: 'Invalid request.'}); }
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body.password !== 'string' || !body.password || body.password.length > 1024 || body.user_id) return reply(400, {error: 'Enter a valid new email address and your current password.'});
    if (email.toLowerCase() === user.email.toLowerCase()) return reply(400, {error: 'Enter a different email address.'});
    // Reauthentication uses this token's verified email, never a supplied account ID.
    const reauthenticated = await passwordClient.auth.signInWithPassword({email: user.email, password: body.password});
    signedIn = !!reauthenticated.data?.session;
    if (reauthenticated.error || reauthenticated.data?.user?.id !== user.id) return reply(403, {error: 'The current password is incorrect.'});
    const updated = await passwordClient.auth.updateUser({email}, {emailRedirectTo: 'https://losstudio.github.io/LOS-app/confirmed.html'});
    if (updated.error) return reply(400, {error: updated.error.code === 'email_exists' ? 'That email address is already used by another LOS Studio account.' : 'The email change could not be requested. Check the address and try again.'});
    return reply(200, {requested: true});
  } catch { return reply(500, {error: 'Email could not be changed. Please try again.'}); }
  finally { if (signedIn) await passwordClient.auth.signOut({scope: 'local'}).catch(() => {}); }
}
