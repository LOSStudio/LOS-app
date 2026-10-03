begin;
insert into auth.users(id) values ('11111111-2222-4333-8444-555555555551'),('11111111-2222-4333-8444-555555555552');
insert into public.los_studio_recovery(user_id,revision,state) values ('11111111-2222-4333-8444-555555555551',1,'{"orders":[{"id":"own"}]}'),('11111111-2222-4333-8444-555555555552',1,'{"orders":[{"id":"foreign"}]}');
select set_config('request.jwt.claims','{"sub":"11111111-2222-4333-8444-555555555551","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.los_studio_recovery) <> 1 then raise exception 'Owner isolation failed'; end if;
 begin
 insert into public.los_studio_recovery(user_id,revision,state) values('11111111-2222-4333-8444-555555555552',2,'{}');
 raise exception 'Foreign insert allowed';
 exception when insufficient_privilege then null; end;
 insert into public.los_studio_recovery(user_id,revision,state) values('11111111-2222-4333-8444-555555555551',2,'{}');
end $$;
reset role;
delete from auth.users where id='11111111-2222-4333-8444-555555555551';
do $$ begin if exists(select 1 from public.los_studio_recovery where user_id='11111111-2222-4333-8444-555555555551') then raise exception 'Delete cascade failed'; end if; end $$;
rollback;
