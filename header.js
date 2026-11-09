// Reserve the logo/menu header height; cars and navigation remain in page flow.
(()=>{
  const bar=document.querySelector('.app>header');
  if(!bar)return;
  function syncHeader(){
    const height=Math.ceil(bar.getBoundingClientRect().height);
    if(height>0)document.documentElement.style.setProperty('--mycar-header-height',height+'px');
  }
  syncHeader();
  window.addEventListener('resize',syncHeader);
  window.addEventListener('pageshow',syncHeader);
  if('ResizeObserver' in window)new ResizeObserver(syncHeader).observe(bar);
  document.fonts?.ready.then(syncHeader);
})();

