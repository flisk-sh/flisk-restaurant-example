// The kitchen worker polls kitchen_tickets for queued tickets, marks each one done, and logs its aging signal.
// `for update skip locked` lets several workers run without taking the same ticket.
import { SQL } from 'bun';
import { cleanDatabaseUrl } from './db';

type TicketEvent = {
    id: string;
    table: string;
    elapsedMinutes: number;
};

export function scoreTicketAging(event: TicketEvent) {
    const urgency = event.elapsedMinutes >= 14 ? 'EXPEDITE' : event.elapsedMinutes >= 9 ? 'WATCH' : 'NORMAL';
    return { ...event, urgency, scoredAt: new Date().toISOString() };
}

// Flisk provides DATABASE_URL; without it, Bun reads the same variable.
const url = process.env.DATABASE_URL;
const sql = url ? new SQL(cleanDatabaseUrl(url)) : new SQL();

// Claim the oldest queued ticket and mark it done in one statement, so no other worker can take it.
async function claimNextTicket() {
    const [ticket] = await sql`
        update kitchen_tickets
        set status = 'DONE', processed_by = 'kitchen-worker', done_at = now()
        where id = (
            select id from kitchen_tickets where status = 'QUEUED'
            order by created_at, id limit 1 for update skip locked
        )
        returning id, table_id as "table", coalesce(floor(extract(epoch from done_at - created_at) / 60), 0)::int as "elapsedMinutes"`;
    return ticket ?? null;
}

let draining = false;

// Drain every queued ticket on each tick. A failed tick is logged and retried on the next one; the
// api runs the migrations, so the table may not exist for the first few seconds.
async function drain() {
    if (draining) return;
    draining = true;
    try {
        for (let ticket = await claimNextTicket(); ticket; ticket = await claimNextTicket()) {
            console.log('[Kitchen Worker] ticket signal', scoreTicketAging(ticket));
        }
    } catch (err) {
        console.log('[Kitchen Worker] waiting for kitchen_tickets', String(err));
    } finally {
        draining = false;
    }
}

// Flisk health-checks the worker over HTTP on its port, so it answers /health like the other resources.
function serveHealth(port: number) {
    return Bun.serve({
        port,
        async fetch(req) {
            const path = new URL(req.url).pathname;
            if (path === '/health') return Response.json({ status: 'ok', service: 'kitchen-worker', timestamp: new Date().toISOString() });
            if (path === '/health/db') {
                try {
                    await sql`select 1`;
                    return Response.json({ ok: true });
                } catch {
                    return Response.json({ ok: false, error: 'postgres unreachable' }, { status: 503 });
                }
            }
            return new Response('Not found', { status: 404 });
        },
    });
}

if (import.meta.main) {
    const port = Number(process.env.PORT) || 4111;
    serveHealth(port);
    console.log(`[Kitchen Worker] health on ${port}, polling kitchen_tickets every second`);
    setInterval(() => void drain(), 1000);
}
