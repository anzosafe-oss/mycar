-- Additive changes only: historical refuels remain unknown, never assumed full.
alter table mycar.events add column if not exists full_tank boolean;
alter table mycar.invitation_requests add column if not exists invited_user_id uuid references auth.users(id) on delete set null;
update mycar.invitation_requests r set invited_user_id=u.id
from auth.users u where r.status='approved' and r.invited_user_id is null and lower(u.email)=r.email;
create table if not exists mycar.account_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table mycar.account_activity enable row level security;
revoke all on mycar.account_activity from public,anon,authenticated;
grant all on mycar.account_activity to service_role;
notify pgrst,'reload schema';
