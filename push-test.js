(()=>{
let prepared=null;
const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
const standalone=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
const isiOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
async function call(body){const {data,error}=await sb.functions.invoke('mycar-push-test',{body});if(error){let detail;try{detail=await error.context?.json()}catch{}throw Error(detail?.error||error.message)}if(data?.error)throw Error(data.error);return data}
const decode=key=>{const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
function prepare(){return prepared||(prepared=Promise.all([navigator.serviceWorker.register('sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready),call({action:'config'})]).catch(e=>{prepared=null;throw e}))}
window.bindMyCarPushTest=async()=>{
const enable=document.querySelector('#pushEnable'),test=document.querySelector('#pushTest'),disable=document.querySelector('#pushDisable'),status=document.querySelector('#pushTestStatus');
if(!enable)return;
const say=message=>{if(status.isConnected)status.textContent=message};
if(isiOS()&&!standalone()){say('Pe iPhone, deschide MyCar din iconița de pe ecranul principal.');return}
if(!supported()){say('Acest browser nu permite notificări push.');return}
say('Se pregătește testul…');
let registration,config;
const refresh=async()=>{const subscription=await registration.pushManager.getSubscription();const active=subscription&&Notification.permission==='granted';enable.disabled=!!active;test.disabled=!active;disable.disabled=!subscription;say(active?'Test activ pe acest dispozitiv. Nu se trimit notificări automat.':Notification.permission==='denied'?'Notificările sunt blocate. Permite-le din setările dispozitivului.':'Apasă „Activează testul” pentru a permite notificările.')};
try{[registration,config]=await prepare();await refresh()}catch(e){say(e.message);return}
enable.onclick=async()=>{enable.disabled=true;try{
const permission=await Notification.requestPermission();
if(permission!=='granted')throw Error('Permisiunea pentru notificări nu a fost acordată.');
await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});
await refresh();
}catch(e){enable.disabled=false;say(e.message)}};
test.onclick=async()=>{test.disabled=true;try{const subscription=await registration.pushManager.getSubscription();if(!subscription)throw Error('Activează mai întâi testul.');await call({action:'test',subscription:subscription.toJSON()});say('Test trimis. Verifică notificările telefonului. Poți repeta testul după un minut.')}catch(e){say(e.message)}finally{test.disabled=false}};
disable.onclick=async()=>{disable.disabled=true;try{const sub=await registration.pushManager.getSubscription();if(sub)await sub.unsubscribe();if(navigator.clearAppBadge)await navigator.clearAppBadge();await refresh()}catch(e){disable.disabled=false;say(e.message)}};
};
const clear=()=>{if(document.visibilityState==='visible'&&navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{})};
document.addEventListener('visibilitychange',clear);window.addEventListener('pageshow',clear);
})();
