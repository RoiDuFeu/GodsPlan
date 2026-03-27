import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Reveal-on-scroll (one-shot, for text elements)                     */
/* ------------------------------------------------------------------ */
function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ------------------------------------------------------------------ */
/*  Smooth scrollY via rAF                                             */
/* ------------------------------------------------------------------ */
function useScrollY() {
  const [y, setY] = useState(0);
  const ticking = useRef(false);
  const onScroll = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      requestAnimationFrame(() => { setY(window.scrollY); ticking.current = false; });
    }
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);
  return y;
}

/* ------------------------------------------------------------------ */
/*  Gate section progress (same as before)                             */
/* ------------------------------------------------------------------ */
function useGateProgress() {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const wh = window.innerHeight;
      const stickyTravel = Math.max(rect.height - wh, 1);
      const raw = -rect.top / stickyTravel;
      setProgress(Math.max(-0.5, Math.min(1.5, raw)));
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => { update(); ticking.current = false; });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { progress, ref };
}

/* ------------------------------------------------------------------ */
/*  Unified content progress — single sticky, multiple chapters        */
/*  Returns progress 0→1 for each chapter based on scroll position     */
/* ------------------------------------------------------------------ */
const CHAPTER_WEIGHTS = [1.6, 1.4, 1.0, 1.4, 1.4, 1.2]; // hero, features, divider, howItWorks, testimonials, finalCta
const TOTAL_WEIGHT = CHAPTER_WEIGHTS.reduce((s, w) => s + w, 0);
const CHAPTER_BOUNDARIES: number[] = [];
{
  let acc = 0;
  for (const w of CHAPTER_WEIGHTS) {
    CHAPTER_BOUNDARIES.push(acc / TOTAL_WEIGHT);
    acc += w;
  }
  CHAPTER_BOUNDARIES.push(1);
}

function useContentProgress() {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const wh = window.innerHeight;
      const stickyTravel = Math.max(rect.height - wh, 1);
      const raw = -rect.top / stickyTravel;
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => { update(); ticking.current = false; });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Per-chapter progress: 0 at chapter start, 1 at chapter end
  // With overlap for smooth transitions
  const chapterProgress = (chapter: number) => {
    const start = CHAPTER_BOUNDARIES[chapter];
    const end = CHAPTER_BOUNDARIES[chapter + 1];
    const range = end - start;
    // Map global progress to chapter-local progress with overlap
    return (progress - start) / range;
  };

  return { ref, progress, chapterProgress };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function remap(value: number, inLow: number, inHigh: number, outLow: number, outHigh: number) {
  const t = clamp01((value - inLow) / (inHigh - inLow));
  return outLow + t * (outHigh - outLow);
}

