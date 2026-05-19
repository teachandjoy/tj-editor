import { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import ChartToggle from './ChartToggle';
import type { ChartType } from './ChartToggle';
import type { Topic } from '../../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de' };

const STATUS_COLORS: Record<string, string> = {
  en_desarrollo: TJ.primary,
  en_revision: TJ.gold,
  aprobado: '#276749',
  devuelto: TJ.secondary,
};

const STATUS_LABELS: Record<string, string> = {
  en_desarrollo: 'En desarrollo',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  devuelto: 'Devuelto',
};

interface Props {
  topics: Topic[];
}

export default function StatusDistributionChart({ topics }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  const data = useMemo(() => {
    const counts: Record<string, number> = {
      en_desarrollo: 0,
      en_revision: 0,
      aprobado: 0,
      devuelto: 0,
    };
    topics.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key],
      value,
      fill: STATUS_COLORS[key],
    }));
  }, [topics]);

  return (
    <div className="bg-white rounded-xl p-5 border" style={{ borderColor: TJ.border }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
          Distribución de Temas por Estado
        </h3>
        <ChartToggle active={chartType} options={['bar', 'pie', 'line']} onChange={setChartType} />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        {chartType === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${TJ.border}`, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" name="Temas" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 11 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${TJ.border}`, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${TJ.border}`, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="value"
              name="Temas"
              stroke={TJ.primary}
              strokeWidth={2}
              dot={{ fill: TJ.primary, r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
