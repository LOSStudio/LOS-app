// Protect destructive controls that do not already have confirmation or undo.
(function(){
const bypass=new WeakSet();let target=null,owner=null;const identity=()=>{try{return window.top.losAccountIdentity?.()}catch{return null}};
const dialog=document.createElement('dialog');dialog.id='los-record-delete-dialog';dialog.style.cssText='max-width:440px;width:88vw;box-sizing:border-box;padding:24px;border:1px solid #edbad2;border-radius:22px;background:#fffafd;color:#31566e';
dialog.innerHTML='<h3>Delete this saved information?</h3><p>This removes the selected item. Cancel if you want to keep it.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" class="btn secondary" data-cancel>Cancel</button><button type="button" class="btn pink" data-delete>Delete item</button></div>';
function mount(){if(!dialog.isConnected)document.body.appendChild(dialog)}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button');if(!button||bypass.has(button)||button.closest('dialog,#losOrderDeleteOverlay,#los-account-settings'))return;
 if(!/^(delete|remove|clear all)\b/i.test(button.textContent.trim()))return;
 const handler=button.getAttribute('onclick')||'',name=handler.match(/^\s*([\w$]+)\s*\(/)?.[1],fn=name&&window[name];
 // Keep existing owner-specific dialogs, double-tap deletion and undo controls.
 if(name==='deleteOrder'||name==='deleteOrderFromCard'||button.dataset.orderAction==='delete'||button.dataset.patternFile==='delete'||button.dataset.printableAction==='delete'||/undo|tap again|archive/i.test(button.textContent)||/confirm\s*\(|pendingInventoryDeleteId/.test(String(fn||button.onclick)))return;
 event.preventDefault();event.stopImmediatePropagation();target=button;owner=identity();mount();dialog.showModal();
},true);
dialog.querySelector('[data-cancel]').onclick=()=>{target=null;dialog.close()};
dialog.addEventListener('cancel',()=>{target=null});
dialog.querySelector('[data-delete]').onclick=()=>{const button=target;target=null;dialog.close();if(!button?.isConnected||owner!==identity()||document.body.classList.contains('los-auth-locked'))return;bypass.add(button);try{button.click()}finally{bypass.delete(button)}};
})();
