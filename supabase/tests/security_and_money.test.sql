-- =====================================================================
-- QarzDaftar security + money integrity test.
-- Run against a LOCAL/DISPOSABLE database that has the migrations applied:
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_and_money.test.sql
-- Everything runs in one transaction and is rolled back at the end.
-- =====================================================================
begin;
create schema t;
grant usage on schema t to public;

create function t.as_user(u uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  set local role authenticated;
end $$;
create function t.as_root() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', true); end $$;
create function t.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(c, false) then raise exception 'FAIL: %', msg; end if; end $$;
create function t.fails(q text, pat text) returns void language plpgsql as $$
declare hit boolean := false;
begin
  begin
    execute q;
  exception when others then
    if sqlerrm like pat then hit := true;
    else raise exception 'FAIL [%]: expected "%" but got "%"', q, pat, sqlerrm; end if;
  end;
  if not hit then raise exception 'FAIL [%]: no error raised (expected "%")', q, pat; end if;
end $$;

do $test$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uadm uuid := gen_random_uuid();
  sa uuid; sb uuid; plan2 uuid; plan1 uuid; ca uuid; da uuid; p1 uuid; p2 uuid; pay public.payments;
  conv uuid; sub uuid; n int; k uuid := gen_random_uuid(); v bigint;
begin
  insert into auth.users (id, phone) values (ua, '998901111111'), (ub, '998902222222'), (uadm, '998903333333');
  update public.profiles set role = 'admin' where id = uadm;   -- only possible outside the API
  select id into plan1 from public.subscription_plans where code = 'month_1';
  select id into plan2 from public.subscription_plans where code = 'month_2';
  perform t.ok((select price_uzs from public.subscription_plans where code='month_2') = 85000, 'seed tariff 85000');

  -- registration, store starts pending and cannot write
  perform t.as_user(ua);
  select (public.register_store('A Market', 'Toshkent', null)).id into sa;
  perform t.fails($$insert into public.stores(owner_id,name) values (auth.uid(),'Second')$$, '%permission denied%');
  perform t.fails($q$select public.register_store('Again')$q$, 'store_already_exists');
  perform t.fails(format($q$insert into public.customers(store_id,full_name,phone) values (%L,'Aziz Karimov','+998901234567')$q$, sa), '%row-level security%');
  perform t.as_user(ub);
  select (public.register_store('B Market', 'Samarqand', null)).id into sb;

  -- admin activates A with a subscription
  perform t.as_user(uadm);
  perform public.admin_grant_subscription(sa, plan2);
  perform t.as_root();
  perform t.ok((select status from public.stores where id = sa) = 'active', 'store active after grant');
  perform t.ok((select ends_at > now() + interval '59 days' from public.subscriptions where store_id = sa), '2-month period');

  -- A works with customers / debts / payments
  perform t.as_user(ua);
  insert into public.customers(store_id, full_name, phone) values (sa, 'Aziz Karimov', '+998901234567') returning id into ca;
  perform t.fails('select public.create_debt(' || quote_literal(ca) || ', 0, current_date + 5)', 'invalid_amount');
  select (public.create_debt(ca, 1000000, public.today_tashkent() + 30, 'Un va yogʻ')).id into da;
  p1 := (public.record_payment(da, 400000, null, 'cash', 'avans', k)).id;
  perform t.ok((public.record_payment(da, 400000, null, 'cash', 'avans', k)).id = p1, 'idempotent payment');
  perform t.ok((select count(*) from public.payments where debt_id = da) = 1, 'no duplicate on retry');
  perform t.ok((select paid_amount = 400000 and status = 'partial' and remaining_amount = 600000 from public.debts where id = da), 'partial payment math');
  perform t.fails(format($q$select public.record_payment(%L, 700000)$q$, da), 'overpayment');
  perform t.fails(format($q$select public.update_debt(%L, 300000)$q$, da), 'amount_below_paid');
  perform t.fails(format($q$select public.cancel_debt(%L, 'xato')$q$, da), 'debt_has_payments');
  p2 := (public.settle_debt(da)).id;
  perform t.ok((select status = 'paid' and remaining_amount = 0 from public.debts where id = da), 'debt closed');
  perform t.fails(format($q$select public.settle_debt(%L)$q$, da), 'already_paid');

  -- correction keeps history: void, not edit/delete
  perform t.fails(format($q$select public.void_payment(%L, 'x')$q$, p2), 'reason_required');
  perform public.void_payment(p2, 'Xato summa kiritilgan');
  perform t.ok((select paid_amount = 400000 and status = 'partial' from public.debts where id = da), 'debt recalculated after void');
  perform t.ok((select count(*) from public.payments where debt_id = da) = 2, 'history kept (2 rows)');
  perform t.fails(format($q$select public.void_payment(%L, 'yana')$q$, p2), 'already_voided');
  perform t.fails($$update public.payments set amount = 1$$, '%permission denied%');
  perform t.fails($$delete from public.payments$$, '%permission denied%');
  perform t.fails($$update public.debts set paid_amount = 0$$, '%permission denied%');
  perform t.fails(format($q$update public.customers set deleted_at = now() where id = %L$q$, ca), 'customer_has_open_debts');

  -- even a privileged role cannot silently rewrite the ledger
  perform t.as_root();
  perform t.fails(format($q$update public.payments set amount = 5 where id = %L$q$, p1), 'payment_immutable');
  perform t.fails(format($q$update public.payments set note = 'x' where id = %L$q$, p2), 'payment_immutable');
  perform t.fails('delete from public.payments', 'immutable_record');
  perform t.fails('truncate public.payments', 'immutable_record');
  perform t.fails('update public.audit_logs set action = ''x''', 'immutable_record');
  perform t.fails('delete from public.audit_logs', 'immutable_record');
  perform t.fails(format($q$update public.debts set paid_amount = 2000000 where id = %L$q$, da), '%debts_paid_le_amount%');

  -- tenant isolation
  perform t.as_user(ub);
  perform t.ok((select count(*) from public.customers) = 0, 'B sees no customers');
  perform t.ok((select count(*) from public.debts) = 0, 'B sees no debts');
  perform t.ok((select count(*) from public.payments) = 0, 'B sees no payments');
  perform t.ok((select count(*) from public.customer_balances) = 0, 'B sees no balances');
  perform t.ok((select count(*) from public.audit_logs where store_id = sa) = 0, 'B sees no audit of A');
  perform t.ok((select count(*) from public.stores) = 1, 'B sees only own store');
  perform t.fails(format($q$select public.record_payment(%L, 1000)$q$, da), 'subscription_inactive_or_store_blocked');
  perform t.as_user(uadm); perform public.admin_grant_subscription(sb, plan1);
  perform t.as_user(ub);
  perform t.fails(format($q$select public.record_payment(%L, 1000)$q$, da), 'debt_not_found');
  perform t.fails(format($q$select public.void_payment(%L, 'hack hack')$q$, p1), 'payment_not_found');
  perform t.fails(format($q$select public.create_debt(%L, 1000, current_date + 3)$q$, ca), 'customer_not_found');
  perform t.fails(format($q$insert into public.customers(store_id,full_name) values (%L,'Hack')$q$, sa), '%row-level security%');
  perform t.fails(format($q$insert into public.customers(store_id,full_name,photo_path) values (%L,'Foto','%s/x.jpg')$q$, sb, sa), 'invalid_attachment_path');

  -- privilege escalation attempts by an owner
  perform t.as_user(ua);
  perform t.fails($$update public.profiles set role = 'admin' where id = auth.uid()$$, '%permission denied%');
  perform t.fails($$update public.stores set status = 'active'$$, '%permission denied%');
  perform t.fails($$insert into public.subscriptions(store_id,plan_id,duration_months,price_uzs,status) select id,(select id from public.subscription_plans limit 1),1,0,'active' from public.stores$$, '%permission denied%');
  perform t.fails($$insert into public.subscription_plans(code,name,duration_months,price_uzs) values ('free','Free',1,0)$$, '%row-level security%');
  update public.subscription_plans set price_uzs = 1;   -- RLS hides every row from a non-admin: 0 rows touched
  perform t.ok((select count(*) from public.subscription_plans where price_uzs = 1) = 0, 'owner cannot change tariffs');
  perform t.fails(format($q$select public.admin_set_store_status(%L,'blocked','spam spam')$q$, sb), 'forbidden');
  perform t.fails(format($q$select public.admin_confirm_subscription(%L)$q$, gen_random_uuid()), 'forbidden');
  perform t.fails('select public.admin_dashboard_stats()', 'forbidden');
  perform t.fails(format($q$select public.admin_check_store(%L)$q$, sa), 'forbidden');
  perform t.fails('select public.expire_subscriptions()', '%permission denied%');
  perform t.ok((select count(*) from public.admin_store_overview) = 0, 'owner sees no admin overview');
  perform t.fails($$update public.audit_logs set action = 'x'$$, '%permission denied%');

  -- admin: separate role, no access to shop financial data
  perform t.as_user(uadm);
  perform t.ok((select count(*) from public.customers) = 0, 'admin does not read customers');
  perform t.ok((select count(*) from public.debts) = 0, 'admin does not read debts');
  perform t.ok((select count(*) from public.payments) = 0, 'admin does not read payments');
  perform t.ok((select count(*) from public.stores) = 2, 'admin sees all stores');
  perform t.ok((select count(*) from public.admin_store_overview where subscription_active) = 2, 'overview shows active subs');
  perform t.ok((public.admin_dashboard_stats() ->> 'stores_total')::int = 2, 'dashboard stats');
  perform t.ok((public.admin_dashboard_stats() ->> 'revenue_total')::bigint = 145000, 'revenue = 85000 + 60000');
  perform t.ok((public.admin_check_store(sa) ->> 'subscription_active')::boolean, 'check: subscription active');
  perform t.fails(format($q$update public.profiles set role = 'owner' where id = %L$q$, uadm), '%permission denied%');

  -- block / unblock
  perform t.fails(format($q$select public.admin_set_store_status(%L,'blocked',null)$q$, sa), 'reason_required');
  perform public.admin_set_store_status(sa, 'blocked', 'Shubhali faollik');
  perform t.as_user(ua);
  perform t.fails(format($q$select public.create_debt(%L, 1000, current_date + 3)$q$, ca), 'subscription_inactive_or_store_blocked');
  perform t.ok((select count(*) from public.customers) = 1, 'blocked store can still read its data');
  perform t.ok((select count(*) from public.notifications where type = 'store_status') = 1, 'owner notified about block');
  perform t.fails($q$select public.request_subscription((select id from public.subscription_plans limit 1))$q$, 'store_blocked');
  perform t.as_user(uadm); perform public.admin_set_store_status(sa, 'active');
  perform t.as_user(ua); perform public.create_debt(ca, 1000, public.today_tashkent() + 3);

  -- subscription expiry -> paid writes stop, renewal via manual check
  perform t.as_root();
  update public.subscriptions set starts_at = now() - interval '3 months', ends_at = now() - interval '1 day' where store_id = sa;
  perform t.ok(public.expire_subscriptions() >= 1, 'expire job ran');
  perform t.ok((select status from public.subscriptions where store_id = sa) = 'expired', 'subscription expired');
  perform t.as_user(ua);
  perform t.fails(format($q$select public.create_debt(%L, 1000, current_date + 3)$q$, ca), 'subscription_inactive_or_store_blocked');
  perform t.ok((select count(*) from public.notifications where type = 'subscription_expired') = 1, 'expiry notification');
  sub := (public.request_subscription(plan1, 'Click ···4821', sa || '/proof.jpg')).id;
  perform t.fails(format($q$select public.request_subscription(%L)$q$, plan1), 'pending_request_exists');
  perform t.fails(format($q$select public.request_subscription(%L, null, %L)$q$, plan1, sb || '/p.jpg'), 'invalid_attachment_path');
  perform t.as_user(uadm);
  perform t.ok((select count(*) from public.notifications where type = 'subscription_requested') = 1, 'admin notified of payment');
  perform public.admin_confirm_subscription(sub);
  perform t.as_user(ua);
  perform public.create_debt(ca, 2000, public.today_tashkent() + 3);

  -- support chat
  select (public.open_conversation('Obuna haqida', 'Salom, savolim bor')).id into conv;
  perform t.as_user(ub);
  perform t.ok((select count(*) from public.support_conversations) = 0, 'B cannot see A conversation');
  perform t.fails(format($q$insert into public.support_messages(conversation_id, body) values (%L,'hi')$q$, conv), '%row-level security%');
  perform t.fails(format($q$select public.close_conversation(%L)$q$, conv), 'forbidden');
  perform t.as_user(uadm);
  perform t.ok((select count(*) from public.support_conversations) = 1, 'admin sees conversation');
  insert into public.support_messages(conversation_id, body) values (conv, 'Assalomu alaykum!');
  perform t.ok((select sender_role = 'admin' from public.support_messages where body = 'Assalomu alaykum!'), 'role set by server');
  perform t.as_user(ua);
  perform t.ok(public.mark_conversation_read(conv) = 1, 'owner marks admin message read');
  perform t.ok((select count(*) from public.notifications where type = 'support_message') >= 1, 'owner notified of reply');
  insert into public.support_messages(conversation_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
    values (conv, 'chek', sa || '/check.png', 'check.png', 'image/png', 1000);
  perform t.fails(format($q$insert into public.support_messages(conversation_id, body, attachment_path) values (%L,'x','%s/a.png')$q$, conv, sb), 'invalid_attachment_path');
  perform t.fails($$update public.support_messages set body = 'edited'$$, '%permission denied%');
  perform t.as_root();
  perform t.fails(format($q$update public.support_messages set body = 'edited' where conversation_id = %L$q$, conv), 'immutable_record');
  perform t.as_user(uadm); perform public.close_conversation(conv);
  perform t.as_user(ua);
  perform t.fails(format($q$insert into public.support_messages(conversation_id, body) values (%L,'again')$q$, conv), 'conversation_closed');

  -- audit trail
  perform t.as_user(ua);
  perform t.ok((select count(*) from public.audit_logs where store_id = sa and entity_type = 'payments') >= 3, 'payments audited (insert + void)');
  perform t.as_user(uadm);
  perform t.ok((select count(*) from public.audit_logs where actor_id = uadm) >= 3, 'admin actions audited');
  perform t.ok(jsonb_array_length(public.admin_check_store(sa) -> 'admin_actions') >= 2, 'check shows admin history');

  -- stats
  perform t.as_user(ua);
  v := (public.get_store_stats() ->> 'outstanding')::bigint;
  perform t.ok(v = 600000 + 1000 + 2000, 'outstanding = ' || v);
  raise notice 'ALL TESTS PASSED';
end
$test$;
rollback;
