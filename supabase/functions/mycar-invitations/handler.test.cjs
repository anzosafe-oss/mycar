const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(__dirname+'/index.ts','utf8').replace(/^import .*;\n/,'').replace('export async function handler','async function handler').replace('Deno.serve(handler);','globalThis.handle=handler;');
const ID='00000000-0000-4000-8000-000000000001';
function setup({authenticated=false,admin=false,results=[],inviteError=null}={}){
  const calls=[],queue=[...results];let invites=0;
  const db={
    auth:{getUser:async()=>authenticated?{data:{user:{id:'owner'}},error:null}:{data:{user:null},error:{message:'invalid'}},admin:{inviteUserByEmail:async(email,options)=>{invites++;calls.push({email,options});return {error:inviteError}}}},
    from(table){let operation='select',values;const q={};for(const method of ['select','eq','order','limit','update'])q[method]=(...args)=>{if(method==='update'){operation='update';values=args[0]}return q};
      const finish=()=>{calls.push({table,operation,values});if(table==='invitation_admins')return {data:admin?{user_id:'owner'}:null,error:null};return {data:queue.shift()??null,error:null}};
      q.maybeSingle=async()=>finish();q.then=(resolve,reject)=>Promise.resolve(finish()).then(resolve,reject);return q;
    },rpc:async()=>({data:null,error:null})
  };
  const context={createClient:()=>db,Deno:{env:{get:key=>({SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-secret'}[key])}},Response,Request,Headers,AbortSignal,TextEncoder,crypto:webcrypto,console};
  vm.createContext(context);vm.runInContext(source,context);
  return {call:async(body,headers={})=>context.handle(new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer test'}:{}),...headers},body:JSON.stringify(body)})),calls,invites:()=>invites};
}
test('anonymous visitors cannot list or approve, even with forged owner fields',async()=>{for(const action of ['list','approve','reject']){const s=setup();assert.equal((await s.call({action,id:ID,user_id:'owner',isAdmin:true})).status,401);assert.equal(s.invites(),0);assert.equal(s.calls.length,0)}});
test('ordinary authenticated users cannot administer requests',async()=>{for(const action of ['list','approve','reject']){const s=setup({authenticated:true});assert.equal((await s.call({action,id:ID})).status,403);assert.equal(s.invites(),0)}});
test('admin identity comes from the server allowlist',async()=>{const s=setup({authenticated:true});assert.deepEqual(await (await s.call({action:'admin',isAdmin:true})).json(),{isAdmin:false})});
test('valid administrator invites only the stored email with the fixed redirect',async()=>{const s=setup({authenticated:true,admin:true,results:[{id:ID,status:'pending',email:'tester@example.invalid'},{id:ID},null]});assert.equal((await s.call({action:'approve',id:ID,email:'attacker@example.invalid',redirectTo:'https://attacker.invalid'})).status,200);assert.equal(s.invites(),1);const sent=s.calls.find(x=>x.email);assert.equal(sent.email,'tester@example.invalid');assert.equal(sent.options.redirectTo,'https://anzosafe-oss.github.io/mycar/');assert(s.calls.some(x=>x.values?.status==='approved'))});
test('duplicate or already processed approval does not send another invite',async()=>{for(const results of [[{status:'approved'}],[{status:'pending'},null]]){const s=setup({authenticated:true,admin:true,results});assert.equal((await s.call({action:'approve',id:ID})).status,409);assert.equal(s.invites(),0)}});
test('invite failure leaves request pending for a later retry',async()=>{const s=setup({authenticated:true,admin:true,results:[{id:ID,status:'pending',email:'test@example.invalid'},{id:ID},null],inviteError:{message:'smtp failed'}});assert.equal((await s.call({action:'approve',id:ID})).status,502);assert(s.calls.some(x=>x.values?.status==='pending'))});
test('reject does not send an email or invite',async()=>{const s=setup({authenticated:true,admin:true,results:[{id:ID,status:'pending'},{id:ID}]});assert.equal((await s.call({action:'reject',id:ID})).status,200);assert.equal(s.invites(),0)});
test('public validation, honeypot and duplicate submission never grant access',async()=>{const s=setup();assert.equal((await s.call({action:'request',email:'bad',elapsed:2000})).status,400);for(const body of [{action:'request',email:'test@example.invalid',elapsed:2000},{action:'request',website:'spam',elapsed:2000}])assert.equal((await s.call(body)).status,200);assert.equal(s.invites(),0)});
test('a foreign origin is rejected',async()=>{const s=setup();assert.equal((await s.call({action:'health'},{origin:'https://attacker.invalid'})).status,403)});
test('health does not expose secrets and accurately reports missing mail setup',async()=>{const s=setup();assert.deepEqual(await (await s.call({action:'health'})).json(),{ok:true,emailConfigured:false})});
