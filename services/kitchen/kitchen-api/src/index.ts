// Kitchen tickets and stations, read from and written to the restaurant Postgres database.
// The tables are created by restaurant-migrator. Reservation-api queues a ticket when a party seats; the
// kitchen-worker marks queued tickets done; this api moves tickets through the pass by status.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SQL } from 'bun';
import { cleanDatabaseUrl } from './db';

// Flisk provides DATABASE_URL; without it, Bun reads the same variable.
const url = process.env.DATABASE_URL;
const sql = url ? new SQL(cleanDatabaseUrl(url)) : new SQL();

const TICKET_STATUSES = ['QUEUED', 'FIRING', 'PLATING', 'DONE'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

type Ticket = {
  id: string;
  table: string | null;
  station: string;
  course: string;
  status: TicketStatus;
  reservationId: string;
  elapsedMinutes: number;
};

type Station = { name: string; averageFireMinutes: number; openTickets: number };

const app = new Hono();

// The frontends call this api from another localhost origin during local runs.
app.use('*', cors({ origin: (origin) => (/^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/.test(origin) ? origin : null) }));

// Postgres may be briefly unreachable. Routes answer 503 instead of crashing the process.
app.onError((err, c) => {
  console.error('kitchen-api:', err);
  return c.json({ error: 'database unavailable' }, 503);
});

// Elapsed time is measured from the ticket's creation to now, or to when it was marked done.
const ticketColumns = sql`
  id, table_id as "table", station, course, status, reservation_id as "reservationId",
  coalesce(floor(extract(epoch from coalesce(done_at, now()) - created_at) / 60), 0)::int as "elapsedMinutes"`;

const tickets = (status?: TicketStatus): Promise<Ticket[]> => status
  ? sql`select ${ticketColumns} from kitchen_tickets where status = ${status} order by created_at, id`
  : sql`select ${ticketColumns} from kitchen_tickets where status <> 'DONE' order by created_at, id`;

const stations = (): Promise<Station[]> => sql`
  select s.name, s.average_fire_minutes as "averageFireMinutes",
    count(t.id) filter (where t.status <> 'DONE')::int as "openTickets"
  from kitchen_stations s
  left join kitchen_tickets t on t.station = s.name
  group by s.name, s.average_fire_minutes
  order by s.name`;

app.get('/health', (c) => c.json({ status: 'ok', service: 'kitchen-api', timestamp: new Date().toISOString() }));

app.get('/health/db', async (c) => {
  try {
    await sql`select 1`;
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: 'postgres unreachable' }, 503);
  }
});

app.get('/api/kitchen-management', async (c) => {
  const open = await tickets();
  const [stationRows, summary] = await Promise.all([
    stations(),
    sql`select coalesce(round(avg(elapsed)), 0)::int as "averageElapsedMinutes" from (
      select extract(epoch from now() - created_at) / 60 as elapsed from kitchen_tickets where status <> 'DONE'
    ) open_tickets`,
  ]);
  return c.json({
    data: {
      service: 'kitchen-management',
      generatedAt: new Date().toISOString(),
      tickets: open,
      stations: stationRows,
      summary: {
        openTickets: open.length,
        firing: open.filter((ticket) => ticket.status === 'FIRING').length,
        plating: open.filter((ticket) => ticket.status === 'PLATING').length,
        queued: open.filter((ticket) => ticket.status === 'QUEUED').length,
        averageElapsedMinutes: summary[0]?.averageElapsedMinutes ?? 0,
      },
    },
  });
});

// Open tickets by default. Pass ?status=DONE to see what has left the pass.
app.get('/api/v1/tickets', async (c) => {
  const status = c.req.query('status');
  if (status && !TICKET_STATUSES.includes(status as TicketStatus)) return c.json({ error: 'unknown status' }, 400);
  const rows = await tickets(status as TicketStatus | undefined);
  return c.json({ data: rows, total: rows.length });
});

app.patch('/api/v1/tickets/:id', async (c) => {
  const { status } = await c.req.json<{ status?: unknown }>();
  if (!TICKET_STATUSES.includes(status as TicketStatus)) {
    return c.json({ error: `status must be one of ${TICKET_STATUSES.join(', ')}` }, 400);
  }
  const [ticket] = await sql`
    update kitchen_tickets
    set status = ${status as TicketStatus},
      done_at = case when ${status} = 'DONE' then now() else null end
    where id = ${c.req.param('id')}
    returning ${ticketColumns}`;
  return ticket ? c.json({ data: ticket }) : c.json({ error: 'not found' }, 404);
});

app.get('/api/v1/tickets/:id', async (c) => {
  const [ticket] = await sql`select ${ticketColumns} from kitchen_tickets where id = ${c.req.param('id')}`;
  return ticket ? c.json({ data: ticket }) : c.json({ error: 'not found' }, 404);
});

app.get('/api/v1/stations', async (c) => c.json({ data: await stations() }));

export default {
  port: Number(process.env.PORT) || 4110,
  fetch: app.fetch,
};
