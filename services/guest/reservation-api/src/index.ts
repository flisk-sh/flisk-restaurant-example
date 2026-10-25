// Reservations, the waitlist and table holds, read from and written to the restaurant Postgres database.
// The tables are created by restaurant-migrator. Seating a party also queues its first kitchen ticket.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SQL } from 'bun';
import { cleanDatabaseUrl } from './db';

// Flisk provides DATABASE_URL; without it, Bun reads the same variable.
const url = process.env.DATABASE_URL;
const sql = url ? new SQL(cleanDatabaseUrl(url)) : new SQL();

const STATUSES = ['CONFIRMED', 'WAITLISTED', 'SEATED', 'CANCELLED'] as const;
type Status = (typeof STATUSES)[number];

type Reservation = {
  id: string;
  guestName: string;
  partySize: number;
  time: string;
  table: string | null;
  status: Status;
};

const app = new Hono();

// The frontends call this api from another localhost origin during local runs.
app.use('*', cors({ origin: (origin) => (/^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/.test(origin) ? origin : null) }));

// Postgres may be briefly unreachable. Routes answer 503 instead of crashing the process.
app.onError((err, c) => {
  console.error('reservation-api:', err);
  return c.json({ error: 'database unavailable' }, 503);
});

const reservationColumns = sql`id, guest_name as "guestName", party_size as "partySize", time, table_id as "table", status`;

const reservations = (status?: Status): Promise<Reservation[]> => status
  ? sql`select ${reservationColumns} from reservations where status = ${status} order by created_at, id`
  : sql`select ${reservationColumns} from reservations where status <> 'CANCELLED' order by created_at, id`;

const findReservation = async (id: string): Promise<Reservation | null> => {
  const [reservation]: Reservation[] = await sql`select ${reservationColumns} from reservations where id = ${id}`;
  return reservation ?? null;
};

// Ids are short and readable. The random suffix keeps two rows created in the same second apart.
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

type NewParty = { guestName?: unknown; partySize?: unknown; time?: unknown; tableId?: unknown };

// Validate a party from a request body. Returns an error message, or null when it is usable.
function partyError(body: NewParty): string | null {
  if (typeof body.guestName !== 'string' || !body.guestName.trim()) return 'guestName is required';
  if (!Number.isInteger(body.partySize) || (body.partySize as number) < 1) return 'partySize must be a positive integer';
  return null;
}

app.get('/health', (c) => c.json({ status: 'ok', service: 'reservation-api', timestamp: new Date().toISOString() }));

app.get('/health/db', async (c) => {
  try {
    await sql`select 1`;
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: 'postgres unreachable' }, 503);
  }
});

app.get('/api/guest-management', async (c) => {
  const all = await reservations();
  const [counts] = await sql`
    select count(*)::int as reservations,
      count(*) filter (where status = 'SEATED')::int as seated,
      count(*) filter (where status = 'CONFIRMED')::int as confirmed,
      count(*) filter (where status = 'WAITLISTED')::int as waitlisted,
      coalesce(sum(party_size) filter (where status <> 'CANCELLED'), 0)::int as covers
    from reservations where status <> 'CANCELLED'`;
  return c.json({
    data: {
      service: 'guest-management',
      generatedAt: new Date().toISOString(),
      reservations: all,
      waitlist: all.filter((reservation) => reservation.status === 'WAITLISTED'),
      summary: counts,
    },
  });
});

app.get('/api/v1/reservations', async (c) => {
  const status = c.req.query('status');
  if (status && !STATUSES.includes(status as Status)) return c.json({ error: 'unknown status' }, 400);
  const rows = await reservations(status as Status | undefined);
  return c.json({ data: rows, total: rows.length, serviceWindow: 'dinner' });
});

