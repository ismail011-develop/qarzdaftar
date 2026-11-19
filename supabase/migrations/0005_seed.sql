-- =====================================================================
-- QarzDaftar | 0005_seed.sql | default tariffs (admin can change them later)
-- =====================================================================
insert into public.subscription_plans (code, name, duration_months, price_uzs, sort_order) values
  ('month_1', '1 oy',  1, 60000, 1),
  ('month_2', '2 oy',  2, 85000, 2)
on conflict (code) do nothing;
