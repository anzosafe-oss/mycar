import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{db:{schema:'mycar'},auth:{persistSession:false}});
const headers={'Access-Control-Allow-Origin':'https://anzosafe-oss.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
function checked(r:any){if(r.error)throw r.error;return r.data}
export function stageFor(days:number,reminder:number){if(days>reminder)return null;const stages=[reminder,...(reminder>7?[7]:[]),1,0];return stages.filter(n=>days<=n).sort((a,b)=>a-b)[0]}
async function config(){let row=checked(await db.from('push_test_config').select('keys').eq('id',true).single());if(!row.keys.publicKey){checked(await db.from('push_test_config').update({keys:{...row.keys,...webpush.generateVAPIDKeys()}}).eq('id',true).is('keys->publicKey',null));row=checked(await db.from('push_test_config').select('keys').eq('id',true).single())}return row.keys}
async function dispatch(keys:any,uid?:string){
let query=db.from('push_subscriptions').select('*');if(uid)query=query.eq('user_id',uid);
const subs=checked(await query);let sent=0,failures=0;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const sub of subs){
const pref=checked(await db.from('preferences').select('*').eq('user_id',sub.user_id).maybeSingle());if(!pref?.notifications_enabled)continue;
const docs=checked(await db.from('documents').select('id,kind,expiry_date,vehicle_id').eq('user_id',sub.user_id));
const due=docs.map((d:any)=>({...d,days:Math.round((Date.parse(d.expiry_date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000)})).filter((d:any)=>d.expiry_date&&d.days<=pref.reminder_days);
if(!due.length)continue;
checked(await db.from('push_deliveries').delete().eq('subscription_id',sub.id).is('sent_at',null).lt('created_at',new Date(Date.now()-300000).toISOString()));
const claims=checked(await db.from('push_deliveries').upsert(due.map((d:any)=>({subscription_id:sub.id,document_id:d.id,expiry_date:d.expiry_date,stage:stageFor(d.days,pref.reminder_days)})),{onConflict:'subscription_id,document_id,expiry_date,stage',ignoreDuplicates:true}).select('*'));
if(!claims.length)continue;
const pending=due.filter((d:any)=>claims.some((c:any)=>c.document_id===d.id));
const cars=checked(await db.from('vehicles').select('id,display_name,make,model').eq('user_id',sub.user_id));
const body=pending.map((d:any)=>{const car=cars.find((v:any)=>v.id===d.vehicle_id);const name=car?.display_name||[car?.make,car?.model].filter(Boolean).join(' ');return d.kind+' · '+name+': '+(d.days<0?'expirat de '+Math.abs(d.days)+' zile':d.days===0?'expiră astăzi':'expiră în '+d.days+' zile')}).join('\n');
try{
const request=webpush.generateRequestDetails(sub.subscription,JSON.stringify({title:'MyCar · Scadențe',body,badge:due.length}),{TTL:3600,urgency:'normal',topic:'mycar-due',vapidDetails:{subject:'mailto:anzo.safe@gmail.com',publicKey:keys.publicKey,privateKey:keys.privateKey}});
const res=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:request.body,redirect:'error',signal:AbortSignal.timeout(15000)});
if(!res.ok){if([404,410].includes(res.status))checked(await db.from('push_subscriptions').delete().eq('id',sub.id));throw Error('Push HTTP '+res.status)}
checked(await db.from('push_deliveries').update({sent_at:new Date().toISOString()}).in('id',claims.map((c:any)=>c.id)));sent++;
}catch(err){failures++;checked(await db.from('push_deliveries').delete().in('id',claims.map((c:any)=>c.id)).is('sent_at',null));console.error('Push delivery failed',String(err))}
}
return {sent,failures};
}
function valid(sub:any){try{const u=new URL(sub.endpoint),h=u.hostname;return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(h==='web.push.apple.com'||h.endsWith('.push.apple.com')||h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com')&&/^[A-Za-z0-9_-]{80,100}$/.test(sub.keys?.p256dh)&&/^[A-Za-z0-9_-]{20,30}$/.test(sub.keys?.auth)}catch{return false}}
Deno.serve(async req=>{
if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
if(req.method!=='POST')return reply({error:'Method not allowed'},405);
try{
const cron=req.headers.get('x-mycar-cron');
if(cron){const raw=checked(await db.from('push_test_config').select('keys').eq('id',true).single());if(cron!==raw.keys.cronToken)return reply({error:'Unauthorized'},401);if((await req.json()).action==='health')return reply({ok:true,configured:!!(await config()).publicKey});return reply(await dispatch(await config()))}
const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Autentificare necesară.'},401);
const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return reply({error:'Autentificare necesară.'},401);
const uid=auth.data.user.id,body=await req.json();
if(body.action==='config')return reply({publicKey:(await config()).publicKey});
if(body.action==='subscribe'){if(!valid(body.subscription))return reply({error:'Abonament push invalid.'},400);
const existing=checked(await db.from('push_subscriptions').select('user_id').eq('endpoint',body.subscription.endpoint).maybeSingle());
if(existing&&existing.user_id!==uid)return reply({error:'Dezactivează notificările din contul anterior pe acest dispozitiv.'},409);
checked(await db.from('push_subscriptions').upsert({user_id:uid,endpoint:body.subscription.endpoint,subscription:body.subscription},{onConflict:'endpoint'}));
return reply({ok:true,...await dispatch(await config(),uid)})}
if(body.action==='unsubscribe'){checked(await db.from('push_subscriptions').delete().eq('user_id',uid).eq('endpoint',String(body.endpoint)));return reply({ok:true})}
if(body.action==='check')return reply(await dispatch(await config(),uid));
return reply({error:'Acțiune invalidă.'},400);
}catch(err){console.error('MyCar push failed',String(err));return reply({error:'Notificările nu au putut fi procesate.'},500)}
});
