const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('assert');
const host=fs.readFileSync('tests/.generated/site/index.html','utf8');
const encoded=host.match(/const LEGACY_ORDERS_HTML_B64\s*=\s*['"]([^'"]+)/)[1];
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message)});vc.on('error',(...args)=>errors.push(args.map(String).join(' ')));
const dom=new JSDOM(Buffer.from(encoded,'base64').toString('utf8'),{url:'https://losstudio.github.io/LOS-app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};}});
(async()=>{
 const w=dom.window;await new Promise(r=>setTimeout(r,100));
 const empty=()=>w.dispatchEvent(new w.MessageEvent('message',{data:{type:'LOS_PARENT_TO_V1533',inventory:[],packaging:[],orders:[],orderHistory:[],info:{}}}));
 empty();assert.equal(w.eval('orders.length'),0);
 w.document.querySelector('.addOrder').click();assert.equal(w.eval('orders.length'),1,'New Order works with no previous order');
 const name=w.document.getElementById('orderName');name.value='First order';name.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.document.querySelector('[onclick="saveStudio()"]').click();assert.equal(JSON.parse(w.localStorage.getItem('los_orders_workspace'))[0].name,'First order');
 empty();assert.equal(w.eval('orders.length'),0);assert.notEqual(name.value,'First order','Empty account cannot display a previous order');
 w.document.querySelector('[onclick="saveStudio()"]').click();assert.equal(w.eval('orders.length'),1,'Save Order can create the first draft');
 assert.deepEqual(errors,[]);
 console.log('PASS: empty account Orders New/Save buttons, typing and cleared previous fields');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
