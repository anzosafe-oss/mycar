begin;
do $$declare t record;begin
 select a.* into t from mycar.app_access a where a.user_id is not null and a.status='active' and a.email<>'anzo.safe@gmail.com' and not exists(select 1 from mycar.invitation_admins where user_id=a.user_id) limit 1;
 if not found then raise exception 'No non-admin fixture is available';end if;
 perform set_config('request.jwt.claim.sub',t.user_id::text,true);
 perform set_config('mycar.test_email',t.email,true);
 perform set_config('mycar.test_uid',t.user_id::text,true);
 perform set_config('mycar.test_users',(select count(*)::text from auth.users),true);
 perform set_config('mycar.test_lists',(select count(*)::text from public.mylist_accounts),true);
 if has_function_privilege('authenticated','mycar.reserve_access_invite(text)','EXECUTE') or has_function_privilege('anon','mycar.revoke_access(text)','EXECUTE') then raise exception 'Client can call an admin RPC';end if;
 begin
  perform mycar.revoke_access('anzo.safe@gmail.com');
  raise exception 'Owner revocation was incorrectly allowed';
 exception when others then
  if sqlerrm not like '%protejat%' then raise;end if;
 end;
end$$;
set local role authenticated;
do $$begin
 if not mycar.access_status() then raise exception 'Existing user lost access';end if;
end$$;
reset role;
set local role service_role;
select mycar.revoke_access(current_setting('mycar.test_email'));
reset role;
set local role authenticated;
do $$begin
 if mycar.access_status() then raise exception 'Revoked session still has access';end if;
 if exists(select 1 from mycar.vehicles) or exists(select 1 from mycar.events) or exists(select 1 from mycar.documents) or exists(select 1 from mycar.preferences) then raise exception 'Revoked session can read private data';end if;
 begin
  insert into mycar.vehicles(user_id,make,model) values(auth.uid(),'SECURITY TEST','ROLLBACK');
  raise exception 'Revoked session can insert a vehicle';
 exception when insufficient_privilege then null;
 end;
 if has_table_privilege('authenticated','mycar.app_access','SELECT') then raise exception 'Client can read registry';end if;
end$$;
reset role;
set local role service_role;
do $$declare r jsonb;begin
 r:=mycar.reserve_access_invite(current_setting('mycar.test_email'));
 begin
  perform mycar.reserve_access_invite(current_setting('mycar.test_email'));
  raise exception 'Concurrent duplicate invite was incorrectly allowed';
 exception when others then if sqlerrm not like '%curs%' then raise;end if;end;
 begin
  perform mycar.revoke_access(current_setting('mycar.test_email'));
  raise exception 'In-flight revoke was incorrectly allowed';
 exception when others then if sqlerrm not like '%finalizarea%' then raise;end if;end;
 perform mycar.finish_access_invite(current_setting('mycar.test_email'),(r->>'delivery_key')::uuid,null,false);
 if mycar.access_allowed_for(current_setting('mycar.test_uid')::uuid) then raise exception 'Failed send restored access';end if;
 r:=mycar.reserve_access_invite(current_setting('mycar.test_email'));
 -- No email is sent; this verifies only the database transition inside ROLLBACK.
 perform mycar.finish_access_invite(current_setting('mycar.test_email'),(r->>'delivery_key')::uuid,current_setting('mycar.test_uid')::uuid,true);
 if not mycar.access_allowed_for(current_setting('mycar.test_uid')::uuid) then raise exception 'Re-invited user cannot access MyCar';end if;
end$$;
reset role;
do $$begin
 if (select count(*) from auth.users)<>current_setting('mycar.test_users')::int then raise exception 'Global Auth changed';end if;
 if (select count(*) from public.mylist_accounts)<>current_setting('mycar.test_lists')::int then raise exception 'MyList access changed';end if;
end$$;
rollback;
select 'MyCar access tests passed; all changes rolled back' as result;
