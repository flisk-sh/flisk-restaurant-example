-- The restaurant tables. All four services share the Flisk_restaurant database.
-- Migrations are idempotent (if not exists), so re-running the migrator against a seeded database is harmless.

create table if not exists menu_items (
  id text primary key,
  course text not null check (course in ('starters', 'mains', 'desserts', 'drinks')),
  name text not null,
  price numeric(8, 2) not null,
  station text not null,
  dietary text[] not null default '{}',
  available boolean not null default true,
  remaining integer not null default 0
);

create table if not exists floor_tables (
  id text primary key,
  capacity integer not null check (capacity > 0),
  server text not null
);

create table if not exists reservations (
  id text primary key,
  guest_name text not null,
  party_size integer not null check (party_size > 0),
  time text not null,
  table_id text references floor_tables (id),
  status text not null check (status in ('CONFIRMED', 'WAITLISTED', 'SEATED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

create table if not exists kitchen_stations (
  name text primary key,
  average_fire_minutes integer not null
);

create table if not exists kitchen_tickets (
  id text primary key,
  reservation_id text not null references reservations (id),
  table_id text references floor_tables (id),
  station text not null references kitchen_stations (name),
  course text not null,
  status text not null check (status in ('QUEUED', 'FIRING', 'PLATING', 'DONE')),
  processed_by text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists reservations_table_status_idx on reservations (table_id, status);
create index if not exists kitchen_tickets_status_idx on kitchen_tickets (status, created_at);
