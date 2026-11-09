const authLink=new URL(location.href),authFragment=new URLSearchParams(location.hash.slice(1));
let passwordSetup=['invite','recovery'].includes(authLink.searchParams.get('type')||authFragment.get('type'));
if(passwordSetup)sessionStorage.setItem('mycar-password-setup','1');
passwordSetup=passwordSetup||sessionStorage.getItem('mycar-password-setup')==='1';
let cars=[],car=null,page='Acasă',filter='Toate',events=[],documents=[],eventRecords=[];
let editingEventId=null,eventDraft=null;
const identifier=value=>MyCarUtils.identifier(value);const names=["Acasă","Mașini","Adaugă","Istoric","Setări"],C=()=>cars.find(x=>x.id===car),E=()=>events.filter(x=>x[0]===car).sort((a,b)=>b[1].localeCompare(a[1])),money=n=>Number(n).toLocaleString("ro-RO")+" lei",date=s=>s.split("-").reverse().join("."),card=s=>`<div class="card">${s}</div>`,safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paths={car:'<path d="m5 7 2-4h10l2 4M3 10l2-3h14l2 3v8H3zM6 18v3m12-3v3M7 13h.01M17 13h.01"/>',home:'<path d="m3 10 9-8 9 8v11h-7v-8h-4v8H3z"/>',plus:'<path d="M12 4v16M4 12h16"/>',history:'<path d="M3 3v5h5M3 8a9 9 0 1 1-1 7M12 7v6l4 2"/>',settings:'<path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 3 1 4-3v-4l2-3-2-4-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/>',wrench:'<path d="M14 4a6 6 0 0 0-7 8L2 18a3 3 0 0 0 4 4l7-7a6 6 0 0 0 7-8l-4 4-3-3 4-4z"/>',document:'<path d="M6 2h9l5 5v15H6zM10 10h6m-6 5h6"/>',fuel:'<path d="M3 21V3h10v18M1 21h14M3 9h10m3-5 5 5v10c0 3-5 3-5 0v-6h-3"/>',db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>'};
paths.tyre='<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m7 4 2 2m6-2-2 2m7 1-2 2m2 6-2-2m-1 7-2-2m-6 2 2-2m-7-1 2-2m-2-6 2 2"/>';
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n]||paths.document}</svg>`;
const plate=id=>safe(identifier(cars.find(x=>x.id===id)?.plate)||'—');
const intro=(title,desc,extra='')=>`<div class="intro"><div><h2>${title}</h2><p class="muted">${desc}</p></div>${extra}</div>`;

function expiryState(expiry,threshold=Number(days),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
if(!expiry)return {state:'unset',label:'Nesetat'};
const remaining=Math.round((Date.parse(expiry+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
if(!Number.isFinite(remaining))return {state:'unset',label:'Nesetat'};
if(remaining<0)return {state:'expired',label:'Expirat de '+Math.abs(remaining)+(remaining===-1?' zi':' zile'),prefix:'Expirat de',count:Math.abs(remaining)+(remaining===-1?' zi':' zile')};
if(remaining<=threshold)return {state:'expiring',label:remaining===0?'Expiră astăzi':'Expiră în '+remaining+(remaining===1?' zi':' zile'),prefix:remaining>0?'Expiră în':null,count:remaining+(remaining===1?' zi':' zile')};
return {state:'valid',label:'Valabil'};
}
let selectedDocumentKey=null;
function documentCard(kind){
const expiry=documents.find(d=>d.vehicle_id===car&&d.kind===kind)?.expiry_date,status=expiryState(expiry),selected=selectedDocumentKey===car+':'+kind;
return `<article class="outline card document-card document-${status.state}${selected?' document-selected':''}" data-select-document="${kind}"><button type="button" class="document-select" aria-pressed="${selected}" aria-label="Selectează ${kind}: ${status.label}"><div class="row"><strong>${kind}</strong>${icon('shield')}</div><p class="muted">${status.state==='expired'?'A expirat la':'Expiră la'}</p><strong>${expiry?date(expiry):'Nesetat'}</strong></button><div class="document-status-row"><span class="document-status">${status.prefix?`<span>${status.prefix}</span><span>${status.count}</span>`:status.label}</span><button type="button" class="document-edit" data-document="${kind}" aria-label="Modifică scadența ${kind}" ${selected?'':'disabled aria-hidden="true" tabindex="-1"'}>Modifică</button></div></article>`;
}

function home(){if(!C())return intro('Garajul tău este gol','Adaugă prima mașină pentru a începe.',`<button class="primary" data-go="Mașini">Adaugă o mașină</button>`);let e=E(),rev=e.find(x=>x[2]==='Revizie');return `<section class="hero card"><div class="row"><div><h3>${safe(C().name)}</h3><p class="muted">${safe(C().spec)}</p></div><span class="green bigicon">${icon('car')}</span></div><div class="km">${C().km} km</div><div class="row"><span class="muted">Kilometraj înregistrat</span><span class="badge">${plate(car)}</span></div>${C().vin?`<div class="hero-vin"><span class="muted">VIN</span><code>${safe(identifier(C().vin))}</code></div>`:''}</section><div class="documents">${['RCA','CASCO','ITP','Rovinietă'].map(documentCard).join('')}</div><div class="stats"><div class="card"><h4><span class="green">${icon('wrench')}</span> Ultima revizie</h4><h3>${rev?date(rev[1]):'—'}</h3><small>${rev?safe(rev[6])+' km':'Nicio revizie'}</small></div><div class="card"><h4><span class="green">${icon('document')}</span> Cheltuieli</h4><h3>${money(e.reduce((s,x)=>s+x[5],0))}</h3><small>${e.length} evenimente înregistrate</small></div></div>`}

function vehicleDetails(v){
const raw=String(v.specification||v.trim||'').replace(/\s*\(demo\)/gi,'');
const year=v.production_year||raw.match(/\b(?:19|20)\d{2}\b\s*$/)?.[0]?.trim();
const engine=raw.replace(/\b(?:DSG\s*\d*|(?:cutie\s+)?(?:manual[aă]|automat[aă]))\b/gi,'').replace(/\b\d\s*(?:tr(?:epte)?|trepte)\b/gi,'').replace(/\b(?:19|20)\d{2}\b\s*$/,'').split(/[·|]/).map(x=>x.trim()).filter(Boolean).join(' · ').trim();
return {engine,year};
}
function vehicleDescription(v){const {engine,year}=vehicleDetails(v);return [engine,year].filter(Boolean).join(' · ')}
function parseVehicleYear(value){const raw=String(value||'').trim();if(!raw)return null;if(!/^\d{4}$/.test(raw)||Number(raw)<1900||Number(raw)>2100)throw Error('Introdu un an de fabricație valid (4 cifre).');return Number(raw)}

function vehicles(){return intro('Garajul meu','Selectează mașina pe care vrei să o administrezi.',`<span class="badge">${cars.length} ${cars.length===1?'mașină':'mașini'}</span>`)+`<div class="vehicles">${cars.map(x=>`<article class="card vehicle ${car===x.id?'selected':''}" data-vehicle-card="${x.id}"><div class="vehicle-card-top"><button type="button" class="vehicle-icon-select vehicle-icon ${car===x.id?'green':'muted'}" data-car="${x.id}" aria-pressed="${car===x.id}" aria-label="Selectează ${safe(x.name)}">${icon('car')}</button><button type="button" class="danger-button vehicle-delete-top" data-delete-car="${x.id}" ${car===x.id?'':'disabled aria-hidden="true" tabindex="-1"'}>Șterge mașina</button></div><button type="button" class="vehicle-select" data-car="${x.id}" aria-pressed="${car===x.id}"><h3>${safe(x.name)}</h3><p class="muted">${safe(x.spec)}</p><h3>${x.km} km</h3><p class="vehicle-plate">${plate(x.id)}</p>${x.vin?`<div class="vehicle-vin"><small>VIN</small><code>${safe(identifier(x.vin))}</code></div>`:''}</button><p class="muted">${safe(fuelLabel(x.fuels)||'Combustibil nesetat')}</p>${x.fuels.length?'':`<div class="vehicle-actions"><button type="button" class="secondary-button" data-edit-fuel="${x.id}">Combustibil</button></div>`}<div class="vehicle-edit-action"><button type="button" class="secondary-button vehicle-edit-button" data-edit-car="${x.id}" ${car===x.id?'':'disabled aria-hidden="true" tabindex="-1"'}>Modifică</button></div></article>`).join('')}</div><section class="add-car" id="vehicleFormSection"><h3 tabindex="-1">${icon(editingCarId?'car':'plus')} ${editingCarId?'Modifică mașina':'Adaugă o mașină'}</h3>${editingCarId?`<p class="muted">Modifici ${safe(cars.find(x=>x.id===editingCarId)?.name||'mașina selectată')}.</p>`:''}<form id="carForm"><div class="form-grid"><div class="field"><label for="carMake">Marcă</label><input id="carMake" name="make" required placeholder="Ex. Škoda"></div><div class="field"><label for="carModel">Model</label><input id="carModel" name="model" required placeholder="Ex. Octavia"></div></div><div class="field"><label for="carPlate">Număr de înmatriculare</label><input id="carPlate" name="plate" autocapitalize="characters" spellcheck="false" placeholder="Ex. GL 01 ABC"></div><div class="field"><label for="carVin">VIN (opțional)</label><input id="carVin" name="vin" type="text" placeholder="Seria de șasiu" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${fuelPicker(carDraft.fuels||[])}<div class="form-grid"><div class="field"><label for="carSpec">Motorizare</label><input id="carSpec" name="spec" placeholder="Ex. 1.0 TSI"></div><div class="field"><label for="carYear">An fabricație</label><input id="carYear" name="year" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Ex. 2020"></div></div><div class="field"><label for="carKm">Kilometraj</label><input id="carKm" name="km" type="text" inputmode="numeric" placeholder="Ex. 43.200"></div><p id="carError" role="alert" class="form-error" hidden></p><div class="form-actions ${editingCarId?'vehicle-edit-form-actions':''}">${editingCarId?'<button type="button" class="secondary-button" id="cancelVehicleEdit">Anulează</button>':''}<button type="submit" class="primary">${editingCarId?'Salvează modificările':icon('plus')+' Adaugă mașina'}</button></div></form></section>`}
function eventContext(){return editingEventId?cars.find(v=>v.id===eventDraft?.vehicleId):C()}
function add(){
const vehicle=eventContext();if(!vehicle)return home();
const d=eventDraft||{},category=d.category||'Revizie',categories=['Revizie','Alimentare','Altele'];
if(!categories.includes(category))categories.push(category);
return `<h2 class="event-heading">${editingEventId?'Modifică eveniment':'Adaugă eveniment'}</h2><section class="event-vehicle" aria-label="Mașina pentru acest eveniment"><span class="event-vehicle-icon">${icon('car')}</span><div class="event-vehicle-info"><p class="event-vehicle-label">${editingEventId?'Modifici pentru':'Adaugi pentru'}</p><h3>${safe(vehicle.name)}</h3><p class="event-vehicle-meta">${safe(identifier(vehicle.plate))}</p></div></section><form id="eventForm"><fieldset><legend>Tip eveniment</legend><div class="event-type-options">${categories.map(x=>`<label class="event-type-option"><input type="radio" name="type" value="${safe(x)}" ${x===category?'checked':''}><span>${safe(x)}</span></label>`).join('')}</div></fieldset><div class="field" id="eventTitleField"><label for="name">Denumire eveniment</label><input id="name" required name="name" value="${safe(d.title||'')}" placeholder="Ex. Schimb ulei și filtre"></div><div id="refuelFields" hidden></div><div class="form-grid"><div class="field"><label for="date">Data</label><input id="date" type="date" required name="date" value="${safe(d.date||new Date().toLocaleDateString('en-CA'))}"></div><div class="field"><label for="km">Kilometraj</label><input id="km" name="km" type="text" inputmode="numeric" value="${safe(d.km??'')}" placeholder="Ex. 81.000"></div></div><div class="field"><label for="cost">Cost (RON)</label><input id="cost" name="cost" type="number" min="0" step="0.01" value="${safe(d.amount??'')}" placeholder="0"></div><div class="field"><label for="details" id="detailsLabel">Descriere / piese înlocuite</label><textarea id="details" name="details" placeholder="Detalii despre eveniment">${safe(d.description||'')}</textarea></div><div class="event-form-actions">${editingEventId?'<button type="button" class="secondary-button" id="cancelEventEdit">Anulează</button>':''}<button type="submit" class="primary">${editingEventId?'Salvează modificările':icon('plus')+' Adaugă eveniment'}</button></div></form>`;
}
function eventHistory(){
if(!C())return home();
const es=E().filter(x=>filter==='Toate'||x[2]===filter),consumption=MyCarUtils.computeConsumption(eventRecords);
return `<h2 class="history-heading">Evenimente <span>${safe(C().name)}</span></h2><div class="filters">${['Toate','Revizie','Alimentare','Altele'].map(x=>`<button data-filter="${x}" class="${filter===x?'active':''}">${x}</button>`).join('')}</div><div class="timeline">${es.map(x=>{
const result=consumption.get(x[7]);
return `<article class="card event"><div class="row"><h3>${icon(MyCarUtils.eventIcon(x[2],x[3]))}${safe(x[3])}</h3><span class="badge">${safe(x[2])}</span></div><p class="muted">${date(x[1])}${x[6]?' · '+safe(x[6])+' km':''}</p>${x[4]?`<p class="muted">${safe(x[4])}</p>`:''}${x[10]!=null?`<p class="muted">${Number(x[10]).toLocaleString('ro-RO')} ${x[8]==='Electrică'?'kWh':'litri'}${x[11]===true?' · '+(x[8]==='Electrică'?'Încărcare completă':'Plin complet'):x[11]===false?' · '+(x[8]==='Electrică'?'Încărcare parțială':'Alimentare parțială'):''}</p>`:''}${result?`<div class="consumption"><strong>${result.value.toLocaleString('ro-RO',{maximumFractionDigits:2})} ${result.unit}</strong><span>${result.distance.toLocaleString('ro-RO')} km între ${result.electric?'încărcări complete':'plinuri'}</span>${result.electric?'<small>Estimare din energia încărcată.</small>':''}</div>`:''}<div class="event-actions"><strong class="cost">${money(x[5])}</strong><div class="event-action-buttons"><button type="button" class="secondary-button" data-edit-event="${x[7]}">Modifică</button><button type="button" class="danger-button" data-delete-event="${x[7]}">Șterge</button></div></div></article>`;
}).join('')||'<p class="muted">Nu există evenimente în această categorie.</p>'}</div>`;
}
let notices=false,days='30',theme='dark';
function settings(){return intro('Setări','Preferințele aplicației MyCar.')+`<section class="card settings"><h3>Aspect</h3><p class="muted">Temă</p><div class="theme" role="group" aria-label="Temă">${[['dark','Întunecată'],['light','Luminoasă']].map(([v,label])=>`<button type="button" data-theme="${v}" aria-pressed="${theme===v}" class="${theme===v?'active':''}">${label}</button>`).join('')}</div><label class="row notification"><span><strong>Notificări pentru scadențe</strong><small>Avertizări la pragul ales, apoi cu o zi înainte și în ziua expirării. Activează și dispozitivul de mai jos.</small></span><input type="checkbox" id="notices" ${notices?'checked':''}></label><div class="fuel-options push-options"><button type="button" id="pushEnable" disabled>Activează dispozitivul</button><button type="button" id="pushDisable" disabled>Dezactivează</button></div><p id="pushStatus" class="muted" role="status" aria-live="polite"></p><div class="field"><label id="days-label">Prima avertizare înainte de expirare</label><div id="days" class="day-options" role="group" aria-labelledby="days-label">${['7','15','30','60'].map(d=>`<button type="button" data-days="${d}" aria-pressed="${days===d}" class="${days===d?'active':''}">${d} zile</button>`).join('')}</div></div></section>`}