app.post('/api/v1/reservations', async (c) => {
  const body = await c.req.json<NewParty>();
  const error = partyError(body);
  if (error) return c.json({ error }, 400);
  const time = typeof body.time === 'string' && /^\d{2}:\d{2}$/.test(body.time) ? body.time : '19:00';
  const tableId = typeof body.tableId === 'string' ? body.tableId : null;
  if (tableId && !(await tableExists(tableId))) return c.json({ error: 'unknown table' }, 400);
  const [row] = await sql`
    insert into reservations (id, guest_name, party_size, time, table_id, status)
    values (${newId('res')}, ${(body.guestName as string).trim()}, ${body.partySize as number}, ${time}, ${tableId}, 'CONFIRMED')
    returning ${reservationColumns}`;
  return c.json({ data: row }, 201);
});

app.get('/api/v1/waitlist', async (c) => {
  const rows = await reservations('WAITLISTED');
  return c.json({ data: rows, quotedMinutes: 18 });
});

app.post('/api/v1/waitlist', async (c) => {
  const body = await c.req.json<NewParty>();
  const error = partyError(body);
  if (error) return c.json({ error }, 400);
  const [row] = await sql`
    insert into reservations (id, guest_name, party_size, time, status)
    values (${newId('res')}, ${(body.guestName as string).trim()}, ${body.partySize as number}, 'walk-in', 'WAITLISTED')
    returning ${reservationColumns}`;
  return c.json({ data: row }, 201);
});

app.post('/api/v1/reservations/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const current = await findReservation(id);
  if (!current) return c.json({ error: 'not found' }, 404);
  if (current.status === 'SEATED') return c.json({ error: 'a seated party cannot be cancelled' }, 409);
  if (current.status === 'CANCELLED') return c.json({ data: current });
  const [row] = await sql`update reservations set status = 'CANCELLED' where id = ${id} returning ${reservationColumns}`;
  return c.json({ data: row });
});

// Seat a party: the reservation becomes SEATED, its table is taken, and a kitchen ticket is queued for the pass.
// The table comes from the request, or from the reservation when it already has one.
app.post('/api/v1/reservations/:id/seat', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ tableId?: unknown }>().catch(() => ({}) as { tableId?: unknown });
  const requestedTable = typeof body.tableId === 'string' ? body.tableId : null;

  const result = await sql.begin(async (tx) => {
    const [current] = await tx`select ${reservationColumns} from reservations where id = ${id} for update`;
    if (!current) return { status: 404, body: { error: 'not found' } };
    if (current.status !== 'CONFIRMED' && current.status !== 'WAITLISTED') {
      return { status: 409, body: { error: `a ${current.status.toLowerCase()} party cannot be seated` } };
    }
    const tableId = requestedTable ?? current.table;
    if (!tableId) return { status: 409, body: { error: 'a table is required to seat this party' } };

    const [table] = await tx`select id from floor_tables where id = ${tableId} for update`;
    if (!table) return { status: 400, body: { error: 'unknown table' } };
    const [occupant] = await tx`select id from reservations where table_id = ${tableId} and status = 'SEATED' limit 1`;
    if (occupant) return { status: 409, body: { error: `table ${tableId} is already seated` } };

    const [seated] = await tx`
      update reservations set status = 'SEATED', table_id = ${tableId} where id = ${id}
      returning ${reservationColumns}`;
    const [ticket] = await tx`
      insert into kitchen_tickets (id, reservation_id, table_id, station, course, status)
      values (${newId('tkt')}, ${id}, ${tableId}, 'garde-manger', 'starters', 'QUEUED')
      returning id, table_id as "table", station, course, status, 0::int as "elapsedMinutes"`;
    return { status: 200, body: { data: seated, ticket } };
  });

  return c.json(result.body, result.status as 200);
});

async function tableExists(id: string) {
  const [table] = await sql`select id from floor_tables where id = ${id}`;
  return Boolean(table);
}

export default {
  port: Number(process.env.PORT) || 4100,
  fetch: app.fetch,
};
