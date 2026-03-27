import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CoverageChartProps {
  coverage: {
    gps: { count: number; percent: number };
    schedules: { count: number; percent: number };
    phone: { count: number; percent: number };
    website: { count: number; percent: number };
    photos: { count: number; percent: number };
  };
}

export function CoverageChart({ coverage }: CoverageChartProps) {
  const data = useMemo(() => ({
    labels: ['GPS', 'Horaires', 'Téléphone', 'Site Web', 'Photos'],
    datasets: [
      {
        label: 'Coverage (%)',
        data: [
          coverage.gps.percent,
          coverage.schedules.percent,
          coverage.phone.percent,
          coverage.website.percent,
          coverage.photos.percent
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // green
          'rgba(59, 130, 246, 0.8)',  // blue
          'rgba(168, 85, 247, 0.8)',  // purple
          'rgba(249, 115, 22, 0.8)',  // orange
          'rgba(236, 72, 153, 0.8)'   // pink
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(249, 115, 22)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 1
      }
    ]
  }), [coverage]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Coverage par type de données',
        color: 'hsl(var(--foreground))',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
          color: 'hsl(var(--muted-foreground))'
        },
        grid: {
          color: 'hsl(var(--border))'
        }
      },
      x: {
        ticks: {
          color: 'hsl(var(--muted-foreground))'
        },
        grid: {
          display: false
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
}