const fuelNames=['Benzină','Motorină','Electrică','GPL'],fuelGrades={'Benzină':['95','98','99','100'],'Motorină':['Standard','Premium'],'Electrică':[],'GPL':[]};
const fuelLabel=fuels=>(fuels.includes('Electrică')&&(fuels.includes('Benzină')||fuels.includes('Motorină'))?'Hibrid · ':'')+fuels.join(' + ');
function validFuels(fuels){return fuels.length>=1&&fuels.length<=2&&new Set(fuels).size===fuels.length&&fuels.every(x=>fuelNames.includes(x))&&!(fuels.includes('Benzină')&&fuels.includes('Motorină'))}
function fuelPicker(fuels){return '<fieldset class="fuel-picker"><legend>Combustibil</legend><div class="fuel-options" role="group" aria-label="Combustibil">'+fuelNames.map(name=>'<button type="button" data-fuel="'+name+'" aria-pressed="'+fuels.includes(name)+'">'+name+'</button>').join('')+'</div><p class="muted fuel-summary" aria-live="polite"></p></fieldset>'}
function bindFuelPicker(container,fuels,onChange){const update=()=>{container.querySelectorAll('[data-fuel]').forEach(b=>{const name=b.dataset.fuel,active=fuels.includes(name);b.setAttribute('aria-pressed',active);b.disabled=!active&&(fuels.length>=2||(name==='Benzină'&&fuels.includes('Motorină'))||(name==='Motorină'&&fuels.includes('Benzină')))});container.querySelector('.fuel-summary').textContent=fuels.length?fuelLabel(fuels):'Selectează una sau două variante.'};container.querySelectorAll('[data-fuel]').forEach(b=>b.onclick=()=>{const i=fuels.indexOf(b.dataset.fuel);if(i>=0)fuels.splice(i,1);else if(!b.disabled)fuels.push(b.dataset.fuel);onChange?.(fuels);update()});update()}
function editFuel(id){const vehicle=cars.find(x=>x.id===id);if(!vehicle)return;const fuels=[...vehicle.fuels],dialog=document.querySelector('#documentDialog');dialog.removeAttribute('aria-describedby');dialog.setAttribute('aria-label','Combustibilul mașinii');dialog.innerHTML='<form id="fuelForm"><h3>'+safe(vehicle.name)+'</h3>'+fuelPicker(fuels)+'<div class="form-actions"><button type="button" id="cancelFuel">Anulează</button><button type="submit" class="primary">Salvează</button></div></form>';dialog.showModal();const form=document.querySelector('#fuelForm');bindFuelPicker(form,fuels);document.querySelector('#cancelFuel').onclick=()=>dialog.close();form.onsubmit=e=>{e.preventDefault();action(async()=>{if(!validFuels(fuels))throw Error('Selectează una sau două variante compatibile.');const updated=checked(await sb.from('vehicles').update({fuel_types:fuels}).eq('id',id).eq('user_id',user.id).select('id'));if(!updated.length)throw Error('Mașina nu poate fi actualizată.');dialog.close();await load();render()},form.querySelector('[type=submit]'))}}
function refuelFields(fuels,draft){return (fuels.length>1?'<div class="field"><label>Ce alimentezi?</label><div class="fuel-options" role="group" aria-label="Combustibil alimentat">'+fuels.map(x=>'<button type="button" data-refuel-fuel="'+x+'" aria-pressed="'+(x===draft.fuel_type)+'">'+x+'</button>').join('')+'</div></div>':'')+'<div id="fuelGrades"></div><div class="field"><label id="quantityLabel" for="quantity">Cantitate (litri)</label><input id="quantity" name="quantity" type="number" min="0.01" step="0.01" value="'+safe(draft.quantity??'')+'" required></div><label class="full-tank-option"><input type="checkbox" name="full_tank" id="fullTank" '+(draft.full_tank===true?'checked':'')+'><span id="fullTankLabel">Plin complet</span></label><p class="muted refuel-hint">Bifează doar la un plin complet și completează kilometrajul. Consumul se calculează între două plinuri; alimentările parțiale dintre ele se însumează.</p>'}
function editEvent(id){
if(busy)return;const e=eventRecords.find(x=>x.id===id);if(!e)return;
editingEventId=id;car=e.vehicle_id;eventDraft={vehicleId:e.vehicle_id,category:e.category,title:e.title,date:e.event_date,km:e.odometer_km??'',amount:e.amount,description:e.description||'',fuel_type:e.fuel_type||'',fuel_grade:e.fuel_grade||'',quantity:e.quantity??'',full_tank:e.full_tank};
page='Adaugă';render();document.querySelector('.event-heading').scrollIntoView({block:'start'});
}
async function saveEventDetails(payload,id=null){
const table=sb.from('events'),query=id?table.update(payload).eq('id',id).eq('user_id',user.id).eq('vehicle_id',payload.vehicle_id):table.insert(payload);
return checked(await query.select('id').single());
}
function bindEventForm(form){
const vehicle=eventContext(),vehicleId=vehicle.id,eventId=editingEventId;
eventDraft=eventDraft||{vehicleId,category:'Revizie'};
const original=eventId?eventRecords.find(x=>x.id===eventId):null;
const fuels=[...vehicle.fuels];if(original?.fuel_type&&!fuels.includes(original.fuel_type))fuels.push(original.fuel_type);
let selectedFuel=fuels.includes(eventDraft.fuel_type)?eventDraft.fuel_type:(fuels[0]||''),selectedGrade=eventDraft.fuel_grade||'';
const remember=()=>{
const d=new FormData(form),quantity=form.querySelector('#quantity'),full=form.querySelector('#fullTank');
Object.assign(eventDraft,{vehicleId,category:d.get('type'),title:d.get('name'),date:d.get('date'),km:d.get('km'),amount:d.get('cost'),description:d.get('details'),fuel_type:selectedFuel,fuel_grade:selectedGrade});
if(quantity)eventDraft.quantity=quantity.value;if(full)eventDraft.full_tank=full.checked;
};
const updateGrades=()=>{
const grades=[...(fuelGrades[selectedFuel]||[])];if(original?.fuel_type===selectedFuel&&original.fuel_grade&&!grades.includes(original.fuel_grade))grades.push(original.fuel_grade);
if(!grades.includes(selectedGrade))selectedGrade=grades[0]||'';
form.querySelector('#fuelGrades').innerHTML=grades.length?'<div class="field"><label>Tip '+(selectedFuel==='Benzină'?'benzină':'motorină')+'</label><div class="fuel-options" role="group" aria-label="Tip carburant">'+grades.map(x=>'<button type="button" data-grade="'+safe(x)+'" aria-pressed="'+(x===selectedGrade)+'">'+safe(x)+'</button>').join('')+'</div></div>':'<p class="muted">'+(selectedFuel==='Electrică'?'Încărcare electrică':'GPL')+'</p>';
const electric=selectedFuel==='Electrică';form.querySelector('#quantityLabel').textContent=electric?'Energie încărcată (kWh)':'Cantitate (litri)';form.querySelector('#fullTankLabel').textContent=electric?'Încărcare completă (100%)':'Plin complet';
form.querySelector('.refuel-hint').textContent=electric?'Bifează doar la încărcare la 100% și completează kilometrajul. Estimarea în kWh/100 km folosește energia încărcată între două încărcări complete.':'Bifează doar la un plin complet și completează kilometrajul. Consumul se calculează între două plinuri; alimentările parțiale dintre ele se însumează.';
form.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{selectedGrade=b.dataset.grade;form.querySelectorAll('[data-grade]').forEach(x=>x.setAttribute('aria-pressed',x===b));remember()});
};
const changeType=()=>{
const category=form.querySelector('[name=type]:checked').value,isFuel=category==='Alimentare',missing=isFuel&&!fuels.length,section=form.querySelector('#refuelFields');
section.hidden=!isFuel;section.innerHTML=isFuel?(missing?'<p class="muted">Setează combustibilul mașinii înainte de alimentare.</p><button type="button" class="secondary-button" id="setVehicleFuel">Setează combustibilul</button>':refuelFields(fuels,{...eventDraft,fuel_type:selectedFuel})):'';
form.querySelector('#eventTitleField').hidden=isFuel;form.querySelector('#name').required=!isFuel;
form.querySelector('#detailsLabel').textContent=category==='Revizie'?'Descriere / piese înlocuite':'Observații';form.querySelector('[type=submit]').disabled=missing;
if(missing)form.querySelector('#setVehicleFuel').onclick=()=>editFuel(vehicleId);
else if(isFuel){updateGrades();form.querySelectorAll('[data-refuel-fuel]').forEach(b=>b.onclick=()=>{remember();selectedFuel=b.dataset.refuelFuel;selectedGrade='';form.querySelectorAll('[data-refuel-fuel]').forEach(x=>x.setAttribute('aria-pressed',x===b));updateGrades();remember()})}
};
form.oninput=remember;form.querySelectorAll('[name=type]').forEach(i=>i.onchange=()=>{remember();changeType()});changeType();
const cancel=form.querySelector('#cancelEventEdit');if(cancel)cancel.onclick=()=>{if(busy)return;editingEventId=null;eventDraft=null;page='Istoric';render()};
form.onsubmit=e=>{e.preventDefault();remember();const d=new FormData(form);action(async()=>{
const category=d.get('type'),isFuel=category==='Alimentare';
if(!['Revizie','Alimentare','Altele',original?.category].filter(Boolean).includes(category))throw Error('Selectează tipul evenimentului.');
if(isFuel&&!fuels.includes(selectedFuel))throw Error('Selectează combustibilul mașinii.');
const quantity=isFuel?Number(d.get('quantity')):null;if(isFuel&&(!Number.isFinite(quantity)||quantity<=0))throw Error('Cantitatea trebuie să fie mai mare decât zero.');
const full=isFuel?!!form.querySelector('#fullTank')?.checked:null,km=String(d.get('km')||'').trim();
if(full&&!km)throw Error('Completează kilometrajul pentru un plin sau o încărcare completă.');
const unchangedFuel=original?.category==='Alimentare'&&original.fuel_type===selectedFuel&&(original.fuel_grade||'')===selectedGrade;
const title=isFuel?(unchangedFuel?original.title:(selectedFuel==='Electrică'?'Încărcare electrică':'Alimentare · '+selectedFuel+(selectedGrade?' '+selectedGrade:''))):String(d.get('name')||'').trim();
if(!title)throw Error('Completează denumirea evenimentului.');
const amount=Number(d.get('cost')||0);if(!Number.isFinite(amount)||amount<0)throw Error('Introdu un cost valid.');
await saveEventDetails({vehicle_id:vehicleId,category,title,event_date:d.get('date'),odometer_km:km?parseKm(km):null,amount,description:String(d.get('details')||''),fuel_type:isFuel?selectedFuel:null,fuel_grade:isFuel?(selectedGrade||null):null,quantity,full_tank:full},eventId);
editingEventId=null;eventDraft=null;await load();car=vehicleId;page='Istoric';filter='Toate';render();
},form.querySelector('[type=submit]'))};
}

