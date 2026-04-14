'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type SendsDay = { date: string; emails: number }
type FeedbackDay = { date: string; good: number; bad: number }
type GrowthDay = { date: string; users: number; subscriptions: number }
type TickersDay = { date: string; avg: number; max: number }

export default function Charts({
  sendsByDay,
  feedbackByDay,
  growthByDay,
  tickersByDay,
}: {
  sendsByDay: SendsDay[]
  feedbackByDay: FeedbackDay[]
  growthByDay: GrowthDay[]
  tickersByDay: TickersDay[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User & subscription growth */}
      <ChartCard title="Users & subscriptions — all time">
        <LineChart data={growthByDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="users" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="subscriptions" stroke="#a1a1aa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartCard>

      {/* Emails sent per day */}
      <ChartCard title="Emails sent — last 14 days">
        <LineChart data={sendsByDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={2} />
          <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="emails" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartCard>

      {/* Avg + max tickers per day */}
      <ChartCard title="Tickers per email — last 14 days">
        <LineChart data={tickersByDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={2} />
          <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="avg" name="avg tickers" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="max" name="max tickers" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartCard>

      {/* Feedback per day */}
      <ChartCard title="Feedback — last 14 days">
        <LineChart data={feedbackByDay} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={2} />
          <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="good" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="bad" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-4 text-muted uppercase tracking-wide">{title}</h2>
      <ResponsiveContainer width="100%" height={200}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

const tickStyle = { fontSize: 11, fill: 'var(--muted)' }
const tooltipStyle = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '0.375rem',
  fontSize: '12px',
}
const legendStyle = { fontSize: '12px', paddingTop: '8px' }
