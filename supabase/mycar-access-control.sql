-- MyCar-only membership. Existing ownership policies remain in force.
create schema if not exists mycar_private;
revoke all on schema mycar_private from public,anon;
grant usage on schema mycar_private to authenticated,service_role;
create table mycar.app_access (
 email text primary key check(email=lower(trim(email)) and length(email)<=254),
 user_id uuid references auth.users(id) on delete set null,
 status text not null check(status in ('active','pending','revoked','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 sent_at timestamptz,
 send_count integer not null default 0,
 error text,
 delivery_key uuid,
 delivery_started_at timestamptz
);
alter table mycar.app_access enable row level security;
revoke all on mycar.app_access from public,anon,authenticated;
grant all on mycar.app_access to service_role;
create unique index app_access_user_id_idx on mycar.app_access(user_id) where user_id is not null;
-- Preserve the current MyCar participants only, never the shared Auth directory.
insert into mycar.app_access(email,user_id,status)
select lower(u.email),u.id,'active' from auth.users u where u.email is not null and u.id in (
 select user_id from mycar.vehicles union select user_id from mycar.preferences
 union select user_id from mycar.account_activity union select user_id from mycar.invitation_admins

);
-- Preserve approved invitations not activated yet.
insert into mycar.app_access(email,user_id,status,sent_at,send_count)
select r.email,coalesce(r.invited_user_id,u.id),'pending',r.updated_at,1
from mycar.invitation_requests r left join auth.users u on lower(u.email)=r.email
where r.status='approved' on conflict(email) do update set sent_at=excluded.sent_at,send_count=1;
create function mycar_private.allowed_for(uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select uid is not null and exists (
 select 1 from mycar.app_access a join auth.users u on u.id=uid
 where a.status in ('active','pending') and (a.user_id=uid or (a.user_id is null and a.email=lower(u.email)))
 and u.email_confirmed_at is not null)
$$;
revoke all on function mycar_private.allowed_for(uuid) from public,anon,authenticated;
grant execute on function mycar_private.allowed_for(uuid) to service_role;
create function mycar_private.allowed() returns boolean language sql stable security definer set search_path='' as $$
 select mycar_private.allowed_for((select auth.uid()))
$$;
revoke all on function mycar_private.allowed() from public,anon;
grant execute on function mycar_private.allowed() to authenticated;
create function mycar.access_status() returns boolean language sql stable security invoker set search_path='' as $$select mycar_private.allowed()$$;
revoke all on function mycar.access_status() from public,anon;
grant execute on function mycar.access_status() to authenticated;
create function mycar.access_allowed_for(uid uuid) returns boolean language sql stable security invoker set search_path='' as $$select mycar_private.allowed_for(uid)$$;
revoke all on function mycar.access_allowed_for(uuid) from public,anon,authenticated;
grant execute on function mycar.access_allowed_for(uuid) to service_role;
do $$declare t text;begin
 foreach t in array array['vehicles','events','documents','attachments','preferences'] loop
 execute format('create policy mycar_membership_required on mycar.%I as restrictive for all to authenticated using ((select mycar_private.allowed())) with check ((select mycar_private.allowed()))',t);
 end loop;
end$$;
-- Membership transitions are protected even if called outside the admin UI.
create function mycar_private.protect_admin() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='revoked' and (new.email='anzo.safe@gmail.com' or exists(select 1 from mycar.invitation_admins where user_id=new.user_id)) then
 raise exception 'Contul administratorului este protejat';end if;
 return new;
end$$;
revoke all on function mycar_private.protect_admin() from public,anon,authenticated;
create trigger protect_mycar_admin before insert or update on mycar.app_access for each row execute function mycar_private.protect_admin();
create function mycar_private.user_for_email(recipient text) returns uuid language sql stable security definer set search_path='' as $$select id from auth.users where lower(email)=lower(trim(recipient))$$;
revoke all on function mycar_private.user_for_email(text) from public,anon,authenticated;
grant execute on function mycar_private.user_for_email(text) to service_role;
create function mycar.reserve_access_invite(recipient text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare em text:=lower(trim(recipient)); r mycar.app_access; k uuid:=gen_random_uuid(); target uuid; begin
 if em is null or length(em)>254 or em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresa de e-mail nu este validă';end if;
 target:=mycar_private.user_for_email(em);
 if em='anzo.safe@gmail.com' or exists(select 1 from mycar.invitation_admins where user_id=target) then raise exception 'Contul administratorului este protejat';end if;
 insert into mycar.app_access(email,user_id,status) values(em,target,'failed') on conflict do nothing;
 select * into r from mycar.app_access where email=em for update;
 if r.status='active' then raise exception 'Contul are deja acces activ la MyCar';end if;
 if r.delivery_key is not null and r.delivery_started_at>now()-interval '2 minutes' then raise exception 'Invitația este deja în curs de trimitere';end if;
 if r.sent_at>now()-interval '60 seconds' then raise exception 'Așteaptă un minut înainte de retrimitere';end if;
 update mycar.app_access set delivery_key=k,delivery_started_at=now(),user_id=coalesce(user_id,target) where email=em;
 return jsonb_build_object('delivery_key',k,'user_id',coalesce(r.user_id,target));
end$$;
create function mycar.finish_access_invite(recipient text,delivery uuid,recipient_id uuid,delivered boolean) returns void
language plpgsql security invoker set search_path='' as $$begin
 if delivered and (recipient_id is null or mycar_private.user_for_email(recipient) is distinct from recipient_id) then raise exception 'Destinatarul nu a putut fi verificat';end if;
 update mycar.app_access set
 user_id=case when delivered then recipient_id else user_id end,
 status=case when delivered then 'pending' else status end,
 sent_at=case when delivered then now() else sent_at end,
 send_count=send_count+case when delivered then 1 else 0 end,
 updated_at=now(),delivery_key=null,error=case when delivered then null else 'E-mailul nu a fost trimis. Reîncearcă.' end
 where email=lower(trim(recipient)) and delivery_key=delivery;
 if not found then raise exception 'Trimiterea nu a putut fi confirmată';end if;
end$$;
create function mycar.revoke_access(recipient text) returns void
language plpgsql security invoker set search_path='' as $$declare r mycar.app_access;begin
 select * into r from mycar.app_access where email=lower(trim(recipient)) for update;
 if not found then raise exception 'Contul nu aparține MyCar';end if;
 if r.delivery_key is not null and r.delivery_started_at>now()-interval '2 minutes' then raise exception 'Așteaptă finalizarea trimiterii invitației';end if;
 update mycar.app_access set status='revoked',updated_at=now(),delivery_key=null where email=r.email;
 -- Global Auth sessions, other apps and all vehicle records are preserved.
end$$;
revoke all on function mycar.reserve_access_invite(text),mycar.finish_access_invite(text,uuid,uuid,boolean),mycar.revoke_access(text) from public,anon,authenticated;
grant execute on function mycar.reserve_access_invite(text),mycar.finish_access_invite(text,uuid,uuid,boolean),mycar.revoke_access(text) to service_role;
-- Existing MyCar approval UI continues to grant only invitations actually sent.
create function mycar_private.approved_invite() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='approved' and (tg_op='INSERT' or old.status is distinct from new.status) then
 insert into mycar.app_access(email,user_id,status,sent_at,send_count)
 values(new.email,new.invited_user_id,'pending',new.updated_at,1)
 on conflict(email) do update set user_id=coalesce(excluded.user_id,app_access.user_id),
 status=case when app_access.status='active' then 'active' else 'pending' end,
 updated_at=now(),sent_at=excluded.sent_at,send_count=greatest(app_access.send_count,1);
 end if;
 return new;
end$$;
revoke all on function mycar_private.approved_invite() from public,anon,authenticated;
create trigger approved_invitation_membership after insert or update of status on mycar.invitation_requests for each row execute function mycar_private.approved_invite();
-- Link a pending invitation to the verified user on their first actual visit.
create function mycar_private.accept_visit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not mycar_private.allowed_for(new.user_id) then raise exception 'Accesul la MyCar nu este activ';end if;
 update mycar.app_access a set user_id=new.user_id,status='active',updated_at=now()
 where a.status in ('pending','active') and (a.user_id=new.user_id or (a.user_id is null and a.email=(select lower(email) from auth.users where id=new.user_id)));
 return new;
end$$;
revoke all on function mycar_private.accept_visit() from public,anon,authenticated;
create trigger accept_mycar_visit before insert or update on mycar.account_activity for each row execute function mycar_private.accept_visit();