const sb=window.supabase.createClient('https://radskybbymadavveatzn.supabase.co','sb_publishable_VJh0qSiBA0OIcG7YqnLyjA_-YwiTlMT',{db:{schema:'mycar'},auth:{storageKey:'mycar-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null,carDraft={},busy=false;
let editingCarId=null,newCarDraft=null;
let statusTimer=null,statusDismissible=false;
const report=(message,{dismissible=false}={})=>{clearTimeout(statusTimer);statusTimer=null;statusDismissible=dismissible;const node=document.querySelector('#status');node.textContent=message;node.hidden=!message;if(message&&dismissible)statusTimer=setTimeout(()=>report(''),5000)};
document.addEventListener('click',()=>{if(statusDismissible)report('')},{capture:true});
async function action(fn,button){if(busy)return;busy=true;if(button)button.disabled=true;report('Se salvează…');try{await fn();report('Salvat.',{dismissible:true})}catch(err){report('Nu s-a salvat: '+(err.message||'Eroare de conexiune.'));}finally{busy=false;if(button)button.disabled=false}}
function checked(result){if(result.error)throw result.error;return result.data}

let navigationUser=null;
function restoreNavigation(){
if(!user||navigationUser===user.id)return;
navigationUser=user.id;page='Acasă';car=null;
try{const saved=JSON.parse(sessionStorage.getItem('mycar-navigation:'+user.id)||'null');if(saved){if([...names,'Despre','Cereri de acces'].includes(saved.page))page=saved.page;if(typeof saved.car==='string')car=saved.car}}catch{}
}
function rememberNavigation(){
if(!user)return;
try{sessionStorage.setItem('mycar-navigation:'+user.id,JSON.stringify({page,car}))}catch{}
}

async function load(){restoreNavigation();const viewUrl=new URL(location.href);if(viewUrl.searchParams.get('view')==='invitations'){page='Cereri de acces';viewUrl.searchParams.delete('view');window.history.replaceState(null,'',viewUrl.pathname+viewUrl.search+viewUrl.hash)}const results=await Promise.all([sb.from('vehicles').select('*').order('created_at'),sb.from('events').select('*').order('event_date',{ascending:false}),sb.from('documents').select('*'),sb.from('preferences').select('*').maybeSingle()]);const [vs,es,ds,pref]=results.map(checked);cars=vs.map(v=>({id:v.id,fuels:v.fuel_types||[],name:v.display_name||[v.make,v.model].join(' '),spec:vehicleDescription(v),plate:identifier(v.registration_number),vin:identifier(v.vin),make:v.make,model:v.model,engine:vehicleDetails(v).engine,year:vehicleDetails(v).year||'',km:Math.max(Number(v.odometer_km||0),...es.filter(e=>e.vehicle_id===v.id).map(e=>Number(e.odometer_km||0))).toLocaleString('ro-RO')}));eventRecords=es;events=es.map(e=>[e.vehicle_id,e.event_date,e.category,e.title,e.description||'',Number(e.amount),e.odometer_km===null?'':Number(e.odometer_km).toLocaleString('ro-RO'),e.id,e.fuel_type,e.fuel_grade,e.quantity,e.full_tank]);documents=ds;if(editingCarId&&!cars.some(x=>x.id===editingCarId)){editingCarId=null;carDraft=newCarDraft||{};newCarDraft=null}if(!cars.some(c=>c.id===car))car=cars[0]?.id||null;if(pref){theme=pref.theme;days=String(pref.reminder_days);notices=pref.notifications_enabled}if(window.mycarNotificationsChanged)window.mycarNotificationsChanged();window.recordMyCarVisit?.()}
const parseKm=value=>{const raw=String(value||'').replace(/[. ,\s]/g,'');if(raw&&!/^\d+$/.test(raw))throw Error('Kilometrajul trebuie să conțină cifre.');const n=Number(raw||0);if(!Number.isSafeInteger(n)||n>2147483647)throw Error('Kilometraj invalid.');return n};
function login(){editingCarId=null;newCarDraft=null;editingEventId=null;eventDraft=null;document.querySelector('#nav').innerHTML='';document.querySelector('#car').innerHTML='';document.querySelector('.context').hidden=true;document.querySelector('#account').innerHTML='';window.renderMyCarMenu?.();document.querySelector('#content').innerHTML=`<section class="card login"><h2>Intră în MyCar</h2><p class="muted">Folosește emailul și parola contului tău.<br>Pentru acces la testare, <button type="button" class="text-link" id="requestInvitation">solicită o invitație</button>.</p><form id="loginForm"><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="password">Parolă</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="primary" type="submit">Autentificare</button></form></section>`;document.querySelector('#loginForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.currentTarget);action(async()=>{const data=checked(await sb.auth.signInWithPassword({email:d.get('email'),password:d.get('password')}));user=data.user;await load();render()},e.currentTarget.querySelector('button'))};window.bindMyCarInvitations?.()}

function setupPassword(){
document.querySelector('#nav').innerHTML='';document.querySelector('#car').innerHTML='';document.querySelector('.context').hidden=true;document.querySelector('#account').innerHTML='';window.renderMyCarMenu?.();
document.querySelector('#content').innerHTML=`<section class="card login"><h2>Alege parola pentru MyCar</h2><p class="muted">Cont: ${safe(user.email)}. Alege o parolă de minimum 12 caractere.</p><form id="passwordForm"><div class="field"><label for="newPassword">Parolă nouă</label><input id="newPassword" name="password" type="password" minlength="12" autocomplete="new-password" required></div><div class="field"><label for="confirmPassword">Confirmă parola</label><input id="confirmPassword" name="confirm" type="password" minlength="12" autocomplete="new-password" required></div><div class="form-actions"><button type="submit" class="primary">Salvează parola și intră</button><button type="button" id="cancelSetup">Anulează</button></div></form></section>`;
document.querySelector('#cancelSetup').onclick=()=>action(async()=>{checked(await sb.auth.signOut({scope:'local'}));passwordSetup=false;sessionStorage.removeItem('mycar-password-setup');user=null;login()});
const form=document.querySelector('#passwordForm');form.onsubmit=e=>{e.preventDefault();const d=new FormData(form);action(async()=>{const password=d.get('password');if(password!==d.get('confirm'))throw Error('Parolele nu coincid.');if(password.length<12)throw Error('Alege minimum 12 caractere.');checked(await sb.auth.updateUser({password}));passwordSetup=false;sessionStorage.removeItem('mycar-password-setup');await load();page='Acasă';render()},form.querySelector('[type=submit]'))};
}
async function savePreferences(next){checked(await sb.from('preferences').upsert({user_id:user.id,theme:next.theme??theme,notifications_enabled:next.notices??notices,reminder_days:Number(next.days??days)}));theme=next.theme??theme;notices=next.notices??notices;days=next.days??days;render();if(window.mycarNotificationsChanged)window.mycarNotificationsChanged()}
function selectVehicle(id){if(busy)return;if(car!==id){editingEventId=null;eventDraft=null}car=id;render()}
function ensureSelectedCarVisible(){const strip=document.querySelector('#car'),active=strip.querySelector('.active');if(!active||strip.closest('[hidden]'))return;const bounds=strip.getBoundingClientRect(),item=active.getBoundingClientRect(),inset=6;if(item.left<bounds.left+inset)strip.scrollLeft-=bounds.left+inset-item.left;else if(item.right>bounds.right-inset)strip.scrollLeft+=item.right-bounds.right+inset}
function fitVinText(){
for(const node of document.querySelectorAll('.vehicle-vin code,.hero-vin code')){
node.style.fontSize='';const width=node.clientWidth;
if(width>0&&node.scrollWidth>width){const size=parseFloat(getComputedStyle(node).fontSize);node.style.fontSize=Math.max(6,size*width/node.scrollWidth)+'px'}
}
}
window.addEventListener('resize',fitVinText);
function render(){if(!user){login();return}if(passwordSetup){setupPassword();return}rememberNavigation();document.documentElement.dataset.theme=theme;document.title=page+' · MyCar';document.querySelector('.context').hidden=cars.length<2;document.querySelector('#account').innerHTML='';window.renderMyCarMenu?.();document.querySelector('#nav').innerHTML=names.filter(n=>n!=='Setări').map((n,i)=>`<button type="button" class="${page===n?'active':''}" data-go="${n}" ${page===n?'aria-current="page"':''}>${icon(['home','car','plus','history','settings'][i])}<span>${n}</span></button>`).join('');document.querySelector('#car').innerHTML=cars.map(x=>`<button type="button" data-car="${x.id}" aria-pressed="${x.id===car}" class="${x.id===car?'active':''}">${icon('car')}<span>${safe(x.name)}</span></button>`).join('');ensureSelectedCarVisible();document.querySelector('#content').innerHTML=({'Acasă':home,'Mașini':vehicles,'Adaugă':add,'Istoric':eventHistory,'Setări':settings,'Despre':about,'Cereri de acces':accessRequests})[page]();document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(page===b.dataset.go)return;page=b.dataset.go;render()});document.querySelectorAll('[data-vehicle-card]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-car],[data-delete-car],[data-edit-fuel],[data-edit-car]'))return;selectVehicle(b.dataset.vehicleCard)});document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>selectVehicle(b.dataset.car));document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});document.querySelectorAll('[data-delete-car]').forEach(b=>b.onclick=()=>confirmDeletion('vehicles',b.dataset.deleteCar));document.querySelectorAll('[data-delete-event]').forEach(b=>b.onclick=()=>confirmDeletion('events',b.dataset.deleteEvent));document.querySelectorAll('[data-edit-event]').forEach(b=>b.onclick=()=>editEvent(b.dataset.editEvent));document.querySelectorAll('[data-edit-fuel]').forEach(b=>b.onclick=()=>editFuel(b.dataset.editFuel));document.querySelectorAll('[data-edit-car]').forEach(b=>b.onclick=()=>editVehicle(b.dataset.editCar));const cf=document.querySelector('#carForm');if(cf)bindVehicleForm(cf);
const f=document.querySelector('#eventForm');if(f)bindEventForm(f);document.querySelectorAll('[data-select-document]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-document]'))return;selectedDocumentKey=car+':'+b.dataset.selectDocument;render();const current=document.querySelector('[data-select-document="'+b.dataset.selectDocument+'"] .document-select');if(current)current.focus({preventScroll:true})});document.querySelectorAll('[data-document]').forEach(b=>b.onclick=()=>editDocument(b.dataset.document));if(page==='Setări'&&window.initMyCarPush)window.initMyCarPush();window.bindMyCarInvitations?.();requestAnimationFrame(fitVinText);const n=document.querySelector('#notices');if(n)n.onchange=()=>action(()=>savePreferences({notices:n.checked}));document.querySelectorAll('button[data-days]').forEach(b=>b.onclick=()=>action(()=>savePreferences({days:b.dataset.days}),b));document.querySelectorAll('button[data-theme]').forEach(b=>b.onclick=()=>action(()=>savePreferences({theme:b.dataset.theme}),b));}

