import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Profile } from '../lib/api'
import { useLogs, useProfiles } from '../lib/data'
import { improvementSeries, lastWeeks, type WeekImprovement } from '../lib/improvement'
import { TYPE_COLOR } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { currentStreak, fmtDate } from '../lib/stats'
import { Card, Chip, Heading, chartColors, font, personColors, tooltipStyle } from '../components/ui'
import Progress from './Progress'

const roleLabel = { coach: 'Coach', moderator: 'Moderator', member: 'Member' } as const
const WEEKS = 8

/** "+4.2%", "-1.0%", "0.0%" */
export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
const firstName = (p: Profile) => p.full_name.split(' ')[0]
const weekLabel = (iso: string) => fmtDate(iso)

/**
 * The team comparison is about IMPROVEMENT, never about who is strongest or trains most: every person is measured
 * against their own previous week (see lib/improvement.ts).
 */
export default function Team() {
  const { dayByNumber } = useProgram()
  const profiles = useProfiles()
  const logs = useLogs()
  const [range, setRange] = useState<'this' | 'last'>('this')
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null)
  const weeks = useMemo(() => lastWeeks(new Date(), WEEKS), [])

  const people = useMemo(() => {
    if (!profiles || !logs) return null
    return profiles.map((p, i) => {
      const mine = logs.filter((l) => l.user_id === p.id)
      const series = improvementSeries(mine, weeks)
      const lastLog = [...mine].reverse().find((l) => l.completed)
      return { profile: p, color: personColors[i % personColors.length], series, streak: currentStreak(mine), lastLog }
    })
  }, [profiles, logs, weeks])

  if (viewing) {
    return (
      <div>
        <button onClick={() => setViewing(null)} className="text-sm mb-3 px-1" style={{ minHeight: 44, color: '#e63946', fontFamily: font.display, letterSpacing: '0.08em' }}>
          ← BACK TO TEAM
        </button>
        <Progress userId={viewing.id} name={viewing.name} />
      </div>
    )
  }
  if (!people) return <div style={{ color: '#888899' }}>Loading…</div>

  const idx = range === 'this' ? weeks.length - 1 : weeks.length - 2
  const week = weeks[idx]
  const scored = people
    .map((p) => ({ ...p, result: p.series[idx] as WeekImprovement }))
    .sort((a, b) => (b.result.score ?? -Infinity) - (a.result.score ?? -Infinity) || a.profile.full_name.localeCompare(b.profile.full_name))
  const withScore = scored.filter((p) => p.result.score !== null)
  const withoutScore = scored.filter((p) => p.result.score === null)

  const barData = withScore.map((p) => ({ name: firstName(p.profile), score: Math.round((p.result.score as number) * 10) / 10 }))
  const trend = weeks.map((w, i) => {
    const row: Record<string, number | string | null> = { week: weekLabel(w) }
    for (const p of people) row[String(p.profile.id)] = p.series[i].score === null ? null : Math.round((p.series[i].score as number) * 10) / 10
    return row
  })
  const anyTrend = people.some((p) => p.series.some((s) => s.score !== null))

  return (
    <div>
      <Heading sub="Who improved the most, measured against each person's own previous week.">Team</Heading>

      <div className="text-xs mb-4 rounded-lg px-3 py-2.5" style={{ background: '#15151b', border: '1px solid #2a2a35', color: '#c0c0cc', lineHeight: 1.5 }}>
        <b>How it works:</b> for every exercise you trained in two weeks in a row we compare your best estimated one-rep max with the week before, then
        average the changes. It does <b>not</b> reward lifting heavier than others or training more days, so a beginner and an experienced lifter can score the
        same. One exercise counts for at most ±50%.
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Chip active={range === 'this'} onClick={() => setRange('this')}>
          This week
        </Chip>
        <Chip active={range === 'last'} onClick={() => setRange('last')}>
          Last week
        </Chip>
        <span className="self-center text-xs" style={{ color: '#888899' }}>
          week of {weekLabel(week)}
          {range === 'this' ? ' · updates as you log' : ''}
        </span>
      </div>

      <Card>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Improvement vs previous week
        </div>
        {barData.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
            Nothing to compare yet. Log the same exercises in two weeks in a row and the comparison appears here.
          </div>
        ) : (
          <div role="img" aria-label={`Improvement chart: ${barData.map((b) => `${b.name} ${fmtPct(b.score)}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={Math.max(150, barData.length * 52 + 36)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                <XAxis type="number" stroke={chartColors.axis} fontSize={12} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                <YAxis type="category" dataKey="name" stroke={chartColors.axis} fontSize={13} width={96} tickLine={false} />
                <ReferenceLine x={0} stroke="#888899" />
                <Tooltip {...tooltipStyle} formatter={(v) => fmtPct(Number(v))} cursor={{ fill: '#ffffff10' }} />
                <Bar dataKey="score" radius={4} minPointSize={4} isAnimationActive={false}>
                  {barData.map((b) => (
                    <Cell key={b.name} fill={b.score >= 0 ? chartColors.green : chartColors.red} />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={(v: unknown) => fmtPct(Number(v))} fill="#f0f0f5" fontSize={13} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <ul aria-label="Improvement ranking" className="mt-2">
          {withScore.map((p, i) => (
            <li key={p.profile.id} className="py-3" style={{ borderTop: '1px solid #1f1f28' }}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="mr-2" style={{ color: '#888899', fontFamily: font.mono }}>
                    {i + 1}
                  </span>
                  <b>{p.profile.full_name}</b>
                </div>
                <span className="text-2xl font-bold" style={{ fontFamily: font.display, color: (p.result.score as number) >= 0 ? '#10b981' : '#e63946' }}>
                  {fmtPct(p.result.score as number)}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#888899' }}>
                {p.result.compared.length} exercise{p.result.compared.length === 1 ? '' : 's'} compared
                {p.result.compared.length > 0 && (
                  <>
                    {' · best: '}
                    {p.result.compared
                      .slice(0, 3)
                      .map((c) => `${c.name} ${fmtPct(c.percent)}`)
                      .join(', ')}
                  </>
                )}
              </div>
            </li>
          ))}
          {withoutScore.map((p) => (
            <li key={p.profile.id} className="py-3 flex items-baseline justify-between gap-3" style={{ borderTop: '1px solid #1f1f28', color: '#888899' }}>
              <span>{p.profile.full_name}</span>
              <span className="text-xs text-right">not enough data yet</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888899', fontFamily: font.display }}>
          Last {WEEKS} weeks
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm">
          {people.map((p) => (
            <span key={p.profile.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: p.color }} />
              {firstName(p.profile)}
            </span>
          ))}
        </div>
        {!anyTrend ? (
          <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
            The weekly trend appears after two weeks of training.
          </div>
        ) : (
          <div role="img" aria-label="Weekly improvement trend for every person">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="week" stroke={chartColors.axis} fontSize={11} interval="preserveStartEnd" />
                <YAxis stroke={chartColors.axis} fontSize={11} width={44} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine y={0} stroke="#888899" />
                <Tooltip {...tooltipStyle} formatter={(v) => (v === null ? '–' : fmtPct(Number(v)))} />
                {people.map((p) => (
                  <Line key={p.profile.id} name={firstName(p.profile)} type="monotone" dataKey={String(p.profile.id)} stroke={p.color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="text-xs uppercase tracking-widest mt-6 mb-2" style={{ color: '#888899', fontFamily: font.display }}>
        Members
      </div>
      <div className="space-y-2">
        {scored.map((p) => {
          const l = p.lastLog
          const type = l ? (l.day_type ?? dayByNumber(l.day_number).type) : null
          const title = l ? (l.day_title ?? dayByNumber(l.day_number).title) : null
          return (
            <Card key={p.profile.id} className="!p-0">
              <button className="w-full text-left p-4" style={{ minHeight: 64 }} onClick={() => setViewing({ id: p.profile.id, name: p.profile.full_name })} aria-label={`Open ${p.profile.full_name}'s progress`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold uppercase truncate" style={{ fontFamily: font.display, fontSize: 19 }}>
                      {p.profile.full_name}
                    </div>
                    <div className="text-xs" style={{ color: '#888899' }}>
                      {roleLabel[p.profile.role]}
                      {l && type && title && (
                        <>
                          {' · last: '}
                          <span style={{ color: TYPE_COLOR[type].fg }}>{title}</span> on {fmtDate(l.log_date)}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold" style={{ fontFamily: font.display }}>
                      {p.streak}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                      day streak
                    </div>
                  </div>
                </div>
              </button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
