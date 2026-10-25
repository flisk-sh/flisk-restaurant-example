import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HostStand } from './HostStand';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const images = [
  'https://picsum.photos/seed/restaurant-table-service/1200/900',
  'https://picsum.photos/seed/chef-pass-evening/1200/900',
  'https://picsum.photos/seed/private-dining-room/1200/900',
];

export function App() {
  const root = useRef<HTMLElement>(null);
  const pinTitle = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.hero-copy > *', { y: 42, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out' });

      ScrollTrigger.create({
        trigger: '.service-board',
        start: 'top top+=120',
        end: 'bottom bottom-=180',
        pin: pinTitle.current,
        pinSpacing: false,
      });

      gsap.utils.toArray<HTMLElement>('.motion-image').forEach((image) => {
        gsap.fromTo(
          image,
          { scale: 0.82, opacity: 0.52, filter: 'grayscale(1) contrast(1.2)' },
          {
            scale: 1,
            opacity: 1,
            filter: 'grayscale(0.25) contrast(1.15)',
            ease: 'none',
            scrollTrigger: {
              trigger: image,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <main ref={root} className="page-shell">
      <nav className="nav-shell" aria-label="Restaurant example navigation">
        <a href="#top" className="brand">TDK Restaurant</a>
        <div className="nav-links">
          <a href="#guest">Guest</a>
          <a href="#kitchen">Kitchen</a>
          <a href="#ops">Ops</a>
        </div>
        <a href="#book" className="nav-action">Run stack</a>
      </nav>

      <section id="top" className="hero-section">
        <div className="hero-art" style={{ backgroundImage: `url(${images[0]})` }} />
        <div className="hero-copy">
          <h1>Run the host stand, kitchen pass, and floor from one TDK landscape.</h1>
          <p>Reservations, table holds, ticket pacing, and menu availability become small resources with explicit manifests.</p>
          <div className="hero-actions">
            <a href="#book" className="button button-light">Open reservation flow</a>
            <a href="#guest" className="button button-dark">Inspect resources</a>
          </div>
        </div>
      </section>

      <section id="guest" className="bento-section">
        <div className="bento-intro">
          <h2>One dining room, six runnable resources.</h2>
          <p>Each card maps to a manifest-driven resource that TDK can discover, generate, and run independently.</p>
        </div>
        <div className="bento-grid">
          <article className="bento-card bento-large group-card">
            <div className="card-image" style={{ backgroundImage: `url(${images[1]})` }} />
            <h3>Guest flow</h3>
            <p>Reservation API and host app coordinate waitlist timing, table status, and next-best seating.</p>
          </article>
          <article className="bento-card group-card">
            <h3>Kitchen pass</h3>
            <p>Ticket queues, station load, and course-fire signals live behind the kitchen stack.</p>
          </article>
          <article className="bento-card group-card">
            <h3>Floor control</h3>
            <p>Menu 86s and table readiness feed a manager view built for a live dinner service.</p>
          </article>
        </div>
      </section>

      <section id="kitchen" className="service-board">
        <div ref={pinTitle} className="pinned-title">
          <h2>Service rhythm stays visible.</h2>
          <p>Scroll through the operating surfaces while the core story stays pinned in view.</p>
        </div>
        <div className="service-lane">
          {['Reservation intake', 'Kitchen ticket aging', 'Menu availability'].map((title, index) => (
            <article className="service-panel" key={title}>
              <div className="motion-image" style={{ backgroundImage: `url(${images[index]})` }} />
              <h3>{title}</h3>
              <p>{['A host sees party size, table fit, and wait quote before the rush spikes.', 'A worker checks aging tickets and sends pacing signals before the pass backs up.', 'Managers see item availability and floor readiness without coupling every service.'][index]}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ops" className="accordion-section">
        <h2>Restaurant domains expand only when needed.</h2>
        <div className="accordion-row">
          {['Guest', 'Kitchen', 'Operations'].map((domain) => (
            <article className="accordion-card" key={domain}>
              <span>{domain}</span>
              <p>{domain === 'Guest' ? 'Reservations and waitlist' : domain === 'Kitchen' ? 'Tickets and stations' : 'Menus and floor state'}</p>
            </article>
          ))}
        </div>
      </section>

      <HostStand />

      <section id="book" className="cta-section">
        <div className="marquee" aria-hidden="true">
          <span>service.json</span><span>tdk up guest</span><span>Hono</span><span>Vite</span><span>Bun</span><span>Tilt</span>
        </div>
        <h2>Clone it before dinner service.</h2>
        <a href="https://github.com/flisk-sh/flisk" className="button button-light">Install TDK CLI</a>
      </section>
    </main>
  );
}
