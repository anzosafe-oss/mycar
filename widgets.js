(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MyCarWidgets=api})(globalThis,()=>{
const kinds=['RCA','CASCO','ITP','Rovinietă'];
function normalize(value){
  const result=[];
  for(const item of Array.isArray(value)?value:[]){if(item&&kinds.includes(item.kind)&&!result.some(x=>x.kind===item.kind))result.push({kind:item.kind,enabled:item.enabled!==false})}
  for(const kind of kinds)if(!result.some(x=>x.kind===kind))result.push({kind,enabled:true});
  return result;
}
function move(value,kind,offset){const list=normalize(value),from=list.findIndex(x=>x.kind===kind),to=Math.max(0,Math.min(list.length-1,from+offset));if(from<0)return list;list.splice(to,0,list.splice(from,1)[0]);return list}
function settings(){
  if(!C())return '';
  return `<section class="card widget-settings"><h3>Widgeturi pe Acasă</h3><p class="muted">Pentru <strong class="green">${safe(C().name)}</strong></p><p class="muted widget-help">Trage de mâner pentru a schimba ordinea sau folosește săgețile. Debifează widgeturile pe care vrei să le ascunzi; datele se păstrează.</p><div id="widgetList" role="list" aria-label="Ordinea widgeturilor">${normalize(C().dashboardWidgets).map((item,i)=>{
    const expiry=documents.find(d=>d.vehicle_id===car&&d.kind===item.kind)?.expiry_date;
    return `<div class="widget-row" data-widget-kind="${item.kind}" data-enabled="${item.enabled}" role="listitem"><button type="button" class="widget-grip" aria-label="Trage pentru a muta ${item.kind}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg></button><div class="widget-info"><strong class="widget-title">${item.kind}</strong><button type="button" class="text-link widget-date" data-widget-date="${item.kind}">${expiry?'Expiră: '+safe(date(expiry)):'Setează data'}</button></div><div class="widget-move"><button type="button" data-widget-move="-1" aria-label="Mută ${item.kind} mai sus" ${i===0?'disabled':''}>↑</button><button type="button" data-widget-move="1" aria-label="Mută ${item.kind} mai jos" ${i===3?'disabled':''}>↓</button></div><input type="checkbox" data-widget-toggle aria-label="Afișează ${item.kind}" ${item.enabled?'checked':''}></div>`;
  }).join('')}</div><p id="widgetAnnouncement" class="muted widget-help" role="status" aria-live="polite"></p></section>`;
}
async function persist(vehicleId,layout){
  const uid=user?.id;if(!uid)throw Error('Autentificare necesară.');
  const next=normalize(layout);
  const result=checked(await sb.from('vehicles').update({dashboard_widgets:next}).eq('id',vehicleId).eq('user_id',uid).select('id,dashboard_widgets').single());
  if(user?.id!==uid)return;
  const vehicle=cars.find(x=>x.id===vehicleId);if(vehicle)vehicle.dashboardWidgets=normalize(result.dashboard_widgets);
}
function bind(){
  const list=document.querySelector('#widgetList');if(!list||!C())return;
  const vehicleId=car,read=()=>[...list.querySelectorAll('[data-widget-kind]')].map(row=>({kind:row.dataset.widgetKind,enabled:row.querySelector('[data-widget-toggle]').checked}));
  function save(layout,focusKind){
    if(busy){render();return}
    list.querySelectorAll('button,input').forEach(x=>x.disabled=true);
    action(async()=>{try{await persist(vehicleId,layout)}finally{render()}if(car===vehicleId&&page==='Setări'&&focusKind){document.querySelectorAll('[data-widget-kind]').forEach(row=>{if(row.dataset.widgetKind===focusKind)row.querySelector('.widget-grip').focus({preventScroll:true})})}});
  }
  list.querySelectorAll('[data-widget-toggle]').forEach(input=>input.onchange=()=>save(read()));
  list.querySelectorAll('[data-widget-date]').forEach(button=>button.onclick=()=>{if(!busy)editDocument(button.dataset.widgetDate)});
  list.querySelectorAll('[data-widget-move]').forEach(button=>button.onclick=()=>{const kind=button.closest('[data-widget-kind]').dataset.widgetKind;save(move(read(),kind,Number(button.dataset.widgetMove)),kind)});
  list.querySelectorAll('.widget-grip').forEach(handle=>{
    let drag=null;
    handle.onpointerdown=e=>{
      if(busy||!e.isPrimary||e.button!==0)return;
      const row=handle.closest('[data-widget-kind]');drag={row,id:e.pointerId,y:e.clientY,started:false,before:JSON.stringify(read())};handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove=e=>{
      if(!drag||drag.id!==e.pointerId)return;
      if(!drag.started&&Math.abs(e.clientY-drag.y)<6)return;
      drag.started=true;e.preventDefault();drag.row.classList.add('widget-dragging');
      const others=[...list.children].filter(row=>row!==drag.row);
      const next=others.find(row=>e.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
      list.insertBefore(drag.row,next||null);handle.setPointerCapture(e.pointerId);
    };
    function finish(e,cancel=false){
      if(!drag||drag.id!==e.pointerId)return;
      const current=drag;drag=null;current.row.classList.remove('widget-dragging');
      if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
      if(cancel){render();return}
      const layout=read();if(current.before!==JSON.stringify(layout))save(layout,current.row.dataset.widgetKind);
    }
    handle.onpointerup=e=>finish(e);handle.onpointercancel=e=>finish(e,true);
    handle.onkeydown=e=>{if(e.key==='Escape'&&drag){e.preventDefault();drag.row.classList.remove('widget-dragging');drag=null;render()}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const kind=handle.closest('[data-widget-kind]').dataset.widgetKind;save(move(read(),kind,e.key==='ArrowUp'?-1:1),kind)}};
  });
}
return {normalize,move,settings,bind,persist};
});
