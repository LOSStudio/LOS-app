const assert=require('assert');
(async()=>{
 const {deleteAccount}=await import('../supabase/functions/delete-account/handler.ts');
 let removed=[],deleted=[],revoked=[];
 const storage={list:async prefix=>({data:prefix==='owner'?[{name:'nested',id:null},{name:'file.json',id:'f'}]:[{name:'photo.json',id:'p'}]}),remove:async paths=>{removed.push(...paths);return {}}};
 const admin={auth:{getUser:async token=>token==='good'?{data:{user:{id:'owner',email:'owner@example.com'}}}:{error:{message:'Invalid JWT'}},admin:{signOut:async(t,s)=>{revoked.push(s);return {}},deleteUser:async id=>{deleted.push(id);return {}}}},storage:{from:name=>{assert.equal(name,'los-studio-private-files');return storage}}};
 const auth={auth:{signInWithPassword:async args=>args.password==='correct'?{data:{user:{id:'owner'},session:{access_token:'fresh'}}}:{error:{message:'Bad password'}}}};
 const request=(body,token='good',method='POST')=>new Request('https://test',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});
 assert.equal((await deleteAccount(request({confirm:true,password:'correct'},'bad'),admin,auth)).status,401);
 assert.equal((await deleteAccount(request({confirm:false,password:'correct'}),admin,auth)).status,400);
 assert.equal((await deleteAccount(request({confirm:true,password:'wrong'}),admin,auth)).status,403);
 assert.equal((await deleteAccount(request({confirm:true,password:'correct',user_id:'other'}),admin,auth)).status,400);
 assert.equal(deleted.length,0);assert.equal(removed.length,0);
 assert.equal((await deleteAccount(request({confirm:true,password:'correct'}),admin,auth)).status,200);
 assert.deepEqual(deleted,['owner']);assert.deepEqual(revoked,['global']);assert.deepEqual(removed,['owner/nested/photo.json','owner/file.json']);
 console.log('Deletion rejects unauthenticated, unconfirmed, wrong-password and foreign-ID requests; only verified owner files and user are removed');
})();
