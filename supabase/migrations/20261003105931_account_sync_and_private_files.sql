-- Additive setup: keeps existing snapshots and RLS ownership policies.
alter table public.los_studio_sync add column if not exists revision bigint not null default 0;

create or replace function public.los_studio_stamp_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.revision := case when tg_op = 'INSERT' then 1 else old.revision + 1 end;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.los_studio_stamp_revision() from public, anon, authenticated;
create trigger los_studio_stamp_revision before insert or update on public.los_studio_sync
for each row execute function public.los_studio_stamp_revision();

-- The lock plus expected revision makes each merge a compare-and-swap.
-- SECURITY INVOKER preserves the table's ownership policies.
create or replace function public.los_studio_commit(expected_revision bigint, snapshot jsonb, device text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  account uuid := auth.uid();
  current_row public.los_studio_sync%rowtype;
begin
  if account is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if expected_revision is null or expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then raise exception 'Invalid snapshot'; end if;
  select * into current_row from public.los_studio_sync where user_id = account for update;
  if not found then
    if expected_revision <> 0 then return jsonb_build_object('accepted',false,'row',null); end if;
    insert into public.los_studio_sync(user_id,state,device_id,app_version)
      values(account,snapshot,device,'V76-account-sync') on conflict(user_id) do nothing
      returning * into current_row;
    if found then return jsonb_build_object('accepted',true,'row',to_jsonb(current_row)); end if;
    select * into current_row from public.los_studio_sync where user_id = account for update;
  end if;
  if current_row.revision <> expected_revision then
    return jsonb_build_object('accepted',false,'row',to_jsonb(current_row));
  end if;
  update public.los_studio_sync set state=snapshot,device_id=device,app_version='V76-account-sync'
    where user_id=account returning * into current_row;
  return jsonb_build_object('accepted',true,'row',to_jsonb(current_row));
end;
$$;
revoke all on function public.los_studio_commit(bigint,jsonb,text) from public, anon;
grant execute on function public.los_studio_commit(bigint,jsonb,text) to authenticated;

-- File bytes are JSON envelopes so the existing Android text transport can handle them.
-- Paths begin with the owner's user id. This bucket is never public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('los-studio-private-files','los-studio-private-files',false,26214400,array['application/json'])
on conflict(id) do nothing;
create policy los_private_files_read on storage.objects for select to authenticated
  using(bucket_id='los-studio-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy los_private_files_insert on storage.objects for insert to authenticated
  with check(bucket_id='los-studio-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy los_private_files_update on storage.objects for update to authenticated
  using(bucket_id='los-studio-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check(bucket_id='los-studio-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy los_private_files_delete on storage.objects for delete to authenticated
  using(bucket_id='los-studio-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