async function saveVehicleDetails(payload,vehicleId=null){
const table=sb.from('vehicles');
const query=vehicleId?table.update(payload).eq('id',vehicleId).eq('user_id',user.id):table.insert(payload);
return checked(await query.select().single());
}
function editVehicle(id){
if(busy)return;
const vehicle=cars.find(x=>x.id===id);if(!vehicle)return;
if(!editingCarId)newCarDraft=carDraft;
editingCarId=id;car=id;
carDraft={make:vehicle.make||'',model:vehicle.model||'',plate:vehicle.plate||'',vin:vehicle.vin||'',spec:vehicle.engine||'',year:vehicle.year||'',km:vehicle.km||'',fuels:[...vehicle.fuels]};
page='Mașini';render();
const section=document.querySelector('#vehicleFormSection');
section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
section.querySelector('h3').focus({preventScroll:true});
}
function cancelVehicleEdit(){
if(busy)return;
editingCarId=null;carDraft=newCarDraft||{};newCarDraft=null;render();
}
function bindVehicleForm(cf){
carDraft.fuels=carDraft.fuels||[];bindFuelPicker(cf,carDraft.fuels);
cf.querySelectorAll('input').forEach(i=>{i.value=carDraft[i.name]??'';i.oninput=()=>{if(i.name==='plate'||i.name==='vin'){const start=i.selectionStart,end=i.selectionEnd;i.value=i.value.toUpperCase();if(start!=null)i.setSelectionRange(start,end)}carDraft[i.name]=i.value}});
const cancel=cf.querySelector('#cancelVehicleEdit');if(cancel)cancel.onclick=cancelVehicleEdit;
cf.onsubmit=e=>{
e.preventDefault();const d=new FormData(cf),vehicleId=editingCarId;
action(async()=>{
const make=String(d.get('make')||'').trim(),model=String(d.get('model')||'').trim(),name=[make,model].filter(Boolean).join(' ');
if(!validFuels(carDraft.fuels))throw Error('Selectează una sau două variante de combustibil compatibile.');
if(!make||!model)throw Error('Completează marca și modelul.');
const payload={fuel_types:[...carDraft.fuels],display_name:name,make,model,specification:String(d.get('spec')||'').trim(),production_year:parseVehicleYear(d.get('year')),registration_number:String(d.get('plate')||'').trim().toUpperCase(),vin:String(d.get('vin')||'').trim().toUpperCase()||null,odometer_km:parseKm(d.get('km'))};
const v=await saveVehicleDetails(payload,vehicleId);
car=v.id;carDraft=vehicleId?(newCarDraft||{}):{};editingCarId=null;newCarDraft=null;
await load();page=vehicleId?'Mașini':'Acasă';render();
},cf.querySelector('button[type=submit]'));
};
}

