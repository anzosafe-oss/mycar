-- Applied. Reference only.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table mycar.push_subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, endpoint text not null unique, subscription jsonb not null, created_at timestamptz not null default now());
create table mycar.push_deliveries(id uuid primary key default gen_random_uuid(), subscription_id uuid not null references mycar.push_subscriptions(id) on delete cascade, document_id uuid not null references mycar.documents(id) on delete cascade, expiry_date date not null, stage integer not null, created_at timestamptz not null default now(),sent_at timestamptz,unique(subscription_id,document_id,expiry_date,stage));
alter table mycar.push_subscriptions enable row level security;
alter table mycar.push_deliveries enable row level security;
revoke all on mycar.push_subscriptions,mycar.push_deliveries from public,anon,authenticated;
grant all on mycar.push_subscriptions,mycar.push_deliveries to service_role;
insert into mycar.push_test_config(id,keys) values(true,jsonb_build_object('cronToken',gen_random_uuid()::text||gen_random_uuid()::text)) on conflict(id) do update set keys=mycar.push_test_config.keys||jsonb_build_object('cronToken',gen_random_uuid()::text||gen_random_uuid()::text);

select cron.schedule('mycar-expiry-push','17 * * * *',$job$select net.http_post(url:='https://radskybbymadavveatzn.supabase.co/functions/v1/mycar-push',headers:=jsonb_build_object('Content-Type','application/json','x-mycar-cron',(select keys->>'cronToken' from mycar.push_test_config where id=true)),body:='{}'::jsonb,timeout_milliseconds:=60000);$job$);