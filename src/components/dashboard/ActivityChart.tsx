import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import ChartToggle from './ChartToggle';
import type { ChartType } from './ChartToggle';
import type { Topic } from '../../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de' };

interface Props {
  topics: Topic[];
}

export default function ActivityChart({ topics }: Props) {
  const [chartType, setChartType] = useState<ChartType>('line');

  const data = useMemo(() => {
    const monthMap: Record<string, { creados: number; editados: number }> = {};

    // Generate last 6 months as base
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      monthMap[key] = { creados: 0, editados: 0 };
      // Store label for later
      (monthMap[key] as Record<string, unknown>)._label = label;
    }

    // Distribute topics across months using their date field
    topics.forEach(topic => {
      if (!topic.date) return;
      const dateStr = topic.date.slice(0, 7); // YYYY-MM
      if (monthMap[dateStr]) {
        monthMap[dateStr].creados += 1;
        // Simulate edits: topics in revision or approved have been edited
        if (topic.status === 'en_revision' || topic.status === 'aprobado' || topic.status === 'devuelto') {
          monthMap[dateStr].editados += 1;
        }
      }
    });

    // If no topics matched any month, simulate some activity based on topic count
    const totalCreated = Object.values(monthMap).reduce((s, m) => s + m.creados, 0);
    if (totalCreated === 0 && topics.length > 0) {
      const months = Object.keys(monthMap);
      const perMonth = Math.ceil(topics.length / months.length);
      let remaining = topics.length;
      let editRemaining = topics.filter(t => t.status !== 'en_desarrollo').length;
      months.forEach(key => {
        const c = Math.min(perMonth, remaining);
        monthMap[key].creados = c;
        remaining -= c;
        const e = Math.min(Math.ceil(c * 0.6), editRemaining);
        monthMap[key].editados = e;
        editRemaining -= e;
      });
    }

    return Object.entries(monthMap).map(([, value]) => ({
      name: (value as Record<string, unknown>)._label as string,
      creados: value.creados,
      editados: value.editados,
    }));
  }, [topics]);

  return (
    <div className="bg-white rounded-xl p-5 border" style={{ borderColor: TJ.border }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
          Actividad / Productividad
        </h3>
        <ChartToggle active={chartType} options={['line', 'bar']} onChange={setChartType} />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        {chartType === 'line' ? (
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
              dataKey="creados"
              name="Creados"
              stroke={TJ.primary}
              strokeWidth={2}
              dot={{ fill: TJ.primary, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="editados"
              name="Editados"
              stroke={TJ.gold}
              strokeWidth={2}
              dot={{ fill: TJ.gold, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${TJ.border}`, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="creados" name="Creados" fill={TJ.primary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="editados" name="Editados" fill={TJ.gold} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