function confirmDeletion(table,id){
if(busy)return;
const vehicle=table==='vehicles'?cars.find(x=>x.id===id):null;
const event=table==='events'?events.find(x=>x[7]===id):null;
if(!vehicle&&!event)return;
const dialog=document.querySelector('#documentDialog');
const title=vehicle?'Ștergi mașina?':'Ștergi evenimentul?';
const description=vehicle?'Se vor șterge definitiv '+vehicle.name+' și toate evenimentele și scadențele asociate.':'Se va șterge definitiv evenimentul „'+event[3]+'”.';
dialog.innerHTML=`<form id="deleteForm"><h3 id="deleteTitle">${title}</h3><p id="deleteDescription" class="muted">${safe(description)}</p><div class="form-actions"><button type="button" id="cancelDelete" autofocus>Anulează</button><button type="submit" class="danger-button">Șterge definitiv</button></div></form>`;
dialog.setAttribute('aria-labelledby','deleteTitle');dialog.setAttribute('aria-describedby','deleteDescription');dialog.showModal();
document.querySelector('#cancelDelete').onclick=()=>dialog.close();
document.querySelector('#deleteForm').onsubmit=e=>{e.preventDefault();action(async()=>{
const deleted=checked(await sb.from(table).delete().eq('id',id).eq('user_id',user.id).select('id'));
if(!deleted.length)throw Error('Înregistrarea nu mai există sau nu poate fi ștearsă.');
dialog.close();await load();render();
},e.currentTarget.querySelector('[type=submit]'))};
}
function editDocument(kind){const previous=documents.find(d=>d.vehicle_id===car&&d.kind===kind);const dialog=document.querySelector('#documentDialog');dialog.removeAttribute('aria-describedby');dialog.setAttribute('aria-labelledby','documentTitle');dialog.innerHTML=`<form id="documentForm"><h3 id="documentTitle" tabindex="-1" autofocus>${safe(kind)}</h3><div class="field"><label for="expiry">Data expirării</label><input id="expiry" name="expiry" type="date" required value="${previous?.expiry_date||''}"></div><div class="form-actions"><button type="button" id="cancelDocument">Anulează</button><button type="submit" class="primary">Salvează</button></div></form>`;dialog.showModal();document.querySelector('#documentTitle').focus({preventScroll:true});document.querySelector('#cancelDocument').onclick=()=>dialog.close();document.querySelector('#documentForm').onsubmit=e=>{e.preventDefault();const expiry=new FormData(e.currentTarget).get('expiry');action(async()=>{checked(await sb.from('documents').upsert({user_id:user.id,vehicle_id:car,kind,expiry_date:expiry},{onConflict:'vehicle_id,kind'}));await load();dialog.close();render()},e.currentTarget.querySelector('[type=submit]'))}}
document.querySelector('#logo-icon').innerHTML='<img src="icon-512.png?v=3" alt="" width="54" height="54" style="display:block;width:100%;height:100%;border-radius:inherit">';

