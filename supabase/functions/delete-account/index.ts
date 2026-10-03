import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {deleteAccount} from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const options = {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}};
// Credentials stay in the Edge Function environment, never in the app.
Deno.serve(req => deleteAccount(req,
  createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), options),
  createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), options)
));
