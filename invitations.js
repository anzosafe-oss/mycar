(()=>{
let adminFor=null,adminAllowed=false,adminPending=null,lastVisitUser=null,lastVisitAt=0;
window.isMyCarAdmin=()=>!!user&&!passwordSetup&&adminFor===user.id&&adminAllowed;
window.resetMyCarAdmin=()=>{adminFor=null;adminAllowed=false;adminPending=null;window.renderMyCarMenu?.()};
async function ensureAdmin(uid){
  if(adminFor===uid)return adminAllowed;
  if(!adminPending||adminPending.uid!==uid){
    const task={uid};
    task.promise=call({action:'admin'}).then(result=>{
      if(!user||user.id!==uid||adminPending!==task)return false;
      adminFor=uid;adminAllowed=result.isAdmin===true;return adminAllowed;
    }).finally(()=>{if(adminPending===task)adminPending=null});
    adminPending=task;
  }
  return adminPending.promise;
}
async function call(body){
  const r=await sb.functions.invoke('mycar-invitations',{body});
  if(r.error){let detail;try{detail=await r.error.context?.json()}catch{}throw Error(detail?.error||'Nu se poate contacta serviciul de invitații. Încearcă din nou.')}
  if(r.data?.error)throw Error(r.data.error);
  return r.data;
}
window.recordMyCarVisit=async()=>{
  if(!user||passwordSetup||document.visibilityState==='hidden')return;
  const uid=user.id,now=Date.now();if(lastVisitUser===uid&&now-lastVisitAt<300000)return;
  lastVisitUser=uid;lastVisitAt=now;
  try{await call({action:'visit'})}catch{if(lastVisitUser===uid)lastVisitAt=0}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')window.recordMyCarVisit()});
function requestInvitation(){
  const dialog=document.querySelector('#documentDialog');
  dialog.removeAttribute('aria-describedby');dialog.setAttribute('aria-labelledby','invitationTitle');
  dialog.innerHTML='<form id="invitationForm"><h3 id="invitationTitle" tabindex="-1" autofocus>Solicită o invitație</h3><p class="muted">Lasă adresa ta de email. Vei primi invitația dacă administratorul aprobă cererea.</p><div class="field"><label for="invitationEmail">Email</label><input id="invitationEmail" name="email" type="email" autocomplete="email" maxlength="254" required></div><div class="invitation-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p id="invitationFeedback" role="status" aria-live="polite"></p><div class="form-actions"><button type="button" class="secondary-button" id="cancelInvitation">Anulează</button><button class="primary" type="submit">Trimite cererea</button></div></form>';
  const started=Date.now(),form=dialog.querySelector('form'),feedback=dialog.querySelector('#invitationFeedback'),submit=form.querySelector('[type=submit]'),cancel=dialog.querySelector('#cancelInvitation');
  dialog.showModal();dialog.querySelector('h3').focus({preventScroll:true});cancel.onclick=()=>dialog.close();
  form.onsubmit=async e=>{
    e.preventDefault();if(submit.disabled)return;submit.disabled=true;feedback.textContent='Se trimite cererea…';
    const data=new FormData(form);
    try{
      // A short wait also keeps the public honeypot timing check accessible to autofill.
      const elapsed=Date.now()-started;if(elapsed<1500)await new Promise(resolve=>setTimeout(resolve,1500-elapsed));
      const result=await call({action:'request',email:data.get('email'),website:data.get('website'),elapsed:Date.now()-started});
      feedback.textContent=result.message;submit.hidden=true;form.querySelector('.field').hidden=true;cancel.textContent='Închide';
    }catch(err){feedback.textContent=err.message;submit.disabled=false}
  };
}
const labels={pending:'În așteptare',sending:'Se trimite invitația',approved:'Invitație trimisă',rejected:'Respinsă'};
async function loadRequests(section){
  if(!window.isMyCarAdmin())return;const requestUser=user.id;
  const list=section.querySelector('[data-invitation-list]'),message=section.querySelector('[data-invitation-status]');
  message.textContent='Se încarcă cererile…';
  try{
    const result=await call({action:'list'});if(!section.isConnected||user?.id!==requestUser||!window.isMyCarAdmin())return;
    message.textContent=result.emailConfigured?'':'Emailurile pentru cereri noi nu sunt încă configurate. Cererile rămân disponibile aici.';
    list.innerHTML=result.requests.length?result.requests.map(r=>'<article class="invitation-request"><div class="invitation-request-heading"><strong>'+safe(r.email)+'</strong><span class="badge">'+safe(r.status==='approved'&&r.account?.active?'Cont activ':labels[r.status]||r.status)+'</span></div><p class="muted">'+new Intl.DateTimeFormat('ro-RO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created_at))+'</p>'+(r.status==='approved'&&r.account?'<p class="muted">'+safe(MyCarUtils.lastVisitLabel(r.account.last_seen_at))+'</p>':'')+(r.invite_error?'<p role="status">'+safe(r.invite_error)+'</p>':'')+(r.status==='pending'?'<div class="invitation-actions"><button class="secondary-button" type="button" data-invitation-action="approve" data-id="'+r.id+'">Aprobă</button><button class="danger-button" type="button" data-invitation-action="reject" data-id="'+r.id+'">Respinge</button></div>':'')+'</article>').join(''):'<p class="muted">Nu ai cereri de acces.</p>';
    if(result.accounts?.length){
      list.insertAdjacentHTML('beforeend','<div class="managed-accounts"><h4>Conturi MyCar</h4>'+result.accounts.map(account=>'<article class="managed-account"><div class="invitation-request-heading"><strong>'+safe(account.email)+'</strong><span class="badge '+(account.active?'account-active':'')+'">'+(account.active?'Cont activ':'În așteptarea activării')+'</span></div><p class="muted">'+safe(MyCarUtils.lastVisitLabel(account.last_seen_at))+'</p></article>').join('')+'</div>');
    }
    list.querySelectorAll('[data-invitation-action]').forEach(button=>button.onclick=()=>confirmReview(section,button.dataset.id,button.dataset.invitationAction));
  }catch(err){message.textContent=err.message}
}
function confirmReview(section,id,action){
  if(!window.isMyCarAdmin())return;
  const dialog=document.querySelector('#documentDialog'),approve=action==='approve';
  dialog.removeAttribute('aria-describedby');dialog.setAttribute('aria-labelledby','reviewTitle');
  dialog.innerHTML='<form id="reviewInvitation"><h3 id="reviewTitle" tabindex="-1" autofocus>'+(approve?'Aprobi accesul?':'Respingi cererea?')+'</h3><p class="muted">'+(approve?'Persoana va primi un email cu invitația și își va alege singură parola.':'Cererea va fi marcată ca respinsă. Nu se trimite nicio invitație.')+'</p><p id="reviewFeedback" role="status"></p><div class="form-actions"><button id="cancelReview" class="secondary-button" type="button">Anulează</button><button class="'+(approve?'primary':'danger-button')+'" type="submit">'+(approve?'Aprobă și trimite':'Respinge cererea')+'</button></div></form>';
  dialog.showModal();dialog.querySelector('h3').focus({preventScroll:true});dialog.querySelector('#cancelReview').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=async e=>{
    e.preventDefault();const submit=e.currentTarget.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;
    try{if(!window.isMyCarAdmin())throw Error('Acces rezervat administratorului.');await call({action,id});dialog.close();await loadRequests(section)}catch(err){dialog.querySelector('#reviewFeedback').textContent=err.message;submit.disabled=false}
  };
}
window.bindMyCarInvitations=async()=>{
  if(user)window.recordMyCarVisit();
  const trigger=document.querySelector('#requestInvitation');if(trigger)trigger.onclick=requestInvitation;
  if(!user||passwordSetup){window.resetMyCarAdmin();return}
  const uid=user.id,section=document.querySelector('#invitationAdmin'),gate=document.querySelector('#adminAccessStatus');
  try{
    await ensureAdmin(uid);
    if(!user||user.id!==uid)return;
    window.renderMyCarMenu?.();
    if(!section||!section.isConnected)return;
    if(!window.isMyCarAdmin()){section.hidden=true;if(gate){gate.hidden=false;gate.textContent='Acces rezervat administratorului.'}return}
    if(gate)gate.hidden=true;
    section.hidden=false;section.querySelector('[data-refresh-invitations]').onclick=()=>loadRequests(section);await loadRequests(section);
  }catch{
    if(!user||user.id!==uid)return;
    window.renderMyCarMenu?.();
    if(section?.isConnected)section.hidden=true;
    if(gate?.isConnected){gate.hidden=false;gate.textContent='Accesul nu a putut fi verificat. Reîncearcă deschizând pagina din meniu.'}
  }
};
window.bindMyCarInvitations();
})();