sb.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){passwordSetup=true;sessionStorage.setItem('mycar-password-setup','1');user=session?.user||null;setTimeout(()=>render(),0)}if(event==='SIGNED_OUT'){user=null;cars=[];events=[];eventRecords=[];documents=[];editingEventId=null;eventDraft=null;carDraft={};passwordSetup=false;sessionStorage.removeItem('mycar-password-setup');login()}});
(async()=>{report('Se încarcă…');try{
const tokenHash=authLink.searchParams.get('token_hash'),type=authLink.searchParams.get('type');
let session;
if(tokenHash&&['invite','recovery'].includes(type)){
// Remove the one-time credential before making any further requests.
window.history.replaceState(null,'',location.pathname);
session=checked(await sb.auth.verifyOtp({token_hash:tokenHash,type})).session;
}else{
if(authFragment.get('error')||authLink.searchParams.get('error')){window.history.replaceState(null,'',location.pathname);throw Error('Linkul de invitație a expirat sau nu este valid. Solicită o invitație nouă.')}
session=checked(await sb.auth.getSession()).session;
}
if(session){user=session.user;if(passwordSetup)setupPassword();else{await load();render()}}else{passwordSetup=false;sessionStorage.removeItem('mycar-password-setup');login();if(tokenHash)throw Error('Invitația nu mai este validă. Solicită un link nou.')}report('');
}catch(err){if(!user){passwordSetup=false;sessionStorage.removeItem('mycar-password-setup');login()}report('Nu se poate continua: '+err.message);if(user){if(passwordSetup)setupPassword();else{document.querySelector('#content').innerHTML='<button id="retry" class="primary">Reîncearcă</button>';document.querySelector('#retry').onclick=()=>location.reload()}}}})();

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&page==='Acasă'&&!busy&&!document.querySelector('dialog[open]'))render()});

