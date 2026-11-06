/* Optional standalone-only pull to refresh. Remove this script to restore the previous behavior. */
(()=>{
'use strict';
const standalone=()=>navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
if(!standalone()||navigator.maxTouchPoints<1)return;
const dirtyForms=new WeakSet();
const markDirty=e=>{const form=e.target.closest?.('form');if(form)dirtyForms.add(form)};
document.addEventListener('input',markDirty,true);
document.addEventListener('change',markDirty,true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-fuel]'))markDirty(e)},true);
const indicator=document.createElement('div');
indicator.id='pull-refresh-indicator';indicator.hidden=true;indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');
document.body.append(indicator);
const style=document.createElement('style');
style.textContent='#pull-refresh-indicator{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);z-index:1000;max-width:calc(100% - 28px);padding:11px 17px;border:1px solid var(--green);border-radius:28px;background:var(--panel);color:var(--green);font:14px Arial,Helvetica,sans-serif;text-align:center;pointer-events:none;box-shadow:0 4px 18px #0003}#pull-refresh-indicator[hidden]{display:none}';
document.head.append(style);
let start=null,distance=0,dragging=false,reloading=false;
const atTop=()=>Math.max(window.scrollY||0,document.scrollingElement?.scrollTop||0)<=1;
const blocked=()=>reloading||document.querySelector('dialog[open]')||document.visibilityState==='hidden'||(typeof busy!=='undefined'&&busy);
const reset=()=>{start=null;distance=0;dragging=false;if(!reloading)indicator.hidden=true};
const formHasChanges=()=>[...document.querySelectorAll('form')].some(f=>dirtyForms.has(f));
document.addEventListener('touchstart',e=>{
reset();
if(!standalone()||blocked()||!atTop()||e.touches.length!==1||window.visualViewport?.scale>1)return;
if(e.target.closest?.('input,textarea,select,button,a,label,dialog,[contenteditable="true"]'))return;
// Preserve scrolling in any independently scrollable region.
for(let node=e.target;node&&node!==document.body;node=node.parentElement){if(node.scrollHeight>node.clientHeight+2&&/auto|scroll/.test(getComputedStyle(node).overflowY))return}
start={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
document.addEventListener('touchmove',e=>{
if(!start)return;
if(e.touches.length!==1||blocked()||!atTop()){reset();return}
const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;
if(!dragging&&(dy<0||Math.abs(dx)>Math.max(12,Math.abs(dy)))){reset();return}
if(dy<10&&!dragging)return;
if(!e.cancelable){reset();return}
e.preventDefault();dragging=true;distance=Math.max(0,dy);
indicator.hidden=false;indicator.textContent=distance>=110?'↻ Eliberează pentru reîncărcare':'↓ Trage pentru reîncărcare';
},{passive:false});
document.addEventListener('touchend',e=>{
if(e.touches.length){reset();return}
const refresh=dragging&&distance>=110&&!blocked()&&atTop();
reset();if(!refresh)return;
if(formHasChanges()&&!window.confirm('Ai modificări nesalvate. Reîncarci pagina și renunți la ele?'))return;
reloading=true;indicator.hidden=false;indicator.textContent='↻ Se reîncarcă…';
setTimeout(()=>window.location.reload(),100);
},{passive:true});
document.addEventListener('touchcancel',reset,{passive:true});
document.addEventListener('visibilitychange',reset);
})();
