import { useRef, useState, useCallback, type ReactNode, type TouchEvent } from 'react';
import { cn } from '@/lib/utils';
import { useNotificationStore, makeSubKey } from '@/store/useNotificationStore';
import { useTranslation } from 'react-i18next';

interface SwipeableMassRowProps {
  churchId: string;
  dayOfWeek: number;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 72;   // px to snap open
const ACTION_WIDTH = 80; // revealed action strip width

export function SwipeableMassRow({ churchId, dayOfWeek, children, className }: SwipeableMassRowProps) {
  const { t } = useTranslation();
  const key = makeSubKey(churchId, dayOfWeek);
  const subscribed = useNotificationStore(s => s.isSubscribed(key));
  const toggle = useNotificationStore(s => s.toggle);

  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const locked = useRef<'horizontal' | 'vertical' | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    dragging.current = true;
    locked.current = null;
    setTransitioning(false);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Lock direction after 8px of movement
    if (!locked.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      return;
    }

    if (locked.current === 'vertical') return;

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();

    const base = isOpen ? -ACTION_WIDTH : 0;
    let raw = base + dx;

    // Clamp: don't swipe right past origin, rubber-band past action width
    if (raw > 0) raw = raw * 0.2;
    if (raw < -ACTION_WIDTH * 1.5) raw = -ACTION_WIDTH * 1.5 + (raw + ACTION_WIDTH * 1.5) * 0.15;

    setOffsetX(raw);
  }, [isOpen]);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current || locked.current !== 'horizontal') {
      dragging.current = false;
      return;
    }
    dragging.current = false;
    setTransitioning(true);

    if (offsetX < -THRESHOLD) {
      setOffsetX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  }, [offsetX]);

  const handleAction = useCallback(() => {
    toggle(key);
    // Haptic feedback if available
    if ('vibrate' in navigator) navigator.vibrate(10);
    // Close the row after toggling
    setTransitioning(true);
    setOffsetX(0);
    setIsOpen(false);
  }, [toggle, key]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Action strip behind the row */}
      <button
        onClick={handleAction}
        className={cn(
          'absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 transition-colors',
          subscribed
            ? 'bg-muted-foreground/20 text-muted-foreground'
            : 'bg-primary text-primary-foreground',
        )}
        style={{ width: ACTION_WIDTH }}
        aria-label={subscribed ? t('swipeable.unsubscribe') : t('swipeable.subscribe')}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: subscribed ? "'FILL' 0" : "'FILL' 1" }}
        >
          {subscribed ? 'notifications_off' : 'notifications_active'}
        </span>
        <span className="text-[9px] font-label font-bold uppercase tracking-wider">
          {subscribed ? t('swipeable.mute') : t('swipeable.notify')}
        </span>
      </button>

      {/* Foreground content — slides left */}
      <div
        className="relative z-10 bg-surface-container"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: transitioning ? 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTransitionEnd={() => setTransitioning(false)}
      >
        <div className="flex items-center">
          <div className="flex-1 min-w-0">{children}</div>
          {subscribed && (
            <span
              className="material-symbols-outlined text-primary text-sm opacity-70 shrink-0 pr-3"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              notifications_active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