document.addEventListener('click',event=>{
if(!selectedDocumentKey||event.target.closest('[data-select-document],#documentDialog'))return;
selectedDocumentKey=null;
document.querySelectorAll('.document-selected').forEach(card=>{
card.classList.remove('document-selected');
card.querySelector('.document-select')?.setAttribute('aria-pressed','false');
const edit=card.querySelector('.document-edit');
if(edit){edit.disabled=true;edit.setAttribute('aria-hidden','true');edit.setAttribute('tabindex','-1')}
});
},{capture:true});




function about(){return intro('Despre MyCar','Mașinile și evenimentele tale, într-un singur loc.')+`<section class="card about-app"><span class="green bigicon">${icon('car')}</span><h3>MyCar</h3><p class="muted">Istoric de întreținere, alimentări și scadențe pentru mașinile tale.</p><div class="row"><span class="muted">Versiune</span><span>v${window.MYCAR_VERSION}</span></div></section>`}
function accessRequests(){return intro('Cereri de acces','Administrează invitațiile și conturile MyCar.')+`<p class="muted" id="adminAccessStatus" role="status">Se verifică accesul…</p><section class="card" id="invitationAdmin" hidden><div class="row"><h3>Cereri primite</h3><button class="secondary-button" type="button" data-refresh-invitations>Actualizează</button></div><p class="muted" data-invitation-status role="status" aria-live="polite"></p><div data-invitation-list></div></section>`}
function signOutMyCar(){return action(async()=>{checked(await sb.auth.signOut());user=null;window.resetMyCarAdmin?.();cars=[];events=[];eventRecords=[];documents=[];editingEventId=null;eventDraft=null;editingCarId=null;carDraft={};login()})}
