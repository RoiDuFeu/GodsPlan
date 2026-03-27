import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ReliabilityPieChartProps {
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export function ReliabilityPieChart({ distribution }: ReliabilityPieChartProps) {
  const data = useMemo(() => ({
    labels: ['Excellent (>90)', 'Bon (70-90)', 'Moyen (50-70)', 'Faible (<50)'],
    datasets: [
      {
        label: 'Églises',
        data: [
          distribution.excellent,
          distribution.good,
          distribution.fair,
          distribution.poor
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // green
          'rgba(59, 130, 246, 0.8)',  // blue
          'rgba(251, 191, 36, 0.8)',  // yellow
          'rgba(239, 68, 68, 0.8)'    // red
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }
    ]
  }), [distribution]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'hsl(var(--foreground))',
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Score de fiabilité',
        color: 'hsl(var(--foreground))',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return <Pie data={data} options={options} />;
}
