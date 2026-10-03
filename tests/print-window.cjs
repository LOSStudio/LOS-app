const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('.github/scripts/print-window.js','utf8');
for(const mobile of [false,true]){
  const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window;
  const opened=[],blobs=[];let block=false;
  w.matchMedia=()=>({matches:mobile});
  w.Blob=class{constructor(parts){blobs.push(parts.join(''))}};
  w.URL.createObjectURL=()=> 'blob:ready-print';
  w.open=(url)=>{opened.push(url);return block?null:{close(){}}};
  w.eval(source);
  if(!mobile){w.open('about:blank');assert.deepEqual(opened,['about:blank']);dom.window.close();continue}
  const page=w.open('about:blank');assert.equal(opened.length,0,'No empty tab before writing');
  page.document.write('<html><body><h1>Order quote</h1></body></html>');
  page.document.close();assert.deepEqual(opened,['blob:ready-print']);
  assert(blobs[0].includes('Order quote'));assert(blobs[0].includes('onclick="window.print()"'));
  block=true;const next=w.open();next.document.write('<body>Receipt</body>');next.document.close();
  assert(w.document.querySelector('[role="dialog"] a'),'Blocked popups have a user-tappable fallback');
  const pdf=w.open('about:blank');pdf.location.href='blob:pdf';assert.equal(opened.at(-1),'blob:pdf');
  w.close();
}
console.log('PASS: phone previews open only after preparation, visible Print button, blocked-popup fallback, PDF navigation, desktop unchanged');
{
  const dom=new JSDOM('<title>Studio</title><body></body>',{runScripts:'outside-only'}),w=dom.window;
  const jobs=[];w.AndroidPrint={printHtml:(html,title)=>jobs.push({html,title})};
  w.open=()=>{throw new Error('Native printing must not open a blank popup')};
  w.eval(source);const page=w.open('about:blank');page.document.write('<title>Quote</title><body>Ready quote</body>');page.document.close();
  assert.equal(jobs[0].title,'Quote');assert(jobs[0].html.includes('Ready quote'));w.print();assert.equal(jobs[1].title,'Studio');w.close();
  console.log('PASS: Android bridge receives prepared print HTML and direct print requests');
}
