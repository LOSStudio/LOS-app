import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {changeEmail} from './handler.ts';
const url = Deno.env.get('SUPABASE_URL');
const anon = Deno.env.get('SUPABASE_ANON_KEY');
const options = {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}};
// Only anonymous clients: both identity checks and updates go through Supabase Auth.
Deno.serve(req => changeEmail(req, createClient(url, anon, options), createClient(url, anon, options)));
