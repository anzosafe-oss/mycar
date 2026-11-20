(()=>{
let latest=null,inflight=null,lastCheck=0;
const dirtyForms=new WeakSet();
const dirty=()=>[...document.querySelectorAll('form')].some(f=>dirtyForms.has(f));
const mark=e=>{const form=e.target.closest?.('form');if(form)dirtyForms.add(form)};
document.addEventListener('input',mark,true);document.addEventListener('change',mark,true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-fuel],[data-grade],[data-refuel-fuel]'))mark(e)},true);
function newer(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i]}return false}
function paint(){
 const box=document.querySelector('#mycarUpdate');if(!box)return;
 const button=box.querySelector('button'),message=box.querySelector('[role=status]');
 button.hidden=!latest;message.textContent=latest?'Versiunea '+latest+' este disponibilă.':'Aplicația este la zi.';
 button.onclick=async()=>{
   if(busy||passwordSetup||document.querySelector('dialog[open]'))return;
   if(dirty()&&!confirm('Ai modificări nesalvate. Actualizezi aplicația și renunți la ele?'))return;
   button.disabled=true;message.textContent='Se pregătește actualizarea…';
   try{
     const url=new URL('index.html',location.href);url.searchParams.set('update',Date.now());
     const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();
     const html=await r.text();const version=html.match(/version\.js\?v=(\d+\.\d+\.\d+)/)?.[1];
     if(!version||!newer(version,window.MYCAR_VERSION))throw Error();
     rememberNavigation();location.replace(url.href);
   }catch{message.textContent='Actualizarea nu a reușit. Verifică conexiunea și reîncearcă.';button.disabled=false}
 };
}
async function check(force=false){
 if(document.hidden)return;if(inflight)return inflight;if(!force&&Date.now()-lastCheck<60000)return;
 lastCheck=Date.now();
 inflight=(async()=>{try{
   const url=new URL('version.json',location.href);url.searchParams.set('check',Date.now());
   const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error();
   const data=await r.json();if(!/^\d+\.\d+\.\d+$/.test(data.version))throw Error();
   latest=newer(data.version,window.MYCAR_VERSION)?data.version:null;paint();
 }catch{const message=document.querySelector('#mycarUpdate [role=status]');if(message&&!latest)message.textContent='Nu s-a putut verifica versiunea. Reîncearcă la următoarea deschidere.'}finally{inflight=null}})();
 return inflight;
}
window.MyCarUpdates={dirty,check,bind(){paint();if(document.querySelector('#mycarUpdate'))check(true)}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
window.addEventListener('pageshow',()=>check());check();
})();
