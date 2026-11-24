import { expect, test } from 'bun:test';
import server from './index';

for (const route of ['reservations', 'waitlist']) {
  async function submit(body: string) {
    return server.fetch(new Request(`http://localhost/api/v1/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }));
  }

  for (const [label, body] of [
    ['malformed JSON', '{"guestName":'],
    ['null', 'null'],
    ['an array', '[]'],
    ['a number', '42'],
  ]) {
    test(`${route} rejects ${label}`, async () => {
      const response = await submit(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'expected a JSON object' });
    });
  }

  test(`${route} still validates party fields in a JSON object`, async () => {
    const response = await submit('{"guestName":"Guest","partySize":0}');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'partySize must be a positive integer' });
  });
}
