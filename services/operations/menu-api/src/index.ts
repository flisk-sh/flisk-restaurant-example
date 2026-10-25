// The menu and the floor, read from and written to the restaurant Postgres database.
// The tables are created by restaurant-migrator; this api only reads and writes rows.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SQL } from 'bun';
import { cleanDatabaseUrl } from './db';

// Flisk provides DATABASE_URL; without it, Bun reads the same variable.
const url = process.env.DATABASE_URL;
const sql = url ? new SQL(cleanDatabaseUrl(url)) : new SQL();

const COURSES = ['starters', 'mains', 'desserts', 'drinks'];

type MenuItem = {
  id: string;
  course: string;
  name: string;
  price: number;
  station: string;
  dietary: string[];
  available: boolean;
  remaining: number;
};

type FloorTable = {
  id: string;
  capacity: number;
  server: string;
  status: 'open' | 'seated' | 'hold';
  covers: number;
  turnMinutes: number;
};

const app = new Hono();

// The frontends call this api from another localhost origin during local runs.
app.use('*', cors({ origin: (origin) => (/^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/.test(origin) ? origin : null) }));

// Postgres may be briefly unreachable. Routes answer 503 instead of crashing the process.
app.onError((err, c) => {
  console.error('menu-api:', err);
  return c.json({ error: 'database unavailable' }, 503);
});

const menuItems = (): Promise<MenuItem[]> => sql`
  select id, course, name, price::float8 as price, station, dietary, available, remaining
  from menu_items
  order by array_position(array['starters', 'mains', 'desserts', 'drinks']::text[], course), name`;

// The floor is derived from reservations: a table is seated while a SEATED party sits at it, on hold while a
// CONFIRMED party is booked for it, and open otherwise. Cancelling or seating a reservation changes the floor.
const floorTables = (): Promise<FloorTable[]> => sql`
  select t.id, t.capacity, t.server,
    case when seated.id is not null then 'seated' when hold.id is not null then 'hold' else 'open' end as status,
    coalesce(seated.party_size, 0) as covers,
    coalesce(floor(extract(epoch from now() - seated.created_at) / 60), 0)::int as "turnMinutes"
  from floor_tables t
  left join lateral (
    select r.id, r.party_size, r.created_at from reservations r
    where r.table_id = t.id and r.status = 'SEATED' order by r.created_at limit 1
  ) seated on true
  left join lateral (
    select r.id from reservations r where r.table_id = t.id and r.status = 'CONFIRMED' limit 1
  ) hold on true
  order by t.id`;

app.get('/health', (c) => c.json({ status: 'ok', service: 'menu-api', timestamp: new Date().toISOString() }));

app.get('/health/db', async (c) => {
  try {
    await sql`select 1`;
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: 'postgres unreachable' }, 503);
  }
});

app.get('/api/operations-management', async (c) => {
  const [tables, items] = await Promise.all([floorTables(), menuItems()]);
  return c.json({
    data: {
      service: 'operations-management',
      generatedAt: new Date().toISOString(),
      floor: {
        tables,
        totals: {
          seated: tables.filter((table) => table.status === 'seated').length,
          holds: tables.filter((table) => table.status === 'hold').length,
          covers: tables.reduce((sum, table) => sum + table.covers, 0),
        },
      },
      menu: {
        items,
        unavailable: items.filter((item) => !item.available),
      },
    },
  });
});

app.get('/api/v1/floor', async (c) => c.json({ data: await floorTables() }));

app.get('/api/v1/menu-items', async (c) => c.json({ data: await menuItems() }));

// The menu grouped by course, in the order a guest reads it.
app.get('/api/v1/menu', async (c) => {
  const items = await menuItems();
  return c.json({
    data: COURSES.map((course) => ({
      course,
      items: items.filter((item) => item.course === course),
    })),
  });
});

app.get('/api/v1/eighty-six', async (c) => {
  const items: MenuItem[] = await sql`select id, course, name, price::float8 as price, station, dietary, available, remaining from menu_items where available = false order by name`;
  return c.json({ data: items });
});

// Toggle an item on or off the menu. Sending `available` again is idempotent.
app.patch('/api/v1/menu-items/:id', async (c) => {
  const { available } = await c.req.json<{ available?: unknown }>();
  if (typeof available !== 'boolean') return c.json({ error: 'available must be a boolean' }, 400);
  const [item] = await sql`
    update menu_items set available = ${available} where id = ${c.req.param('id')}
    returning id, course, name, price::float8 as price, station, dietary, available, remaining`;
  return item ? c.json({ data: item }) : c.json({ error: 'not found' }, 404);
});

export default {
  port: Number(process.env.PORT) || 4120,
  fetch: app.fetch,
};
