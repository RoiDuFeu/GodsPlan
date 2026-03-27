import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LightRays from '@/components/ui/LightRays/LightRays';


/* ------------------------------------------------------------------ */
/*  Scroll-driven reveal                                               */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('landed');
        }),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ------------------------------------------------------------------ */
/*  Smooth scrollY                                                     */
/* ------------------------------------------------------------------ */
function useScrollY() {
  const [y, setY] = useState(0);
  const ticking = useRef(false);
  const onScroll = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      requestAnimationFrame(() => {
        setY(window.scrollY);
        ticking.current = false;
      });
    }
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);
  return y;
}

/* ------------------------------------------------------------------ */
/*  Number counter animation                                           */
/* ------------------------------------------------------------------ */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          let start = 0;
          const duration = 1800;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            start = Math.round(ease * target);
            el.textContent = start.toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ================================================================== */
/*  LANDING PAGE                                                       */
/* ================================================================== */
export function LandingPage() {
  const pageRef = useReveal();
  const scrollY = useScrollY();

  return (
    <div ref={pageRef} className="bg-background text-foreground overflow-x-hidden">

      {/* ============================================================ */}
      {/*  S1 — Hero: "All ways lead to God"                           */}
      {/* ============================================================ */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">

        <div className="absolute inset-0">
          <LightRays
            raysOrigin="top-center"
            raysColor="#d4af37"
            raysSpeed={0.8}
            lightSpread={0.6}
            rayLength={3}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
            pulsating={false}
            fadeDistance={1}
            saturation={1}
          />
        </div>

        {/* Centered type */}
        <div
          className="relative z-10 text-center px-6 pointer-events-none select-none"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <p
            data-reveal
            className="
              text-[0.7rem] tracking-[0.45em] uppercase text-muted-foreground mb-6
              opacity-0 translate-y-4 transition-all duration-700 delay-300
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            GodsPlan
          </p>
          <h1
            data-reveal
            className="
              font-headline font-extralight text-[clamp(2.2rem,7vw,5.5rem)] leading-[1.05] tracking-tight
              opacity-0 translate-y-6 transition-all duration-1000 delay-500
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            All ways lead<br />
            <span className="text-primary font-light">to God</span>
          </h1>
          <p
            data-reveal
            className="
              mt-8 text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed
              opacity-0 translate-y-4 transition-all duration-700 delay-700
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            Find the church around you. Any city, any time.
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          data-reveal
          className="
            absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2
            opacity-0 transition-all duration-700 delay-[1.2s]
            [&.landed]:opacity-100
          "
        >
          <span className="text-[0.6rem] tracking-[0.3em] uppercase text-muted-foreground/50">
            Scroll
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/30 to-transparent overflow-hidden">
            <div className="w-full h-3 bg-primary/50 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  S2 — "Never miss a Sunday Mass again"                       */}
      {/* ============================================================ */}
      <section className="relative py-40 px-6 overflow-hidden">


        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            {/* Left — statement */}
            <div>
              <h2
                data-reveal
                className="
                  font-headline font-extralight text-[clamp(1.8rem,4.5vw,3.5rem)] leading-[1.1] tracking-tight
                  opacity-0 translate-y-8 transition-all duration-1000
                  [&.landed]:opacity-100 [&.landed]:translate-y-0
                "
              >
                Never miss a<br />
                <span className="text-primary font-light">Sunday Mass</span><br />
                again
              </h2>
              <div
                data-reveal
                className="
                  mt-10 space-y-5
                  opacity-0 translate-y-6 transition-all duration-700 delay-300
                  [&.landed]:opacity-100 [&.landed]:translate-y-0
                "
              >
                {[
                  { icon: '&#xe55e;', text: 'Churches near you, mapped in real time' },
                  { icon: '&#xe8b5;', text: 'Mass schedules updated weekly' },
                  { icon: '&#xe7f4;', text: 'Save your favorites, get reminders' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <span
                      className="material-symbols-outlined text-primary/60 text-lg mt-0.5 transition-colors group-hover:text-primary"
                      dangerouslySetInnerHTML={{ __html: item.icon }}
                    />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
              <div
                data-reveal
                className="
                  mt-12
                  opacity-0 translate-y-4 transition-all duration-700 delay-500
                  [&.landed]:opacity-100 [&.landed]:translate-y-0
                "
              >
                <Link
                  to="/register"
                  className="
                    inline-flex items-center gap-2 px-7 py-3 text-sm tracking-wide
                    bg-primary text-primary-foreground rounded-full
                    hover:brightness-110 transition-all duration-300
                  "
                >
                  Get started
                  <span className="material-symbols-outlined text-base">&#xe5c8;</span>
                </Link>
              </div>
            </div>

            {/* Right — abstract visual */}
            <div
              data-reveal
              className="
                relative aspect-square
                opacity-0 scale-95 transition-all duration-1000 delay-200
                [&.landed]:opacity-100 [&.landed]:scale-100
              "
            >
              {/* Concentric rings */}
              {[1, 2, 3, 4].map((ring) => (
                <div
                  key={ring}
                  className="absolute inset-0 rounded-full border border-primary/[0.12]"
                  style={{
                    inset: `${ring * 12}%`,
                    animation: `spin ${20 + ring * 8}s linear infinite${ring % 2 ? ' reverse' : ''}`,
                  }}
                >
                  {/* Dot on the ring */}
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/50"
                    style={{ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              ))}
              {/* Center cross */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-12 h-12">
                  <div className="absolute left-1/2 top-0 w-px h-full bg-primary/30 -translate-x-1/2" />
                  <div className="absolute top-1/2 left-0 h-px w-full bg-primary/30 -translate-y-1/2" />
                  <div className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-primary/60 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  S3 — Community / Numbers                                    */}
      {/* ============================================================ */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Horizontal rule accent */}
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="max-w-5xl mx-auto text-center">
          <p
            data-reveal
            className="
              text-[0.65rem] tracking-[0.5em] uppercase text-primary/60 mb-6
              opacity-0 transition-all duration-700
              [&.landed]:opacity-100
            "
          >
            Built for believers
          </p>
          <h2
            data-reveal
            className="
              font-headline font-extralight text-[clamp(1.6rem,3.5vw,2.8rem)] leading-[1.15] tracking-tight
              max-w-2xl mx-auto
              opacity-0 translate-y-8 transition-all duration-1000 delay-200
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            A quiet tool for a<br />
            <span className="text-primary font-light">faithful life</span>
          </h2>

          {/* Stats row */}
          <div
            data-reveal
            className="
              mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto
              opacity-0 translate-y-6 transition-all duration-700 delay-400
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            {[
              { n: 12000, suffix: '+', label: 'Churches indexed' },
              { n: 50, suffix: '+', label: 'Cities covered' },
              { n: 98, suffix: '%', label: 'Schedule accuracy' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="font-headline font-extralight text-[clamp(1.8rem,4vw,3rem)] text-primary">
                  <Counter target={stat.n} suffix={stat.suffix} />
                </span>
                <span className="text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground/60">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            data-reveal
            className="
              mt-20
              opacity-0 translate-y-4 transition-all duration-700 delay-500
              [&.landed]:opacity-100 [&.landed]:translate-y-0
            "
          >
            <Link
              to="/login"
              className="
                inline-flex items-center gap-3 text-sm text-muted-foreground
                hover:text-primary transition-colors duration-300 group
              "
            >
              <span className="tracking-wide">Explore the map</span>
              <span
                className="
                  inline-block w-8 h-px bg-current
                  transition-all duration-300 group-hover:w-12
                "
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Footer                                                       */}
      {/* ============================================================ */}
      <footer className="relative py-12 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground/40">
            &copy; 2026 GodsPlan. Made with faith.
          </span>
          <div className="flex gap-6">
            <Link to="/login" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors">
              Join
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