/** Enter 0→1 then hold, then exit 1→0 */
function enterExit(progress: number, enterStart: number, enterEnd: number, exitStart: number, exitEnd: number) {
  if (progress < enterEnd) return remap(progress, enterStart, enterEnd, 0, 1);
  if (progress > exitStart) return remap(progress, exitStart, exitEnd, 1, 0);
  return clamp01(progress < enterStart ? 0 : 1);
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  const wrapperRef = useRevealOnScroll();
  const scrollY = useScrollY();
  const { t } = useTranslation();

  // Gate section progress (separate sticky)
  const gates = useGateProgress();
  // Unified content progress (single sticky for all chapters)
  const content = useContentProgress();

  // ── Gates ─────────────────────────────────────────────────
  const gp = gates.progress;
  const gateDepth = remap(gp, 0.1, 0.8, 0, 1100);
  const doorOpen = remap(gp, 0.05, 0.35, 0, 1);
  const lightOpacity = remap(gp, 0.1, 0.35, 0, 0.7);
  const lightScale = remap(gp, 0.1, 0.5, 0.3, 1.8);
  const crackOpacity = remap(gp, 0.03, 0.15, 1, 0);
  const gateScrollHint = remap(gp, 0.0, 0.08, 1, 0);
  // Heaven background — ramps up as doors open, locks at full once through
  const celestialOverlay = remap(gp, 0.3, 0.8, 0, 1);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const doorRotateY = isMobile ? 0 : doorOpen * 25;
  const gateScale = remap(gp, 0.2, 0.6, 1, 1.15);
  const doorBlur = remap(gp, 0.35, 0.65, 0, 3);
  const shadowIntensity = remap(gp, 0.08, 0.45, 0.05, 0.4);
  const wallOpacity = remap(gp, 0.25, 0.55, 1, 0);
  const vignetteIntensity = remap(gp, 0.0, 0.3, 0.3, 0.6);
  const vignetteRelease = remap(gp, 0.5, 0.75, 0.6, 0);
  const vignette = gp < 0.5 ? vignetteIntensity : vignetteRelease;
  const behindGateHeroOpacity = remap(gp, 0.3, 0.6, 0, 1) * remap(gp, 0.7, 0.9, 1, 0);
  const leftDoorTransform = `translateX(${-doorOpen * 35}%) rotateY(${-doorRotateY}deg)`;
  const rightDoorTransform = `translateX(${doorOpen * 35}%) rotateY(${doorRotateY}deg)`;

  // ── Chapter progress values ─────────────────────────────
  const hp = content.chapterProgress(0); // Hero
  const fp = content.chapterProgress(1); // Features
  const dp = content.chapterProgress(2); // Divider
  const wp = content.chapterProgress(3); // How it Works
  const tp = content.chapterProgress(4); // Testimonials
  const cp = content.chapterProgress(5); // Final CTA

  // ── Hero ──────────────────────────────────────────────────
  const heroOpacity = enterExit(hp, -0.1, 0.15, 0.6, 0.9);
  const heroY = remap(hp, 0.0, 0.9, 20, -160);
  const heroScale = remap(hp, 0.6, 0.9, 1, 0.88);
  const heroBadgeRotate = remap(hp, 0.4, 0.8, 0, -6);

  // ── Features ──────────────────────────────────────────────
  const featTitleOpacity = enterExit(fp, -0.1, 0.1, 0.65, 0.9);
  const featTitleY = remap(fp, -0.1, 0.15, 50, 0);
  const feat1 = enterExit(fp, 0.0, 0.2, 0.7, 0.92);
  const feat2 = enterExit(fp, 0.08, 0.28, 0.74, 0.94);
  const feat3 = enterExit(fp, 0.16, 0.36, 0.78, 0.96);
  const featCards = [feat1, feat2, feat3];
  const featSpread = remap(fp, 0.0, 0.36, 70, 0);
  const featExitSpread = remap(fp, 0.7, 0.95, 0, -50);
  const totalSpread = featSpread + featExitSpread;

  // ── Divider ───────────────────────────────────────────────
  const divOpacity = enterExit(dp, -0.1, 0.15, 0.6, 0.9);
  const divScale = remap(dp, -0.1, 0.2, 0.75, 1);
  const divCounterY = remap(dp, -0.1, 0.2, 60, 0);
  const divBeamIntensity = remap(dp, 0.0, 0.5, 0.2, 1);

  // ── How it works ──────────────────────────────────────────
  const hwTitle = enterExit(wp, -0.1, 0.1, 0.7, 0.92);
  const s1 = enterExit(wp, 0.0, 0.18, 0.65, 0.85);
  const s2 = enterExit(wp, 0.12, 0.3, 0.7, 0.88);
  const s3 = enterExit(wp, 0.24, 0.42, 0.75, 0.92);
  const stepsP = [s1, s2, s3];
  const lineGrow = remap(wp, 0.0, 0.5, 0, 1);

  // ── Testimonials ──────────────────────────────────────────
  const testTitle = enterExit(tp, -0.1, 0.1, 0.65, 0.9);
  const tc1 = enterExit(tp, 0.0, 0.15, 0.65, 0.88);
  const tc2 = enterExit(tp, 0.08, 0.23, 0.7, 0.9);
  const tc3 = enterExit(tp, 0.16, 0.31, 0.75, 0.92);
  const tc4 = enterExit(tp, 0.24, 0.39, 0.78, 0.95);
  const testCards = [tc1, tc2, tc3, tc4];

  // ── Final CTA ─────────────────────────────────────────────
  const ctaGlow = remap(cp, -0.1, 0.3, 0, 1);
  const ctaIconScale = remap(cp, -0.2, 0.2, 0.5, 1);
  const ctaAureoleSize = remap(cp, 0.0, 0.4, 0.3, 1);
  const ctaRaysOpacity = remap(cp, 0.0, 0.5, 0, 0.5);

  // ── Golden path progress ──────────────────────────────────
  const totalHeight = typeof document !== 'undefined'
    ? Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    : 1;
  const totalProgress = scrollY / totalHeight;
  const pathVisible = gp > 0.5;
  const pathOpacity = remap(gp, 0.5, 0.8, 0, 1);

  return (
    <div ref={wrapperRef} className="landing-root bg-background text-foreground" style={{ overflowX: 'clip' }}>

      {/* ══ Continuous background layer (spans full page) ══════════ */}
      <div className="fixed inset-0 -z-50 pointer-events-none">
        <div className="absolute inset-0 starfield opacity-60" />
        <div
          className="absolute inset-0 starfield-twinkle"
          style={{ transform: `translateY(${scrollY * -0.02}px)` }}
        />
        <div
          className="god-rays absolute w-[250%] h-[250%] -top-3/4 -left-3/4 opacity-20"
          style={{ transform: `rotate(${scrollY * 0.012}deg)` }}
        />
        {/* Celestial warmth after gates open */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, hsl(216 60% 95% / ${celestialOverlay}) 0%, hsl(234 26% 9% / ${1 - celestialOverlay * 2}) 100%)`,
          }}
        />
      </div>

      {/* ── Golden Path — continuous thread through all sections ── */}
      {pathVisible && (
        <div className="golden-path" style={{ opacity: pathOpacity }}>
          <div
            className="golden-path-line"
            style={{ height: `${totalProgress * 100}%` }}
          />
          <div
            className="golden-path-glow"
            style={{ top: `${totalProgress * 100}%` }}
          />
        </div>
      )}

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-border/20 transition-opacity duration-500"
        style={{ opacity: gp > 0.9 && hp > 0.05 ? 1 : 0 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/landing" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
            <span className="font-headline font-extrabold text-lg tracking-tight">
              Gods<span className="text-primary">Plan</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">{t('landing.login', 'Log in')}</Button></Link>
            <Link to="/register"><Button size="sm" className="rounded-full px-5">{t('landing.getStarted', 'Get started')}</Button></Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  0 — THE GATES                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section
        ref={gates.ref as React.RefObject<HTMLElement>}
        className="relative isolate min-h-[170vh] z-10"
      >
        <div className="sticky top-0 min-h-screen overflow-hidden" style={{ perspective: '1200px' }}>

          {/* Hero content visible THROUGH the opening gates */}
          <div
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            style={{ opacity: behindGateHeroOpacity }}
          >
            <div className="text-center px-6 max-w-3xl mx-auto">
              <h1
                className="font-headline font-extrabold text-5xl sm:text-7xl md:text-8xl leading-[1.0] tracking-tight"
                style={{
                  color: 'white',
                  textShadow: '0 2px 40px hsl(234 26% 9% / 0.8), 0 0 80px hsl(234 26% 9% / 0.5)',
                  transform: `scale(${remap(gp, 0.3, 0.7, 0.9, 1)})`,
                }}
              >
                {t('landing.heroTitle1', 'Never miss')}
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(42 85% 48%) 0%, hsl(44 80% 60%) 50%, hsl(42 80% 43%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 20px hsl(42 85% 48% / 0.5))',
                  }}
                >
                  {t('landing.heroTitle2', 'Sunday Mass')}
                </span>
                <br />
                {t('landing.heroTitle3', 'again.')}
              </h1>
            </div>
          </div>

          {/* Solid opaque wall */}
          <div
            className="absolute inset-0 z-[-1]"
            style={{ background: 'hsl(234 26% 9%)', opacity: wallOpacity }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 z-[25] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, hsl(0 0% 0% / ${vignette}) 100%)`,
            }}
          />

          {/* Depth container */}
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translateZ(${gateDepth}px) scale(${gateScale})`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="heavenly-light z-0" style={{ opacity: lightOpacity, transform: `scale(${lightScale})` }} />
            <div className="heavenly-light-warm z-0" style={{ opacity: lightOpacity * 0.7, transform: `scale(${lightScale * 0.8})` }} />
            <div className="gate-crack-light z-20" style={{ opacity: crackOpacity }} />
            <div className="gate-archway-frame" />

            {/* Left door */}
            <div
              className="gate-door gate-left gate-arch-left z-10"
              style={{
                transform: leftDoorTransform,
                filter: doorBlur > 0.1 ? `blur(${doorBlur}px)` : 'none',
                boxShadow: `inset -20px 0 40px -10px hsl(var(--primary) / 0.05), inset 0 0 60px hsl(0 0% 0% / ${shadowIntensity})`,
              }}
            >
              <div className="gate-wood-grain" />
              <div className="gate-panel gate-panel-upper" />
              <div className="gate-panel gate-panel-lower" />
              <div className="gate-studs gate-studs-top" />
              <div className="gate-studs gate-studs-bottom" />
              <div className="gate-hinge gate-hinge-1" />
              <div className="gate-hinge gate-hinge-2" />
              <div className="gate-hinge gate-hinge-3" />
            </div>

            {/* Right door */}
            <div
              className="gate-door gate-right gate-arch-right z-10"
              style={{
                transform: rightDoorTransform,
                filter: doorBlur > 0.1 ? `blur(${doorBlur}px)` : 'none',
                boxShadow: `inset 20px 0 40px -10px hsl(var(--primary) / 0.05), inset 0 0 60px hsl(0 0% 0% / ${shadowIntensity})`,
              }}
            >
              <div className="gate-wood-grain" />
              <div className="gate-panel gate-panel-upper" />
              <div className="gate-panel gate-panel-lower" />
              <div className="gate-studs gate-studs-top" />
              <div className="gate-studs gate-studs-bottom" />
              <div className="gate-hinge gate-hinge-1" />
              <div className="gate-hinge gate-hinge-2" />
              <div className="gate-hinge gate-hinge-3" />
            </div>

            {/* Stone walls */}
            <div
              className="absolute inset-y-0 -left-[50%] w-[50%] z-[8]"
              style={{ background: 'linear-gradient(90deg, hsl(233 17% 8%) 0%, hsl(233 17% 11%) 80%, hsl(233 17% 13%) 100%)' }}
            />
            <div
              className="absolute inset-y-0 -right-[50%] w-[50%] z-[8]"
              style={{ background: 'linear-gradient(270deg, hsl(233 17% 8%) 0%, hsl(233 17% 11%) 80%, hsl(233 17% 13%) 100%)' }}
            />
          </div>

          {/* Scroll hint */}
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 will-change-transform"
            style={{ opacity: gateScrollHint }}
          >
            <span className="text-sm font-medium tracking-widest uppercase text-primary/60">
              {t('landing.gateHint', 'Scroll to enter')}
            </span>
            <span className="material-symbols-outlined text-primary/40 text-3xl animate-bounce">
              expand_more
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  UNIFIED CONTENT — single sticky viewport, all chapters    */}
      {/*  No more dead zones between sections!                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section
        ref={content.ref as React.RefObject<HTMLElement>}
        className="relative -mt-[30vh] z-20"
        style={{ minHeight: '750vh' }}
      >
        <div className="sticky top-0 min-h-screen overflow-hidden bg-background">

          {/* ── Persistent background (same throughout the journey) ── */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 starfield opacity-30" />
            <div className="absolute inset-0 sacred-pattern opacity-30" />
            <div
              className="orb orb-gold absolute w-[700px] h-[700px] rounded-full -top-[15%] -right-[12%] opacity-20 blur-3xl"
              style={{ transform: `translateY(${scrollY * 0.04}px)` }}
            />
            <div
              className="orb orb-blue absolute w-[600px] h-[600px] rounded-full bottom-[10%] -left-[10%] opacity-15 blur-3xl"
              style={{ transform: `translateY(${scrollY * -0.03}px)` }}
            />
            <div
              className="orb orb-gold absolute w-[400px] h-[400px] rounded-full top-[40%] left-[50%] opacity-10 blur-3xl"
              style={{ transform: `translateY(${scrollY * -0.02}px)` }}
            />
          </div>

          {/* ── Chapter content layers ── */}

          {/* I — THE CALL (Hero) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: heroOpacity, zIndex: heroOpacity > 0.01 ? 10 : 0 }}
          >
            <div
              className="text-center px-6 max-w-3xl mx-auto will-change-transform pointer-events-auto"
              style={{ transform: `translateY(${heroY}px) scale(${heroScale})` }}
            >
              <div className="inline-block will-change-transform" style={{ transform: `rotate(${heroBadgeRotate}deg)` }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  {t('landing.badge', 'Find your next mass in seconds')}
                </span>
              </div>

              <h1 className="font-headline font-extrabold text-5xl sm:text-7xl md:text-8xl leading-[1.0] tracking-tight mb-8">
                {t('landing.heroTitle1', 'Never miss')}
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(42 85% 48%) 0%, hsl(44 80% 60%) 50%, hsl(42 80% 43%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {t('landing.heroTitle2', 'Sunday Mass')}
                </span>
                <br />
                {t('landing.heroTitle3', 'again.')}
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                {t('landing.heroSub', 'Real-time mass schedules, church reviews, and daily readings — all in one beautiful app. Built for the modern faithful.')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/">
                  <Button size="lg" className="rounded-full px-10 text-base h-14 sacred-gradient text-white border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                    <span className="material-symbols-outlined mr-2 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                    {t('landing.cta', 'Explore churches')}
                  </Button>
                </Link>
                <Link to="/lectures">
                  <Button variant="outline" size="lg" className="rounded-full px-10 text-base h-14">
                    <span className="material-symbols-outlined mr-2 text-xl">menu_book</span>
                    {t('landing.ctaSecondary', "Today's readings")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* II — THE ANSWER (Features) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: featTitleOpacity > 0.01 ? 1 : 0, zIndex: featTitleOpacity > 0.01 ? 10 : 0 }}
          >
            <div className="max-w-6xl mx-auto px-6 w-full pointer-events-auto py-20">
              <p
                className="text-center text-xs font-semibold tracking-[0.35em] uppercase text-primary/60 mb-3 will-change-transform"
                style={{ opacity: featTitleOpacity, transform: `translateY(${remap(featTitleOpacity, 0, 1, 20, 0)}px)` }}
              >
                {t('landing.ch2Label', 'What we built')}
              </p>
              <h2
                className="text-center font-headline font-bold text-4xl sm:text-5xl md:text-6xl mb-6 will-change-transform"
                style={{ opacity: featTitleOpacity, transform: `translateY(${featTitleY}px)` }}
              >
                {t('landing.featuresTitle', "Everything you need")}
              </h2>
              <p
                className="text-center text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto mb-16 will-change-transform"
                style={{ opacity: featTitleOpacity }}
              >
                {t('landing.featuresSub', 'Designed to be fast, beautiful, and actually useful.')}
              </p>

              <div className="grid md:grid-cols-3 gap-8">
                {([
                  {
                    icon: 'schedule',
                    title: t('landing.feat1Title', 'Live schedules'),
                    desc: t('landing.feat1Desc', 'Real-time mass times for every church in Paris. Filter by rite, language, or time — find what fits your life.'),
                    gradient: 'from-primary/20 to-primary/5',
                    xDir: -1,
                  },
                  {
                    icon: 'map',
                    title: t('landing.feat2Title', 'Interactive map'),
                    desc: t('landing.feat2Desc', 'See every church around you on a beautiful dark map. Tap, explore, and navigate there in one tap.'),
                    gradient: 'from-secondary/20 to-secondary/5',
                    xDir: 0,
                  },
                  {
                    icon: 'menu_book',
                    title: t('landing.feat3Title', 'Daily readings'),
                    desc: t('landing.feat3Desc', "Start your morning with the day's Gospel and readings in a calm, distraction-free reading experience."),
                    gradient: 'from-primary/15 to-secondary/10',
                    xDir: 1,
                  },
                ] as const).map((feat, i) => {
                  const p = featCards[i];
                  const xShift = feat.xDir * totalSpread;
                  const yShift = (1 - p) * 80;
                  const rotation = feat.xDir * (1 - p) * 6;
                  return (
                    <div
                      key={feat.icon}
                      className={`group relative rounded-2xl border border-border/40 bg-gradient-to-br ${feat.gradient} p-8 sm:p-10 hover-lift cursor-default will-change-transform backdrop-blur-sm`}
                      style={{
                        opacity: p,
                        transform: `translateX(${xShift}px) translateY(${yShift}px) rotate(${rotation}deg) scale(${0.85 + p * 0.15})`,
                      }}
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
                      </div>
                      <h3 className="font-headline font-bold text-2xl mb-3">{feat.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-base">{feat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* III — THE SCALE (Divider) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: divOpacity > 0.01 ? 1 : 0, zIndex: divOpacity > 0.01 ? 10 : 0 }}
          >
            <div
              className="text-center px-6 max-w-3xl will-change-transform pointer-events-auto"
              style={{
                opacity: divOpacity,
                transform: `scale(${divScale}) translateY(${divCounterY}px)`,
              }}
            >
              <p className="text-xs font-semibold tracking-[0.35em] uppercase text-white/40 mb-8" style={{ opacity: divOpacity }}>
                {t('landing.ch3Label', 'Paris & beyond')}
              </p>
              <h2 className="font-headline font-extrabold text-5xl sm:text-7xl md:text-8xl text-white mb-6 drop-shadow-lg">
                {t('landing.dividerTitle', '2,400+')}
              </h2>
              <p className="font-headline font-bold text-2xl sm:text-3xl text-white/80 mb-4">
                {t('landing.dividerTitle2', 'churches mapped')}
              </p>
              <p className="text-white/50 text-lg sm:text-xl max-w-lg mx-auto">
                {t('landing.dividerSub', "From Notre-Dame to your neighbourhood chapel — we've got you covered.")}
              </p>
            </div>
          </div>

          {/* IV — THE JOURNEY (How it works) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: hwTitle > 0.01 ? 1 : 0, zIndex: hwTitle > 0.01 ? 10 : 0 }}
          >
            <div className="max-w-5xl mx-auto px-6 w-full pointer-events-auto py-20">
              <p
                className="text-center text-xs font-semibold tracking-[0.35em] uppercase text-primary/60 mb-3 will-change-transform"
                style={{ opacity: hwTitle, transform: `translateY(${(1 - hwTitle) * 30}px)` }}
              >
                {t('landing.ch4Label', 'How it works')}
              </p>
              <h2
                className="text-center font-headline font-bold text-4xl sm:text-5xl md:text-6xl mb-20 will-change-transform"
                style={{ opacity: hwTitle, transform: `translateY(${(1 - hwTitle) * 40}px)` }}
              >
                {t('landing.howTitle', "Three taps. That's it.")}
              </h2>

              {/* Connecting line */}
              <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-px">
                <div
                  className="h-full bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 origin-left will-change-transform"
                  style={{ transform: `scaleX(${lineGrow})` }}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-12 md:gap-8">
                {([
                  {
                    step: '01', icon: 'my_location',
                    title: t('landing.step1Title', 'Open the map'),
                    desc: t('landing.step1Desc', 'We find churches near you automatically. No sign-up needed.'),
                  },
                  {
                    step: '02', icon: 'touch_app',
                    title: t('landing.step2Title', 'Pick a church'),
                    desc: t('landing.step2Desc', 'See mass times, ratings, and distance at a glance.'),
                  },
                  {
                    step: '03', icon: 'directions_walk',
                    title: t('landing.step3Title', 'Go.'),
                    desc: t('landing.step3Desc', 'Get directions and never wonder "is there a mass right now?" again.'),
                  },
                ] as const).map((s, i) => {
                  const p = stepsP[i];
                  const directions = [{ x: -60, y: 30 }, { x: 0, y: 60 }, { x: 60, y: 30 }];
                  const d = directions[i];
                  return (
                    <div
                      key={s.step}
                      className="text-center will-change-transform"
                      style={{
                        opacity: p,
                        transform: `translateX(${(1 - p) * d.x}px) translateY(${(1 - p) * d.y}px) scale(${0.8 + p * 0.2})`,
                      }}
                    >
                      <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 mb-8">
                        <div
                          className="absolute inset-0 rounded-full aureole will-change-transform"
                          style={{ opacity: p * 0.6, transform: `scale(${0.8 + p * 0.5})` }}
                        />
                        <span className="material-symbols-outlined text-primary text-4xl relative" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">{s.step}</span>
                      </div>
                      <h3 className="font-headline font-bold text-2xl mb-3">{s.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-base max-w-xs mx-auto">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* V — THE COMMUNITY (Testimonials) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: testTitle > 0.01 ? 1 : 0, zIndex: testTitle > 0.01 ? 10 : 0 }}
          >
            <div className="max-w-5xl mx-auto text-center px-6 w-full pointer-events-auto py-20">
              <p
                className="text-xs font-semibold tracking-[0.35em] uppercase text-primary/60 mb-3 will-change-transform"
                style={{ opacity: testTitle, transform: `translateY(${(1 - testTitle) * 25}px)` }}
              >
                {t('landing.ch5Label', 'Voices')}
              </p>
              <h2
                className="font-headline font-bold text-4xl sm:text-5xl md:text-6xl mb-16 will-change-transform"
                style={{ opacity: testTitle, transform: `translateY(${(1 - testTitle) * 40}px)` }}
              >
                {t('landing.vibeTitle', 'Built for this generation')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-8">
                {([
                  { emoji: '🕐', text: t('landing.vibe1', '"I used to Google mass times every Sunday. Now I just open the app."') },
                  { emoji: '🗺️', text: t('landing.vibe2', '"Found an amazing church I never knew about, 5 min from my flat."') },
                  { emoji: '📖', text: t('landing.vibe3', '"The daily readings feature is my new morning routine."') },
                  { emoji: '⭐', text: t('landing.vibe4', '"Finally, a church app that doesn\'t look like it was made in 2005."') },
                ] as const).map((q, i) => {
                  const p = testCards[i];
                  const xDir = i % 2 === 0 ? -1 : 1;
                  const yDir = i < 2 ? -1 : 1;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-8 text-left will-change-transform"
                      style={{
                        opacity: p,
                        transform: `translateX(${(1 - p) * xDir * 50}px) translateY(${(1 - p) * yDir * 40}px) rotate(${(1 - p) * xDir * 3}deg)`,
                      }}
                    >
                      <span className="text-3xl mb-4 block">{q.emoji}</span>
                      <p className="text-foreground/90 italic leading-relaxed text-lg">{q.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* VI — YOUR TURN (Final CTA) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: ctaGlow > 0.01 ? 1 : 0, zIndex: ctaGlow > 0.01 ? 10 : 0 }}
          >
            <div className="max-w-2xl mx-auto text-center px-6 pointer-events-auto">
              <div className="relative inline-block mb-6 will-change-transform" style={{ transform: `scale(${ctaIconScale})` }}>
                <div
                  className="absolute -inset-16 aureole rounded-full will-change-transform"
                  style={{ opacity: ctaAureoleSize * 0.7, transform: `scale(${ctaAureoleSize})` }}
                />
                <div
                  className="absolute -inset-28 aureole rounded-full will-change-transform"
                  style={{ opacity: ctaAureoleSize * 0.3, transform: `scale(${ctaAureoleSize * 0.8})` }}
                />
                <span
                  className="material-symbols-outlined text-primary block relative"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '5rem' }}
                >
                  church
                </span>
              </div>

              <p
                className="text-xs font-semibold tracking-[0.35em] uppercase text-primary/60 mb-6 will-change-transform"
                style={{ opacity: ctaGlow, transform: `translateY(${(1 - ctaGlow) * 20}px)` }}
              >
                {t('landing.ch6Label', 'Your turn')}
              </p>
              <h2
                className="font-headline font-extrabold text-4xl sm:text-5xl md:text-7xl mb-6 will-change-transform"
                style={{ opacity: ctaGlow, transform: `translateY(${(1 - ctaGlow) * 40}px)` }}
              >
                {t('landing.finalTitle', 'Your next mass is waiting.')}
              </h2>
              <p
                className="text-muted-foreground text-lg sm:text-xl mb-12 max-w-lg mx-auto will-change-transform"
                style={{ opacity: ctaGlow * 0.9, transform: `translateY(${(1 - ctaGlow) * 25}px)` }}
              >
                {t('landing.finalSub', 'Join thousands of faithful already using GodsPlan to stay connected.')}
              </p>
              <div
                className="will-change-transform"
                style={{ opacity: ctaGlow, transform: `translateY(${(1 - ctaGlow) * 30}px) scale(${0.85 + ctaGlow * 0.15})` }}
              >
                <Link to="/">
                  <Button size="lg" className="rounded-full px-12 text-lg h-16 sacred-gradient text-white border-0 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                    {t('landing.finalCta', "Start exploring — it's free")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border/20 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
            <span className="font-headline font-bold">GodsPlan</span>
          </div>
          <p>&copy; {new Date().getFullYear()} GodsPlan. {t('landing.footerRights', 'Made with faith.')}</p>
        </div>
      </footer>
    </div>
  );
}
