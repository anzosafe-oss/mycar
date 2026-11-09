const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const U=require('./mycar-utils.js');
const W=require('./widgets.js');
const row=(id,km,quantity,full=true,extra={})=>({id,vehicle_id:'a',category:'Alimentare',event_date:'2026-11-'+String(id).padStart(2,'0'),created_at:'',odometer_km:km,quantity,full_tank:full,fuel_type:'Benzină',...extra});
test('full-to-full consumption excludes the starting fill and includes partial fills',()=>{const r=U.computeConsumption([row(1,1000,55),row(2,1200,12,false),row(3,1600,30)]);assert.equal(r.size,1);assert.equal(r.get(3).quantity,42);assert.equal(r.get(3).distance,600);assert.equal(r.get(3).value,7)});
test('unknown historical fills never become a starting full tank',()=>{assert.equal(U.computeConsumption([row(1,1000,50,null),row(2,1600,40)]).size,0)});
test('missing data and reversed or duplicate mileage do not fabricate consumption',()=>{for(const middle of [row(2,null,12,false),row(2,1200,null,false),row(2,900,12,false),row(2,1000,12,false)]){assert.equal(U.computeConsumption([row(1,1000,50),middle,row(3,1600,40)]).size,0)}});
test('vehicles and fuel types are calculated independently',()=>{const rows=[row(1,1000,50),row(2,1050,20,true,{vehicle_id:'b'}),row(3,1100,15,true,{fuel_type:'GPL'}),row(4,1600,36),row(5,1400,20,true,{vehicle_id:'b'}),row(6,1500,28,true,{fuel_type:'GPL'})];const r=U.computeConsumption(rows);assert.equal(r.get(4).value,6);assert.equal(r.get(6).value,7);assert.equal(r.get(5).distance,350)});
test('electricity has its own unit and partial charges are accumulated',()=>{const r=U.computeConsumption([row(1,1000,60,true,{fuel_type:'Electrică'}),row(2,1100,10,false,{fuel_type:'Electrică'}),row(3,1300,35,true,{fuel_type:'Electrică'})]);assert.equal(r.get(3).value,15);assert.equal(r.get(3).unit,'kWh/100 km')});
test('changes and deletions recalculate from the remaining records',()=>{const start=row(1,1000,50),end=row(2,1500,30);assert.equal(U.computeConsumption([start,end]).get(2).value,6);assert.equal(U.computeConsumption([start,{...end,quantity:35}]).get(2).value,7);assert.equal(U.computeConsumption([end]).size,0)});
test('unknown fuel interrupts the calculation rather than silently mixing fuel',()=>{assert.equal(U.computeConsumption([row(1,1000,50),row(2,1200,12,false,{fuel_type:null}),row(3,1600,40)]).size,0)});
test('identifiers, tire icon recognition and visit labels preserve intended semantics',()=>{assert.equal(U.identifier(' gl21myz '),'GL21MYZ');assert.equal(U.identifier(null),'');assert.equal(U.eventIcon('Altele','Schimb cauciucuri iarnă'),'tyre');assert.equal(U.eventIcon('Altele','Schimb anvelope'),'tyre');assert.equal(U.eventIcon('Revizie','Schimb ulei'),'wrench');assert.equal(U.lastVisitLabel('2026-11-05T12:00:00Z',Date.parse('2026-11-09T12:00:00Z')),'Ultima vizită: acum 4 zile')});
test('event editing updates only the original record and vehicle with an ownership filter',async()=>{
const source=fs.readFileSync(__dirname+'/app.js','utf8'),start=source.indexOf('async function saveEventDetails'),end=source.indexOf('function bindEventForm',start),ops=[];
const q={update:p=>(ops.push(['update',p]),q),insert:p=>(ops.push(['insert',p]),q),eq:(k,v)=>(ops.push(['eq',k,v]),q),select:()=>q,single:async()=>({data:{id:'event-a'}})};
const fn=new Function('sb','user','checked',source.slice(start,end)+'return saveEventDetails;')({from:table=>(assert.equal(table,'events'),q)},{id:'owner'},r=>r.data);
await fn({vehicle_id:'vehicle-original',title:'Corrected'},'event-a');assert(ops.some(x=>x[0]==='update'));assert(!ops.some(x=>x[0]==='insert'));for(const pair of [['id','event-a'],['user_id','owner'],['vehicle_id','vehicle-original']])assert(ops.some(x=>x[0]==='eq'&&x[1]===pair[0]&&x[2]===pair[1]));
});
test('new cards render uppercase VIN, explicit two-line expiry and tire actions',()=>{
const source=fs.readFileSync(__dirname+'/app.js','utf8').split('const sb=')[0],context={MyCarUtils:U,MyCarWidgets:W,URL,URLSearchParams,location:{href:'https://example.invalid/',hash:''},sessionStorage:{getItem:()=>null,setItem:()=>{}},Intl,Date};vm.createContext(context);
vm.runInContext(source+`\nlet editingCarId=null,carDraft={},editingEventIdForTest=null;cars=[{id:'a',name:'Skoda Kamiq',spec:'1.0 TSI · 2020',km:'81.015',plate:'gl21myz',vin:'tmb12345678901234',fuels:['Benzină']}];car='a';documents=[{vehicle_id:'a',kind:'RCA',expiry_date:'2020-01-01'}];events=[['a','2026-11-09','Altele','Schimb cauciucuri','',140,'81.015','event-a',null,null,null]];globalThis.html={home:home(),vehicles:vehicles(),add:add(),history:eventHistory()};`,context);
assert(context.html.home.includes('TMB12345678901234'));assert(context.html.home.includes('<span>Expirat de</span>'));assert(context.html.vehicles.includes('vehicle-plate'));assert(context.html.vehicles.includes('vehicle-vin'));assert(!context.html.add.includes('Benzină'));assert(!context.html.add.includes('Datele sunt salvate'));assert(context.html.history.includes('data-edit-event="event-a"'));assert(context.html.history.includes('data-delete-event="event-a"'));
});

