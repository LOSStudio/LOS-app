const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('assert'),path=require('path');
const dom=new JSDOM('<html><head></head><body><aside class="nav-sidebar"></aside><main class="workspace"></main></body></html>',{runScripts:'outside-only'});
const w=dom.window,d=w.document,menu=d.querySelector('aside'),page=d.querySelector('main');
let mobile=false,frames=[];
w.matchMedia=()=>({matches:mobile});w.requestAnimationFrame=fn=>frames.push(fn);
Object.defineProperty(w,'innerHeight',{value:800});Object.defineProperty(w,'innerWidth',{value:1200});
function size(el,scrollHeight,clientHeight){Object.defineProperty(el,'scrollHeight',{value:scrollHeight,configurable:true});Object.defineProperty(el,'clientHeight',{value:clientHeight,configurable:true});}
size(menu,1600,800);size(page,4000,800);size(d.documentElement,800,800);
menu.getBoundingClientRect=()=>({top:0,bottom:800,right:250});
w.eval(fs.readFileSync(path.join(__dirname,'../.github/scripts/heart-scroll.js'),'utf8'));
function flush(){const q=frames;frames=[];q.forEach(fn=>fn());}
const blue=d.querySelector('[aria-label="Scroll menu"]'),pink=d.querySelector('[aria-label="Scroll page"]');flush();
function pointer(handle,type,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,clientY:y,button:0});handle.dispatchEvent(e);}
pointer(blue,'pointerdown',100);pointer(blue,'pointermove',466);pointer(blue,'pointerup',466);flush();assert.equal(menu.scrollTop,400);assert.equal(page.scrollTop,0);
pointer(pink,'pointerdown',100);pointer(pink,'pointermove',466);pointer(pink,'pointerup',466);flush();assert.equal(page.scrollTop,1600);assert.equal(menu.scrollTop,400);
pink.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));flush();assert.equal(page.scrollTop,3200);
size(page,800,800);size(d.documentElement,3000,800);w.dispatchEvent(new w.Event('resize'));flush();pink.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End'}));flush();assert.equal(d.documentElement.scrollTop,2200);
mobile=true;d.body.classList.add('los-menu-open');w.dispatchEvent(new w.Event('resize'));flush();assert.equal(blue.parentElement.style.display,'block');assert.equal(pink.parentElement.style.display,'none');
d.body.classList.add('los-auth-locked');w.dispatchEvent(new w.Event('resize'));flush();assert.equal(blue.parentElement.style.display,'none');assert.equal(pink.parentElement.style.display,'none');
dom.window.close();console.log('Independent menu/page dragging, document scrolling, keyboard control, mobile menu and login visibility passed');
