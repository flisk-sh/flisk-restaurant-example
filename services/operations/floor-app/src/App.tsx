import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MENU_API_URL, MenuItem, OperationsView, RESERVATION_API_URL, request } from './api';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REFRESH_MS = 5000;

const statusLabel = { open: 'Open', seated: 'Seated', hold: 'Hold' } as const;

export function App() {
  const root = useRef<HTMLElement>(null);
  const [view, setView] = useState<OperationsView | null>(null);
  const [waitlisted, setWaitlisted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // The floor and the menu come from menu-api. The waitlist count is a separate read, so a reservation api
  // that is down leaves the floor on screen with the count blank.
  const refresh = useCallback(async () => {
    try {
      const operations = await request<{ data: OperationsView }>(`${MENU_API_URL}/api/operations-management`);
      setView(operations.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach menu-api');
    }
    try {
      const guests = await request<{ data: { summary: { waitlisted: number } } }>(`${RESERVATION_API_URL}/api/guest-management`);
      setWaitlisted(guests.data.summary.waitlisted);
    } catch {
      setWaitlisted(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useGSAP(
    () => {
      if (!view) return;
      gsap.from('.floor-tile', { y: 32, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' });
      gsap.to('.reveal-word', {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: { trigger: '.word-reveal', start: 'top 72%', end: 'bottom 38%', scrub: true },
      });
    },
    { scope: root, dependencies: [view !== null] },
  );

  // Toggle an item on or off the menu, then reload so the floor and the 86 list agree with the database.
  async function toggle(item: MenuItem) {
    setBusy(item.id);
    try {
      await request(`${MENU_API_URL}/api/v1/menu-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !item.available }),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the menu');
    } finally {
      setBusy(null);
    }
    await refresh();
  }

  const tables = view?.floor.tables ?? [];
  const items = view?.menu.items ?? [];
  const courses = [...new Set(items.map((item) => item.course))];

  return (
    <main ref={root} className="floor-shell">
      <nav className="floor-nav">
        <strong>Floor Ops</strong>
        <a href="https://github.com/flisk-sh/flisk">Flisk CLI</a>
      </nav>
      <section className="floor-hero">
        <h1>Every table, ticket, and 86 in one operating view.</h1>
        <p>
          {view
            ? `${view.floor.totals.seated} seated, ${view.floor.totals.holds} on hold, ${view.floor.totals.covers} covers on the floor${waitlisted === null ? '' : `, ${waitlisted} waiting`}.`
            : 'Connecting to the operations stack…'}
        </p>
        {error && <p role="alert" className="floor-error">{error}</p>}
      </section>

      <section className="floor-grid" aria-label="Floor status">
        {tables.map((table) => (
          <article className="floor-tile" key={table.id}>
            <span>{table.id}</span>
            <strong>{statusLabel[table.status]}</strong>
            <small>
              {table.server} · seats {table.capacity}
              {table.status === 'seated' ? ` · ${table.covers} covers · ${table.turnMinutes} min` : ''}
            </small>
          </article>
        ))}
      </section>

      <section className="menu-availability" aria-label="Menu availability">
        <h2>Menu availability</h2>
        {courses.map((course) => (
          <div className="menu-course" key={course}>
            <h3>{course}</h3>
            <ul>
              {items.filter((item) => item.course === course).map((item) => (
                <li key={item.id} className={item.available ? '' : 'is-86'}>
                  <span>{item.name}</span>
                  <span>{item.available ? `${item.remaining} left` : '86'}</span>
                  <button type="button" disabled={busy === item.id} onClick={() => void toggle(item)}>
                    {item.available ? '86 it' : 'Back on'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="word-reveal">
        {'Menu availability and reservation state should move together without forcing every service into one deployable unit.'.split(' ').map((word) => (
          <span className="reveal-word" key={word}>{word} </span>
        ))}
      </section>
    </main>
  );
}
