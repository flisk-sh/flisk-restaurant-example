import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const tables = ['A1', 'A2', 'B7', 'B8', 'Rail', 'PDR'];

export function App() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.floor-tile', { y: 32, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' });
      gsap.to('.reveal-word', {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: { trigger: '.word-reveal', start: 'top 72%', end: 'bottom 38%', scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <main ref={root} className="floor-shell">
      <nav className="floor-nav">
        <strong>Floor Ops</strong>
        <a href="https://github.com/flisk-sh/flisk">TDK CLI</a>
      </nav>
      <section className="floor-hero">
        <h1>Every table, ticket, and 86 in one operating view.</h1>
        <p>Operations stack resources consume menu and reservation signals while staying independently runnable.</p>
      </section>
      <section className="floor-grid" aria-label="Floor status">
        {tables.map((table, index) => (
          <article className="floor-tile" key={table}>
            <span>{table}</span>
            <strong>{index % 3 === 0 ? 'Seated' : index % 3 === 1 ? 'Reset' : 'Hold'}</strong>
          </article>
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
