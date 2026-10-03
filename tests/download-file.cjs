const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),assert=require('assert');
const bridge=fs.readFileSync('.github/scripts/download-file.js','utf8');
const html=fs.readFileSync('tests/.generated/site/index.html','utf8');
const legacy=Buffer.from(html.match(/const LEGACY_ORDERS_HTML_B64\s*=\s*['"]([^'"]+)/)[1],'base64').toString();
const png='data:image/png;base64,aGVsbG8=';
const jobs=[],messages=[],errors=[];
const dom=new JSDOM(legacy,{url:'https://losstudio.github.io/LOS-app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){
  w.AndroidDownload={saveFile:(data,mime,name)=>jobs.push({data,mime,name})};
  w.fetch=async url=>{const r=await fetch(url);return {ok:r.ok,blob:async()=>new w.Blob([await r.arrayBuffer()],{type:r.headers.get('content-type')})}};
  w.postMessage=m=>messages.push(m);w.alert=m=>errors.push(m);w.confirm=()=>true;
  w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(t,k)=>t[k]||(()=>{})});
  w.HTMLCanvasElement.prototype.toDataURL=()=>png;
  w.Image=class{constructor(){this.width=1000;this.height=1400}set src(value){queueMicrotask(()=>this.onload&&this.onload())}};
}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const w=dom.window;await pause(1100);
  for(const variable of ['deliveryTemplateImageDataURL','deliveryReadyTemplateImageDataURL','collectionTemplateImageDataURL','handoverTemplateImageDataURL','paymentCustomerImageDataURL'])w.eval(variable+'='+JSON.stringify(png));
  const funcs=['downloadDeliveryCustomerImage','downloadDeliveryReadyCustomerImage','downloadCollectionCustomerImage','downloadHandoverCustomerImage','downloadPaymentCustomerImage'];
  w.localStorage.setItem('los_information',JSON.stringify({losAccountName:'Test account',losSortCode:'00-00-00',losAccountNumber:'00000000',losPaypal:'test@example.com'}));
  w.generatePaymentCustomerImage('deposit');await pause(80);
  for(const name of funcs){const before=jobs.length;const button=w.document.querySelector('[onclick*="'+name+'"]');assert(button,name+' button exists');button.click();await pause(80);assert(jobs.length>before,name+' must hand a file to Android: '+errors.join('; '));assert.equal(jobs.at(-1).mime,'image/png');assert(jobs.at(-1).name.endsWith('.png'))}
  for(const [mime,name] of [['application/pdf','pattern.pdf'],['application/json','backup.json'],['text/csv','inventory.csv'],['image/jpeg','photo.jpg'],['image/webp','photo.webp']]){
    const a=w.document.createElement('a');a.href='data:'+mime+';base64,aGVsbG8=';a.download=name;a.click();await pause(40);assert.equal(jobs.at(-1).name,name);assert.equal(jobs.at(-1).data,'aGVsbG8=');
  }
  messages.length=0;w.document.body.click();await pause(300);assert(!messages.some(m=>m.type==='LOS_V1533_ORDER_SUMMARIES'),'Empty tap must not save/rebuild Orders');
  assert(!errors.length,errors.join('; '));
  console.log('PASS: five actual Orders image downloads, PDF/JSON/CSV/JPEG/WebP native saver, ordinary Orders tap does not publish a form rebuild');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
