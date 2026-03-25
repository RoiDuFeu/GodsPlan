import { cn } from '@/lib/utils';

interface ScoreBarProps {
  score: number; // 0-100
  className?: string;
}

export function ScoreBar({ score, className }: ScoreBarProps) {
  // Calcul du nombre de barres à remplir (1-5)
  const filledBars = Math.ceil(score / 20);
  
  // Couleur selon le score
  const getColorClass = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-lime-500';
    if (score >= 40) return 'bg-orange-400';
    if (score >= 20) return 'bg-orange-600';
    return 'bg-red-500';
  };

  const colorClass = getColorClass();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 5 barres */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 w-6 rounded-sm transition-colors',
              i < filledBars ? colorClass : 'bg-muted'
            )}
          />
        ))}
      </div>
      {/* Score numérique */}
      <span className="text-xs font-medium text-muted-foreground">
        {score}/100
      </span>
    </div>
  );
}
