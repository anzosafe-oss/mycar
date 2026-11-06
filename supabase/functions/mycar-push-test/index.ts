import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
const origin='https://anzosafe-oss.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{db:{schema:'mycar'},auth:{persistSession:false}});
Deno.serve(async req=>{
if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
if(req.method!=='POST')return reply({error:'Method not allowed'},405);
if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply({error:'Origin denied'},403);
const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
if(!token)return reply({error:'Autentificare necesară.'},401);
const {data:auth,error:authError}=await db.auth.getUser(token);
if(authError||!auth.user)return reply({error:'Autentificare necesară.'},401);
try{
const body=await req.json();
if(!['config','test'].includes(body.action))return reply({error:'Acțiune invalidă.'},400);
let {data:config,error}=await db.from('push_test_config').select('keys').eq('id',true).maybeSingle();
if(error)throw error;
if(!config){const {error:insertError}=await db.from('push_test_config').upsert({id:true,keys:webpush.generateVAPIDKeys()},{onConflict:'id',ignoreDuplicates:true});if(insertError)throw insertError;const result=await db.from('push_test_config').select('keys').eq('id',true).single();if(result.error)throw result.error;config=result.data;}
if(body.action==='config')return reply({publicKey:config.keys.publicKey});
const sub=body.subscription;
let endpoint:URL;try{endpoint=new URL(sub?.endpoint)}catch{return reply({error:'Abonament push invalid.'},400)}
const host=endpoint.hostname;
const allowed=host==='web.push.apple.com'||host.endsWith('.push.apple.com')||host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com';
if(!allowed||endpoint.protocol!=='https:'||endpoint.port||endpoint.username||endpoint.password||!sub.keys||!/^[A-Za-z0-9_-]{80,100}$/.test(sub.keys.p256dh)||!/^[A-Za-z0-9_-]{20,30}$/.test(sub.keys.auth))return reply({error:'Abonament push invalid.'},400);
const uid=auth.user.id;
const init=await db.from('push_test_limits').upsert({user_id:uid},{onConflict:'user_id',ignoreDuplicates:true});if(init.error)throw init.error;
const claim=await db.from('push_test_limits').update({last_test_at:new Date().toISOString()}).eq('user_id',uid).lt('last_test_at',new Date(Date.now()-60000).toISOString()).select('user_id');
if(claim.error)throw claim.error;
if(!claim.data.length)return reply({error:'Așteaptă un minut înainte de un nou test.'},429);
const payload=JSON.stringify({title:'MyCar · Notificare de test',body:'Test reușit! Aceasta este o singură notificare, trimisă la cererea ta.',test:true,badge:1});
const options={TTL:120,urgency:'normal',topic:'mycar-manual-test',vapidDetails:{subject:'mailto:anzo.safe@gmail.com',publicKey:config.keys.publicKey,privateKey:config.keys.privateKey}};
const request=webpush.generateRequestDetails(sub,payload,options);
const result=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:request.body,redirect:'error',signal:AbortSignal.timeout(15000)});
if(!result.ok)return reply({error:result.status===410||result.status===404?'Abonamentul a expirat. Dezactivează testul și activează-l din nou.':'Serviciul push a refuzat trimiterea ('+result.status+').'},502);
return reply({ok:true});
}catch(error){console.error('mycar-push-test failed',error instanceof Error?error.message:'error');return reply({error:'Testul nu a putut fi trimis. Încearcă din nou.'},500)}
});
