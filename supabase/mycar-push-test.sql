-- Already applied; reference only.
create table mycar.push_test_config (id boolean primary key default true check(id), keys jsonb not null);
create table mycar.push_test_limits (user_id uuid primary key references auth.users(id) on delete cascade, last_test_at timestamptz not null default '1970-01-01');
alter table mycar.push_test_config enable row level security;
alter table mycar.push_test_limits enable row level security;
revoke all on mycar.push_test_config,mycar.push_test_limits from public,anon,authenticated;
grant all on mycar.push_test_config,mycar.push_test_limits to service_role;