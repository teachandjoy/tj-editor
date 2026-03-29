import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

export type ChartType = 'bar' | 'pie' | 'line';

interface ChartToggleProps {
  active: ChartType;
  options: ChartType[];
  onChange: (type: ChartType) => void;
}

const icons: Record<ChartType, typeof BarChart3> = {
  bar: BarChart3,
  pie: PieIcon,
  line: TrendingUp,
};

const labels: Record<ChartType, string> = {
  bar: 'Barras',
  pie: 'Pastel',
  line: 'Lineal',
};

const TJ_PRIMARY = '#1b4b85';
const TJ_BORDER = '#e8e4de';

export default function ChartToggle({ active, options, onChange }: ChartToggleProps) {
  return (
    <div className="flex gap-1">
      {options.map(opt => {
        const Icon = icons[opt];
        const isActive = active === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
            style={{
              background: isActive ? TJ_PRIMARY : '#fff',
              color: isActive ? '#fff' : '#6b7280',
              border: `1px solid ${isActive ? TJ_PRIMARY : TJ_BORDER}`,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            <Icon size={12} />
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}
