const origin = 'https://losstudio.github.io';
const headers = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store'};
const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});

async function ownedFiles(storage, prefix) {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await storage.list(prefix, {limit: 1000, offset, sortBy: {column: 'name', order: 'asc'}});
    if (error) throw error;
    for (const item of data || []) {
      const path = prefix + '/' + item.name;
      if (item.id) files.push(path);
      else files.push(...await ownedFiles(storage, path));
    }
    if (!data || data.length < 1000) break;
  }
  return files;
}

export async function deleteAccount(req, admin, passwordClient) {
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return reply(403, {error: 'This request is not allowed.'});
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (req.method !== 'POST') return reply(405, {error: 'Use POST.'});
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return reply(401, {error: 'Please sign in again.'});
  const token = auth.slice(7);
  try {
    // The signed JWT is verified by Auth; no client-supplied user ID is used.
    const verified = await admin.auth.getUser(token);
    if (verified.error || !verified.data?.user?.id || !verified.data.user.email) return reply(401, {error: 'Please sign in again.'});
    const user = verified.data.user;
    const text = await req.text();
    if (text.length > 5000) return reply(400, {error: 'Invalid request.'});
    let body;
    try { body = JSON.parse(text); } catch { return reply(400, {error: 'Invalid request.'}); }
    if (body.confirm !== true || typeof body.password !== 'string' || !body.password || body.password.length > 1024 || body.user_id || body.email) return reply(400, {error: 'Confirm deletion and enter your current password.'});
    const reauthenticated = await passwordClient.auth.signInWithPassword({email: user.email, password: body.password});
    if (reauthenticated.error || reauthenticated.data?.user?.id !== user.id) return reply(403, {error: 'The current password is incorrect.'});
    const sessionToken = reauthenticated.data.session?.access_token;
    if (!sessionToken) return reply(403, {error: 'Please sign in again.'});
    const storage = admin.storage.from('los-studio-private-files');
    const files = await ownedFiles(storage, user.id);
    for (let i = 0; i < files.length; i += 100) {
      const {error} = await storage.remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    // Revoke every refresh session before deleting Auth and its cascading snapshot.
    const revoked = await admin.auth.admin.signOut(sessionToken, 'global');
    if (revoked.error) throw revoked.error;
    const deleted = await admin.auth.admin.deleteUser(user.id, false);
    if (deleted.error) throw deleted.error;
    return reply(200, {deleted: true});
  } catch {
    return reply(500, {error: 'Deletion could not be completed. Please try again. If you were signed out, log in first.'});
  }
}
