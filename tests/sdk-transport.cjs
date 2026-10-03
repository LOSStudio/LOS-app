// Check the pinned SDK uses text bodies compatible with AndroidSupabase's HTTPS bridge.
const assert=require('assert');const {createClient}=require('@supabase/supabase-js');
const calls=[];const now=Math.floor(Date.now()/1000);const token=[{alg:'HS256',typ:'JWT'},{sub:'00000000-0000-0000-0000-000000000001',exp:now+3600},'signature'].map((v,i)=>i<2?Buffer.from(JSON.stringify(v)).toString('base64url'):v).join('.');
const user={id:'00000000-0000-0000-0000-000000000001',email:'test@example.com',aud:'authenticated',role:'authenticated'};
const sb=createClient('https://example.supabase.co','sb_publishable_test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,init)=>{
 calls.push({url:String(url),init});let body={};
 if(String(url).includes('/auth/v1/token'))body={access_token:token,refresh_token:'refresh',expires_in:3600,token_type:'bearer',user};
 else if(String(url).includes('/storage/v1/object/')&&init.method==='POST')body={Key:'test/file.json'};
 else if(String(url).includes('/storage/v1/object/'))return new Response('{"id":"file"}',{headers:{'Content-Type':'application/json'}});
 else if(String(url).includes('/rest/v1/rpc/'))body={accepted:true,row:{revision:1}};
 return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
}}});
(async()=>{assert.equal((await sb.auth.signInWithPassword({email:user.email,password:'test-password'})).error,null);assert.equal((await sb.storage.from('los-studio-private-files').upload(user.id+'/file.json','{"id":"file"}',{contentType:'application/json',upsert:true})).error,null);assert.equal((await sb.rpc('los_studio_commit',{expected_revision:0,snapshot:{},device:'test'})).error,null);const file=await sb.storage.from('los-studio-private-files').download(user.id+'/file.json');assert.equal(await file.data.text(),'{"id":"file"}');for(const c of calls.filter(x=>x.init.method==='POST'))assert.equal(typeof c.init.body,'string');assert(calls.some(c=>new Headers(c.init.headers).get('Authorization')==='Bearer '+token));console.log('PASS: pinned SDK login, JSON file upload/download, RPC and JWT headers use Android-compatible transport')})().catch(e=>{console.error(e);process.exitCode=1});
