-- MyCar access requests: all access goes through the server function.
create table mycar.invitation_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table mycar.invitation_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(email) <= 254 and email = lower(trim(email))),
  status text not null default 'pending' check (status in ('pending','sending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  notified_at timestamptz,
  notification_error boolean not null default false,
  invite_error text
);
create table mycar.invitation_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table mycar.invitation_admins enable row level security;
alter table mycar.invitation_requests enable row level security;
alter table mycar.invitation_rate_limits enable row level security;
revoke all on mycar.invitation_admins,mycar.invitation_requests,mycar.invitation_rate_limits from public,anon,authenticated;
grant all on mycar.invitation_admins,mycar.invitation_requests,mycar.invitation_rate_limits to service_role;
create function mycar.submit_invitation_request(request_email text, client_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare request_id uuid; attempts_now integer;
begin
  if request_email is null or length(request_email)>254 or request_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$' then
    raise exception 'invalid_email';
  end if;
  if client_hash is null or client_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_client'; end if;
  -- Serialize the daily cap and duplicate check across concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('mycar-invitation-request',0));
  delete from mycar.invitation_rate_limits where window_start < now()-interval '2 days';
  insert into mycar.invitation_rate_limits(bucket,window_start,attempts)
    values(client_hash,date_trunc('hour',now()),1)
    on conflict(bucket) do update set
      attempts=case when invitation_rate_limits.window_start=date_trunc('hour',now()) then invitation_rate_limits.attempts+1 else 1 end,
      window_start=date_trunc('hour',now())
    returning attempts into attempts_now;
  if attempts_now>5 then return null; end if;
  if exists(select 1 from mycar.invitation_requests where email=lower(trim(request_email))) then return null; end if;
  if (select count(*) from mycar.invitation_requests where created_at>=date_trunc('day',now()))>=50 then return null; end if;
  insert into mycar.invitation_requests(email) values(lower(trim(request_email))) returning id into request_id;
  return request_id;
end $$;
revoke all on function mycar.submit_invitation_request(text,text) from public,anon,authenticated;
grant execute on function mycar.submit_invitation_request(text,text) to service_role;
-- Bootstrap the verified owner account, never from client-editable metadata.
insert into mycar.invitation_admins(user_id)
select id from auth.users where lower(email)='anzo.safe@gmail.com';
