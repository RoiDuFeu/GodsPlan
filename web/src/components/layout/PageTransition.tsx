import { useEffect, useState, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  const [currentOutlet, setCurrentOutlet] = useState(outlet);
  const [currentKey, setCurrentKey] = useState(location.pathname);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  const pendingOutletRef = useRef(outlet);
  const pendingKeyRef = useRef(location.pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Same path — just update outlet content in place (data changes)
    if (location.pathname === currentKey) {
      setCurrentOutlet(outlet);
      return;
    }

    // New route — stash the new outlet, start fading out the current one
    pendingOutletRef.current = outlet;
    pendingKeyRef.current = location.pathname;

    if (timerRef.current) clearTimeout(timerRef.current);

    setPhase('out');

    timerRef.current = setTimeout(() => {
      // Fade-out done — swap to new page, then fade in
      setCurrentOutlet(pendingOutletRef.current);
      setCurrentKey(pendingKeyRef.current);
      setPhase('in');
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div
      className="h-full w-full"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'translateY(6px)' : 'translateY(0)',
        transition: phase === 'out'
          ? 'opacity 180ms ease-in, transform 180ms ease-in'
          : 'opacity 260ms ease-out, transform 260ms ease-out',
      }}
    >
      {currentOutlet}
    </div>
  );
}
