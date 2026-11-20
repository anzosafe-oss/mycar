/* Keep the header stationary and refresh dashboard data without navigation. */
(()=>{
'use strict';
const header=document.querySelector('header');
const root=document.documentElement;
const measureHeader=()=>{if(header)root.style.setProperty('--mycar-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');};
measureHeader();
if(typeof ResizeObserver==='function'&&header)new ResizeObserver(measureHeader).observe(header);
window.addEventListener('resize',measureHeader,{passive:true});
window.visualViewport?.addEventListener('resize',measureHeader,{passive:true});
if(navigator.maxTouchPoints<1)return;
const indicator=document.createElement('div');
indicator.id='pull-refresh-indicator';indicator.className='pull-refresh-indicator';indicator.hidden=true;
indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.setAttribute('aria-atomic','true');
indicator.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/></svg><span></span>';
const label=indicator.querySelector('span');document.body.append(indicator);
const style=document.createElement('style');
style.textContent='#pull-refresh-indicator{position:fixed;top:calc(var(--mycar-header-height,70px) + 8px);left:50%;transform:translateX(-50%);z-index:1000;display:flex;align-items:center;gap:8px;width:max-content;max-width:calc(100% - 24px);padding:8px 12px;border:1px solid #555;border-radius:999px;background:var(--panel);color:var(--green);font:13px/1.3 Arial,sans-serif;pointer-events:none;box-sizing:border-box}#pull-refresh-indicator[hidden]{display:none}#pull-refresh-indicator svg{width:18px;height:18px;flex-shrink:0}#pull-refresh-indicator[data-state=ready]{border-color:var(--green)}#pull-refresh-indicator[data-state=loading] svg{animation:mycar-refresh-spin .8s linear infinite}@keyframes mycar-refresh-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#pull-refresh-indicator svg{animation:none!important}}';
document.head.append(style);
const THRESHOLD=88;
let start=null,distance=0,pulling=false,refreshing=false,hideTimer=null;
const atTop=()=>Math.max(window.scrollY||0,document.scrollingElement?.scrollTop||0)<=1;
const blocked=()=>refreshing||document.visibilityState==='hidden'||!!document.querySelector('dialog[open]')||typeof user==='undefined'||!user||passwordSetup||busy||window.MyCarUpdates?.dirty();
const reset=()=>{start=null;distance=0;pulling=false;if(!refreshing){clearTimeout(hideTimer);indicator.hidden=true;delete indicator.dataset.state;}};
function show(state,message){indicator.dataset.state=state;label.textContent=message;indicator.hidden=false;}
function nestedScroller(target){for(let el=target;el&&el!==document.body;el=el.parentElement){if(el.scrollHeight>el.clientHeight+2&&/auto|scroll/.test(getComputedStyle(el).overflowY))return true;}return false;}
document.addEventListener('touchstart',event=>{
 reset();
 if(blocked()||!atTop()||event.touches.length!==1||(window.visualViewport?.scale||1)>1)return;
 if(event.target.closest?.('header,button,a,label,input,textarea,select,dialog,form,[contenteditable="true"]')||nestedScroller(event.target))return;
 const touch=event.touches[0];start={x:touch.clientX,y:touch.clientY};
},{passive:true});
document.addEventListener('touchmove',event=>{
 if(!start)return;
 if(blocked()||!atTop()||event.touches.length!==1){reset();return;}
 const touch=event.touches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;
 if(dy<0||(!pulling&&Math.abs(dx)>Math.max(8,Math.abs(dy)))){reset();return;}
 if(dy<4&&!pulling)return;
 if(!event.cancelable){reset();return;}
 // Prevent native rubber-banding; only the indicator changes, never page/header position.
 event.preventDefault();pulling=true;distance=Math.max(0,dy);
 show(distance>=THRESHOLD?'ready':'pull',distance>=THRESHOLD?'Eliberează pentru actualizare':'Trage în jos pentru actualizare');
},{passive:false});
document.addEventListener('touchend',async event=>{
 const run=!event.touches.length&&pulling&&distance>=THRESHOLD&&!blocked()&&atTop();
 reset();if(!run)return;
 refreshing=true;show('loading','Se actualizează…');
 try{
  const id=user.id;await load();if(user?.id!==id)throw Error('Sesiune schimbată');render();window.MyCarUpdates?.check();
  show('done',user?'Date actualizate':'Actualizarea nu a reușit');
 }catch{show('done','Actualizarea nu a reușit');}
 finally{refreshing=false;hideTimer=setTimeout(reset,1400);}
},{passive:true});
document.addEventListener('touchcancel',reset,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')reset();});
})();

