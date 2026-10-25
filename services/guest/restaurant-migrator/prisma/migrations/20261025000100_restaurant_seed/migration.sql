-- Seed data with fixed ids. Every insert is `on conflict do nothing`, so this migration can be re-applied
-- and an operator's edits to a row survive it.

insert into menu_items (id, course, name, price, station, dietary, available, remaining) values
  ('st_01', 'starters', 'Burrata with charred peaches', 12.50, 'garde-manger', '{vegetarian}', true, 24),
  ('st_02', 'starters', 'Crispy squid, lime and chili', 11.00, 'fry', '{gluten-free}', true, 30),
  ('st_03', 'starters', 'Smoked beetroot tartare', 10.50, 'garde-manger', '{vegan}', true, 16),
  ('mn_01', 'mains', 'Coal-roasted carrots', 18.00, 'grill', '{vegan}', true, 18),
  ('mn_02', 'mains', 'Dry-aged ribeye 300g', 46.00, 'grill', '{}', true, 7),
  ('mn_03', 'mains', 'Pan-seared sea bass', 32.00, 'saute', '{gluten-free}', true, 12),
  ('mn_04', 'mains', 'Wild mushroom risotto', 24.00, 'saute', '{vegetarian}', true, 14),
  ('ds_01', 'desserts', 'Lemon posset', 9.00, 'pastry', '{vegetarian,gluten-free}', false, 0),
  ('ds_02', 'desserts', 'Dark chocolate fondant', 10.00, 'pastry', '{vegetarian}', true, 9),
  ('dr_01', 'drinks', 'House lemonade', 4.50, 'bar', '{vegan}', true, 60),
  ('dr_02', 'drinks', 'Natural wine by the glass', 9.00, 'bar', '{}', true, 40)
on conflict (id) do nothing;

insert into floor_tables (id, capacity, server) values
  ('A1', 2, 'Mina'),
  ('A2', 2, 'Mina'),
  ('B7', 4, 'Jonah'),
  ('B8', 4, 'Jonah'),
  ('Rail', 5, 'Ari'),
  ('PDR', 8, 'Nora')
on conflict (id) do nothing;

insert into reservations (id, guest_name, party_size, time, table_id, status, created_at) values
  ('res_710', 'Mira Patel', 4, '19:00', 'B7', 'CONFIRMED', now()),
  ('res_711', 'Jon Bell', 2, '19:15', 'A1', 'SEATED', now() - interval '11 minutes'),
  ('res_712', 'Ada Marin', 6, '19:45', null, 'WAITLISTED', now() - interval '4 minutes'),
  ('res_713', 'Sam Okafor', 8, '20:00', 'PDR', 'CONFIRMED', now()),
  ('res_714', 'Lena Park', 3, '18:30', 'B8', 'SEATED', now() - interval '67 minutes'),
  ('res_715', 'Tomas Ruiz', 5, '18:45', 'Rail', 'SEATED', now() - interval '28 minutes')
on conflict (id) do nothing;

insert into kitchen_stations (name, average_fire_minutes) values
  ('grill', 14),
  ('garde-manger', 7),
  ('pastry', 9),
  ('fry', 6),
  ('saute', 10),
  ('bar', 3)
on conflict (name) do nothing;

insert into kitchen_tickets (id, reservation_id, table_id, station, course, status, created_at) values
  ('tkt_301', 'res_711', 'A1', 'grill', 'mains', 'FIRING', now() - interval '11 minutes'),
  ('tkt_302', 'res_714', 'B8', 'garde-manger', 'starters', 'PLATING', now() - interval '5 minutes'),
  ('tkt_303', 'res_715', 'Rail', 'pastry', 'desserts', 'QUEUED', now() - interval '2 minutes')
on conflict (id) do nothing;
