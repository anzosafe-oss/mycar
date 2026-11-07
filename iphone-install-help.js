(()=>{
const isIPhone=/iPhone|iPod/.test(navigator.userAgent);
const installed=()=>navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
if(!isIPhone||installed())return;
const banner=document.createElement('section');
banner.className='iphone-install-help';banner.setAttribute('aria-label','Instalare pe iPhone');
banner.innerHTML='<div><strong>MyCar pe ecranul telefonului tău</strong><p>Deschide aplicația direct din iconiță.</p></div><button type="button" class="primary" id="iphoneInstallHelp">Cum adaug MyCar pe iPhone</button>';
const header=document.querySelector('.app > header');header.after(banner);
const dialog=document.createElement('dialog');dialog.className='iphone-help-dialog';dialog.setAttribute('aria-labelledby','iphoneHelpTitle');
dialog.innerHTML=`<div class="iphone-help-heading"><img src="apple-touch-icon.png?v=3" width="44" height="44" alt=""><div><h2 id="iphoneHelpTitle">Instalează MyCar</h2><p>Pe ecranul principal al iPhone-ului</p></div></div><ol class="iphone-help-steps"><li><span class="iphone-help-number">1</span><div><h3>Deschide în Safari</h3><p>Dacă ai primit linkul în WhatsApp sau altă aplicație, deschide pagina în Safari.</p></div></li><li><span class="iphone-help-number">2</span><div><h3>Apasă Partajează</h3><p>Caută simbolul cu săgeată în sus. În funcție de versiunea iOS, poate fi și în meniul „…” al browserului.</p><div class="iphone-help-example"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V2m-4 4 4-4 4 4M6 10H4v12h16V10h-2"/></svg><span>Partajează / Share</span></div></div></li><li><span class="iphone-help-number">3</span><div><h3>Adaugă pe ecranul principal</h3><p>Alege „Add to Home Screen”. Dacă apare „Open as Web App”, lasă opțiunea activată, apoi apasă „Adaugă / Add”.</p><div class="iphone-help-example"><span aria-hidden="true">＋</span><span>Add to Home Screen</span></div></div></li></ol><p class="iphone-help-done">Iconița verde MyCar va apărea pe ecran. Deschide-o de acolo și autentifică-te.</p><div class="iphone-help-actions"><button type="button" class="primary" id="iphoneHelpClose" autofocus>Am înțeles</button></div>`;
document.body.append(dialog);
const open=banner.querySelector('button');
open.addEventListener('click',()=>dialog.showModal());
dialog.querySelector('#iphoneHelpClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>open.focus());
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
window.addEventListener('pageshow',()=>{if(installed()){banner.hidden=true;dialog.close()}});
})();
