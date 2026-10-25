import { useCallback, useEffect, useState } from 'react';
import { FloorTable, MENU_API_URL, RESERVATION_API_URL, Reservation, request } from './api';

const REFRESH_MS = 5000;

// The host stand: book a party, put a walk-in on the waitlist, seat a party at a table, or cancel.
// Seating a party queues its first kitchen ticket on the server, so the pass sees it without any extra call.
export function HostStand() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [seatTable, setSeatTable] = useState<Record<string, string>>({});
  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState('19:00');
  const [tableId, setTableId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [active, floor] = await Promise.all([
        request<{ data: Reservation[] }>(`${RESERVATION_API_URL}/api/v1/reservations`),
        request<{ data: FloorTable[] }>(`${MENU_API_URL}/api/v1/floor`),
      ]);
      setReservations(active.data.filter((reservation) => reservation.status !== 'CANCELLED'));
      setTables(floor.data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not reach the reservation api');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Run one write, show the api's answer, and reload the list. A failure stays on screen instead of being lost.
  async function act(action: () => Promise<unknown>, done: string): Promise<boolean> {
    let ok = true;
    try {
      await action();
      setMessage(done);
    } catch (err) {
      ok = false;
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
    await refresh();
    return ok;
  }

  const book = () => act(
    () => request(`${RESERVATION_API_URL}/api/v1/reservations`, {
      method: 'POST',
      body: JSON.stringify({ guestName, partySize, time, tableId: tableId || undefined }),
    }),
    `Booked ${guestName}.`,
  ).then((ok) => ok && setGuestName(''));

  const joinWaitlist = () => act(
    () => request(`${RESERVATION_API_URL}/api/v1/waitlist`, {
      method: 'POST',
      body: JSON.stringify({ guestName, partySize }),
    }),
    `${guestName} is on the waitlist.`,
  ).then((ok) => ok && setGuestName(''));

  const seat = (reservation: Reservation) => act(
    () => request(`${RESERVATION_API_URL}/api/v1/reservations/${reservation.id}/seat`, {
      method: 'POST',
      body: JSON.stringify({ tableId: seatTable[reservation.id] || reservation.table || undefined }),
    }),
    `${reservation.guestName} is seated.`,
  );

  const cancel = (reservation: Reservation) => act(
    () => request(`${RESERVATION_API_URL}/api/v1/reservations/${reservation.id}/cancel`, { method: 'POST' }),
    `${reservation.guestName} is cancelled.`,
  );

  return (
    <section id="host-stand" className="host-stand">
      <div className="host-intro">
        <h2>Host stand</h2>
        <p>Every booking, waitlist entry and seating is stored in the restaurant database. Seating queues a kitchen ticket.</p>
      </div>

      <form className="host-form" onSubmit={(event) => { event.preventDefault(); void book(); }}>
        <label>
          Guest name
          <input value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
        </label>
        <label>
          Party size
          <input type="number" min={1} value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} required />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label>
          Table
          <select value={tableId} onChange={(event) => setTableId(event.target.value)}>
            <option value="">Assign later</option>
            {tables.map((table) => <option key={table.id} value={table.id}>{table.id} (seats {table.capacity})</option>)}
          </select>
        </label>
        <div className="host-actions">
          <button type="submit" className="button button-light" disabled={!guestName.trim()}>Book</button>
          <button type="button" className="button button-dark" disabled={!guestName.trim()} onClick={() => void joinWaitlist()}>
            Add to waitlist
          </button>
        </div>
      </form>

      {message && <p className="host-message" role="status">{message}</p>}

      <ul className="host-list" aria-label="Reservations">
        {reservations.map((reservation) => (
          <li className="host-row" key={reservation.id}>
            <div>
              <strong>{reservation.guestName}</strong>
              <span>{reservation.partySize} guests · {reservation.time} · {reservation.table ?? 'no table'}</span>
            </div>
            <span className="host-status">{reservation.status}</span>
            {reservation.status !== 'SEATED' && (
              <>
                <select
                  aria-label={`Table for ${reservation.guestName}`}
                  value={seatTable[reservation.id] ?? reservation.table ?? ''}
                  onChange={(event) => setSeatTable({ ...seatTable, [reservation.id]: event.target.value })}
                >
                  <option value="">Choose a table</option>
                  {tables.map((table) => <option key={table.id} value={table.id}>{table.id}</option>)}
                </select>
                <button type="button" className="button button-light" onClick={() => void seat(reservation)}>Seat</button>
              </>
            )}
            <button type="button" className="button button-dark" onClick={() => void cancel(reservation)}>Cancel</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
