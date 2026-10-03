const vm=require('vm'),fs=require('fs'),assert=require('assert');
const handlers={};const self={location:{origin:'https://losstudio.github.io'},addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../sw.js'),'utf8'),{self,URL});
for(const url of ['https://example.supabase.co/rest/v1/los_studio_sync','https://cdn.jsdelivr.net/library.js']){
 let cached=false;handlers.fetch({request:{method:'GET',url},respondWith(){cached=true}});assert.equal(cached,false,'Cross-origin request must bypass cache');
}
console.log('Supabase and CDN requests bypass the service-worker cache');
