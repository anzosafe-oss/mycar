import {createClient} from 'npm:@supabase/supabase-js@2.57.4';

const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{db:{schema:'mycar'},auth:{persistSession:false,autoRefreshToken:false}});
const APP='https://anzosafe-oss.github.io/mycar/';
const ORIGIN='https://anzosafe-oss.github.io';
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const checked=r=>{if(r.error)throw r.error;return r.data};
const emailValid=s=>typeof s==='string'&&s.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(s);
const mailConfigured=()=>!!Deno.env.get('MYCAR_RESEND_API_KEY');
const generic={ok:true,message:'Cererea a fost înregistrată. Dacă este aprobată, vei primi o invitație prin email.'};

async function notifyOwner(request){
  if(!mailConfigured())return false;
  const admins=checked(await db.from('invitation_admins').select('user_id'));
  // Recipients are server-controlled administrators, never supplied by the visitor.
  const recipients=[];
  for(const admin of admins){const result=await db.auth.admin.getUserById(admin.user_id);if(result.error)throw result.error;if(result.data.user?.email)recipients.push(result.data.user.email)}
  if(!recipients.length)return false;
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+Deno.env.get('MYCAR_RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'mycar-invitation-'+request.id},
    body:JSON.stringify({from:Deno.env.get('MYCAR_EMAIL_FROM')||'MyCar <onboarding@resend.dev>',to:recipients,subject:'MyCar · Cerere nouă de acces',text:'O persoană a solicitat acces la testare.\n\nEmail: '+request.email+'\n\nDeschide MyCar, autentifică-te în contul de administrator și intră în Setări → Cereri de acces:\n'+APP+'?view=invitations\n\nCererea nu oferă automat acces. Tu alegi dacă o aprobi.'}),
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('owner_email_failed');
  checked(await db.from('invitation_requests').update({notified_at:new Date().toISOString(),notification_error:false}).eq('id',request.id));
  return true;
}

export async function handler(req){
  if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return reply({error:'Origine nepermisă.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Metodă nepermisă.'},405);
  try{
    const raw=await req.text();if(raw.length>4096)return reply({error:'Cerere prea mare.'},413);
    let body;try{body=JSON.parse(raw)}catch{return reply({error:'Cerere invalidă.'},400)}
    if(!body||typeof body!=='object')return reply({error:'Cerere invalidă.'},400);
    if(body.action==='health')return reply({ok:true,emailConfigured:mailConfigured()});
    if(body.action==='request'){
      if(body.website||!Number.isFinite(body.elapsed)||body.elapsed<1500)return reply(generic);
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      if(!emailValid(email))return reply({error:'Introdu o adresă de email validă.'},400);
      const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
      const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret+'|'+ip));
      const clientHash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
      const id=checked(await db.rpc('submit_invitation_request',{request_email:email,client_hash:clientHash}));
      if(id){
        try{const sent=await notifyOwner({id,email});if(!sent)checked(await db.from('invitation_requests').update({notification_error:true}).eq('id',id))}
        catch{checked(await db.from('invitation_requests').update({notification_error:true}).eq('id',id))}
      }
      return reply(generic);
    }
    // Every administrative operation validates the session with Auth, then checks
    // a server-only allowlist. A publishable key or user_metadata never grants admin.
    const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
    if(!token)return reply({error:'Autentificare necesară.'},401);
    const auth=await db.auth.getUser(token);
    if(auth.error||!auth.data.user)return reply({error:'Autentificare necesară.'},401);
    const uid=auth.data.user.id;
    const admin=checked(await db.from('invitation_admins').select('user_id').eq('user_id',uid).maybeSingle());
    if(body.action==='admin')return reply({isAdmin:!!admin});
    if(!admin)return reply({error:'Acces rezervat administratorului.'},403);
    if(body.action==='list'){
      const requests=checked(await db.from('invitation_requests').select('id,email,status,created_at,updated_at,notified_at,notification_error,invite_error').order('created_at',{ascending:false}).limit(100));
      return reply({requests,emailConfigured:mailConfigured()});
    }
    if(!['approve','reject','notify'].includes(body.action)||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id))return reply({error:'Acțiune invalidă.'},400);
    const request=checked(await db.from('invitation_requests').select('*').eq('id',body.id).maybeSingle());
    if(!request)return reply({error:'Cererea nu mai există.'},404);
    if(body.action==='notify'){
      if(!await notifyOwner(request))return reply({error:'Trimiterea emailurilor către administrator nu este încă configurată.'},503);
      return reply({ok:true});
    }
    if(request.status!=='pending')return reply({error:'Cererea a fost deja procesată. Reîncarcă lista.'},409);
    if(body.action==='reject'){
      const row=checked(await db.from('invitation_requests').update({status:'rejected',reviewed_by:uid,updated_at:new Date().toISOString(),invite_error:null}).eq('id',body.id).eq('status','pending').select('id').maybeSingle());
      return row?reply({ok:true}):reply({error:'Cererea a fost deja procesată.'},409);
    }
    const claim=checked(await db.from('invitation_requests').update({status:'sending',reviewed_by:uid,updated_at:new Date().toISOString()}).eq('id',body.id).eq('status','pending').select('id').maybeSingle());
    if(!claim)return reply({error:'Cererea a fost deja procesată.'},409);
    // Auth sends the invite only after the authenticated administrator approves.
    let result;
    try{result=await db.auth.admin.inviteUserByEmail(request.email,{redirectTo:APP})}
    catch{result={error:{message:'Invitația nu a putut fi trimisă.'}}}
    if(result.error){
      const message=result.error.code==='email_exists'||/already.*registered/i.test(result.error.message)?'Adresa are deja un cont. Utilizatorul se poate autentifica folosind parola existentă.':'Invitația nu a putut fi trimisă. Verifică serviciul de email Supabase și încearcă din nou.';
      checked(await db.from('invitation_requests').update({status:'pending',invite_error:message,updated_at:new Date().toISOString()}).eq('id',body.id).eq('status','sending'));
      return reply({error:message},502);
    }
    checked(await db.from('invitation_requests').update({status:'approved',invite_error:null,updated_at:new Date().toISOString()}).eq('id',body.id).eq('status','sending'));
    return reply({ok:true});
  }catch{console.error('MyCar invitation request failed');return reply({error:'Cererea nu a putut fi procesată. Încearcă din nou.'},500)}
}
Deno.serve(handler);
