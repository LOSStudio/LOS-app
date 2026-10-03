const assert=require('assert');
(async()=>{
const {changeEmail}=await import('../supabase/functions/change-email/handler.ts');
let updates=[],revocations=0,backupWrites=[],backupFails=false;
const current={auth:{getUser:async token=>token==='valid'?{data:{user:{id:'me',email:'old@example.com'}}}:{error:{}}}};
const snapshot={info:{businessName:'Keep me'},legacyOrders:[{id:'order'}],inventory:[{id:'fabric'}]};
const pw={from(table){if(table==='los_studio_sync')return{select(){return this},eq(){return this},maybeSingle:async()=>({data:{state:snapshot,revision:42}})};return{insert:async row=>{backupWrites.push(row);return backupFails?{error:{code:'storage_error'}}:{}}}},auth:{signInWithPassword:async args=>args.password==='correct'?{data:{user:{id:'me'},session:{access_token:'reauth'}}}:{error:{}},updateUser:async(args,opts)=>{updates.push([args,opts]);return{}},signOut:async()=>{revocations++;return{}}}};
const req=(body,token='valid')=>new Request('https://test/change-email',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
assert.equal((await changeEmail(req({email:'new@example.com',password:'correct'},'bad'),current,pw)).status,401);
assert.equal((await changeEmail(req({email:'new@example.com',password:'wrong'}),current,pw)).status,403);
assert.equal((await changeEmail(req({email:'new@example.com',password:'correct',user_id:'other'}),current,pw)).status,400);
assert.equal(updates.length,0);
assert.equal((await changeEmail(req({email:'new@example.com',password:'correct'}),current,pw)).status,200);
assert.deepEqual(updates,[[{email:'new@example.com'},{emailRedirectTo:'https://losstudio.github.io/LOS-app/confirmed.html'}]]);
assert.equal(revocations,1);assert.deepEqual(backupWrites,[{user_id:'me',revision:42,state:snapshot}]);
backupFails=true;assert.equal((await changeEmail(req({email:'next@example.com',password:'correct'}),current,pw)).status,503);assert.equal(updates.length,1);backupFails=false;
pw.auth.signInWithPassword=async()=>({data:{user:{id:'other'},session:{}}});assert.equal((await changeEmail(req({email:'new@example.com',password:'correct'}),current,pw)).status,403);assert.equal(updates.length,1);
console.log('PASS: email change requires valid token and current password, cannot target another user, uses fixed confirmation page and releases temporary session');
})().catch(e=>{console.error(e);process.exitCode=1});
