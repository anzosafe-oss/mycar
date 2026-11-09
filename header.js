// Reserve the fixed header's actual height, including vehicle/navigation rows.
(()=>{
  const bar=document.querySelector('.app-topbar');
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
