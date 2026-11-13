(()=>{
const host=document.querySelector('#headerMenu');
function close(restoreFocus=false){
  const menu=host.querySelector('#accountMenu'),trigger=host.querySelector('#menuTrigger');
  if(!menu)return;menu.hidden=true;trigger.setAttribute('aria-expanded','false');
  if(restoreFocus)trigger.focus();
}
window.renderMyCarMenu=()=>{
  const focused=host.contains(document.activeElement),wasOpen=host.querySelector('#menuTrigger')?.getAttribute('aria-expanded')==='true';
  host.hidden=!user||passwordSetup;
  if(host.hidden){host.innerHTML='';return}
  host.innerHTML=`<button class="menu-trigger" type="button" id="menuTrigger" aria-expanded="false" aria-controls="accountMenu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Meniu</span></button><div class="account-dropdown" id="accountMenu" hidden><p class="menu-caption">MYCAR</p><button type="button" data-menu-page="Setări">${icon('settings')}Setări</button><button type="button" data-menu-page="Despre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></svg>Despre</button><div class="menu-divider"></div><button type="button" id="menuLogout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4"/></svg>Deconectare</button></div>`;
  const trigger=host.querySelector('#menuTrigger'),menu=host.querySelector('#accountMenu');
  function open(){menu.hidden=false;trigger.setAttribute('aria-expanded','true')}
  trigger.onclick=()=>menu.hidden?open():close();
  trigger.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();open();menu.querySelector('button').focus()}};
  host.querySelectorAll('[data-menu-page]').forEach(button=>{
    if(page===button.dataset.menuPage)button.setAttribute('aria-current','page');
    button.onclick=()=>{
      const next=button.dataset.menuPage;
      close();page=next;render();
      const title=document.querySelector('#content h2');
      if(title){title.tabIndex=-1;title.focus({preventScroll:true})}
      window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    };
  });
  host.querySelector('#menuLogout').onclick=()=>{close();signOutMyCar()};
  if(wasOpen)open();if(focused)trigger.focus({preventScroll:true});
};
document.addEventListener('pointerdown',e=>{if(!host.contains(e.target))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.querySelector('#menuTrigger')?.getAttribute('aria-expanded')==='true'){e.preventDefault();close(true)}});
window.renderMyCarMenu();
})();
