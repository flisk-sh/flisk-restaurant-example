import { expect, test } from 'bun:test';
import { SQL } from 'bun';
import { cleanDatabaseUrl } from '../src/db';

const databaseUrl = process.env.KITCHEN_TEST_DATABASE_URL;

// Point KITCHEN_TEST_DATABASE_URL at a disposable database with the restaurant migration applied.
test.skipIf(!databaseUrl)('retrying DONE preserves the ticket completion time', async () => {
  const id = `test_${crypto.randomUUID()}`;
  const sql = new SQL(cleanDatabaseUrl(databaseUrl!));
  try {
    await sql.begin(async (tx) => {
      await tx`insert into reservations (id, guest_name, party_size, time, status)
        values (${id}, 'Test', 1, '18:00', 'SEATED')`;
      await tx`insert into kitchen_stations (name, average_fire_minutes) values (${id}, 5)`;
      await tx`insert into kitchen_tickets
        (id, reservation_id, station, course, status, created_at, done_at)
        values (${id}, ${id}, ${id}, 'mains', 'DONE',
          '2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z')`;
    });

    const originalUrl = process.env.DATABASE_URL;
    const { default: app } = await (async () => {
      try {
        process.env.DATABASE_URL = databaseUrl;
        return await import('../src/index');
      } finally {
        if (originalUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = originalUrl;
      }
    })();
    const url = `http://localhost/api/v1/tickets/${id}`;
    const patchStatus = (status: string) => app.fetch(new Request(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }));
    const result = await patchStatus('DONE');
    expect(result.status).toBe(200);
    expect((await result.json()).data.elapsedMinutes).toBe(5);

    // A reopened ticket gets a new finish time the next time it is marked done.
    expect((await patchStatus('PLATING')).status).toBe(200);
    const [reopened] = await sql<{ done_at: Date | null }[]>`select done_at from kitchen_tickets where id = ${id}`;
    expect(reopened.done_at).toBeNull();
    expect((await patchStatus('DONE')).status).toBe(200);
    const [finished] = await sql<{ done_at: Date }[]>`select done_at from kitchen_tickets where id = ${id}`;
    expect(finished.done_at.getTime()).toBeGreaterThan(Date.parse('2026-01-01T00:05:00Z'));
  } finally {
    try {
      await sql.begin(async (tx) => {
        await tx`delete from kitchen_tickets where id = ${id}`;
        await tx`delete from kitchen_stations where name = ${id}`;
        await tx`delete from reservations where id = ${id}`;
      });
    } finally {
      await sql.close();
    }
  }
});
