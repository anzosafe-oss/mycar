const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function setup(invoke){
  const calls=[],message={textContent:''},list={innerHTML:'',querySelectorAll:()=>[],insertAdjacentHTML(){}};
  const gate={hidden:false,textContent:'',isConnected:true};
  const section={hidden:true,isConnected:true,querySelector:s=>s==='[data-invitation-list]'?list:s==='[data-invitation-status]'?message:{}};
  const c={user:{id:'owner'},passwordSetup:false,window:{renderMyCarMenu(){}},document:{visibilityState:'hidden',addEventListener(){},querySelector:s=>s==='#invitationAdmin'?section:s==='#adminAccessStatus'?gate:null},Date,Intl,safe:s=>String(s),MyCarUtils:{lastVisitLabel:()=>''},sb:{functions:{async invoke(name,{body}){assert.equal(name,'mycar-invitations');calls.push(body);return invoke(body)}}}};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(__dirname+'/invitations.js','utf8').replace('window.bindMyCarInvitations();',''),c);
  return {c,calls,section,gate,list};
}
test('a regular account cannot load account data, including a restored admin route',async()=>{
  const s=setup(async()=>({data:{isAdmin:false}}));await s.c.window.bindMyCarInvitations();
  assert.equal(s.c.window.isMyCarAdmin(),false);assert.equal(s.section.hidden,true);assert.match(s.gate.textContent,/rezervat/);assert.deepEqual(s.calls.map(x=>x.action),['admin']);
});
test('an administrator opens the existing authorized list endpoint and caches its role',async()=>{
  const s=setup(async b=>({data:b.action==='admin'?{isAdmin:true}:{emailConfigured:true,requests:[],accounts:[]}}));
  await s.c.window.bindMyCarInvitations();await s.c.window.bindMyCarInvitations();
  assert.equal(s.c.window.isMyCarAdmin(),true);assert.equal(s.section.hidden,false);assert.equal(s.gate.hidden,true);assert.equal(s.calls.filter(x=>x.action==='admin').length,1);assert.equal(s.calls.filter(x=>x.action==='list').length,2);
});
test('an in-flight role check is shared and never authorizes a different user',async()=>{
  let resolve;const s=setup(()=>new Promise(r=>{resolve=r}));
  const a=s.c.window.bindMyCarInvitations(),b=s.c.window.bindMyCarInvitations();
  assert.equal(s.calls.length,1);s.c.user={id:'other'};resolve({data:{isAdmin:true}});await Promise.all([a,b]);
  assert.equal(s.c.window.isMyCarAdmin(),false);assert.equal(s.section.hidden,true);assert.equal(s.calls.some(x=>x.action==='list'),false);
});
test('a failed role check stays closed and can be retried',async()=>{
  let attempts=0;const s=setup(async b=>{if(b.action==='admin'&&attempts++===0)throw Error('offline');return {data:b.action==='admin'?{isAdmin:true}:{emailConfigured:true,requests:[],accounts:[]}}});
  await s.c.window.bindMyCarInvitations();assert.equal(s.c.window.isMyCarAdmin(),false);assert.equal(s.section.hidden,true);
  await s.c.window.bindMyCarInvitations();assert.equal(s.c.window.isMyCarAdmin(),true);assert.equal(s.section.hidden,false);
});
test('sign-out clears cached administrator privileges',async()=>{
  const s=setup(async b=>({data:b.action==='admin'?{isAdmin:true}:{emailConfigured:true,requests:[],accounts:[]}}));await s.c.window.bindMyCarInvitations();
  s.c.user=null;s.c.window.resetMyCarAdmin();assert.equal(s.c.window.isMyCarAdmin(),false);
  s.c.user={id:'owner'};assert.equal(s.c.window.isMyCarAdmin(),false);
});
