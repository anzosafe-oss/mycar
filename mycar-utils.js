(function(){
'use strict';
const identifier=value=>String(value??'').trim().toUpperCase();
function eventIcon(category,title){
  if(category==='Revizie')return 'wrench';
  if(category==='Alimentare')return 'fuel';
  const text=String(title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return category==='Altele'&&/cauciuc|anvelop/.test(text)?'tyre':'document';
}
function computeConsumption(records){
  const results=new Map(),groups=new Map();
  const rows=records.filter(r=>r.category==='Alimentare').slice().sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||((a.odometer_km??Infinity)-(b.odometer_km??Infinity))||String(a.created_at||a.id).localeCompare(String(b.created_at||b.id)));
  for(const row of rows){
    if(!['Benzină','Motorină','GPL','Electrică'].includes(row.fuel_type)){
      for(const key of groups.keys())if(key.startsWith(row.vehicle_id+'|'))groups.delete(key);
      continue;
    }
    const key=row.vehicle_id+'|'+row.fuel_type,km=row.odometer_km==null?NaN:Number(row.odometer_km),quantity=Number(row.quantity),full=row.full_tank===true;
    if(!Number.isFinite(km)||km<0||!Number.isFinite(quantity)||quantity<=0){groups.delete(key);continue}
    let group=groups.get(key);
    if(!group){if(full)groups.set(key,{start:km,last:km,quantity:0});continue}
    if(km<=group.last){groups.delete(key);if(full)groups.set(key,{start:km,last:km,quantity:0});continue}
    group.quantity+=quantity;group.last=km;
    if(full){
      const distance=km-group.start,value=group.quantity*100/distance;
      if(distance>0&&Number.isFinite(value))results.set(row.id,{value,distance,quantity:group.quantity,unit:row.fuel_type==='Electrică'?'kWh/100 km':'l/100 km',electric:row.fuel_type==='Electrică'});
      groups.set(key,{start:km,last:km,quantity:0});
    }
  }
  return results;
}
function lastVisitLabel(value,now=Date.now()){
  if(!value)return 'Ultima vizită: încă neînregistrată';
  const elapsed=now-Date.parse(value);if(!Number.isFinite(elapsed))return 'Ultima vizită: încă neînregistrată';
  const days=Math.max(0,Math.floor(elapsed/86400000));
  return days===0?'Ultima vizită: astăzi':days===1?'Ultima vizită: acum o zi':'Ultima vizită: acum '+days+' zile';
}
const api={identifier,eventIcon,computeConsumption,lastVisitLabel};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.MyCarUtils=api;
})();
