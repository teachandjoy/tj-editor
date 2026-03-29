import { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import ChartToggle from './ChartToggle';
import type { ChartType } from './ChartToggle';
import type { Offer, Topic } from '../../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de' };

const PALETTE = [TJ.primary, TJ.secondary, TJ.gold, '#276749', '#6b46c1', '#2563eb', '#d97706', '#059669'];

interface Props {
  offers: Offer[];
  topics: Topic[];
}

export default function OfferProgressChart({ offers, topics }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  const data = useMemo(() => {
    return offers.map((offer, idx) => {
      const offerTopics = topics.filter(t => t.offerId === offer.id);
      const approved = offerTopics.filter(t => t.status === 'aprobado').length;
      const pct = offerTopics.length > 0 ? Math.round((approved / offerTopics.length) * 100) : 0;
      const shortName = offer.name.length > 20 ? offer.name.slice(0, 20) + '...' : offer.name;
      return {
        name: shortName,
        fullName: offer.name,
        progreso: pct,
        total: offerTopics.length,
        aprobados: approved,
        fill: PALETTE[idx % PALETTE.length],
      };
    });
  }, [offers, topics]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof data[number] }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-lg p-3 border text-xs" style={{ borderColor: TJ.border }}>
        <p className="font-semibold mb-1" style={{ color: TJ.primary }}>{d.fullName}</p>
        <p>Progreso: <strong>{d.progreso}%</strong></p>
        <p>Aprobados: {d.aprobados} / {d.total}</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-5 border" style={{ borderColor: TJ.border }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
          Progreso por Oferta Académica
        </h3>
        <ChartToggle active={chartType} options={['bar', 'pie']} onChange={setChartType} />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        {chartType === 'bar' ? (
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} unit="%" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="progreso" name="% Progreso" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              dataKey="progreso"
              nameKey="name"
              label={({ name, value }) => `${name}: ${value}%`}
              labelLine={false}
              style={{ fontSize: 10 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
