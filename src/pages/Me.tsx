import { useEffect, useState, type FormEvent } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, type BodyMetric } from '../lib/api'
import { useAuth } from '../lib/auth'
import { BODY_KINDS, bodySeries, summarize, type BodyKind } from '../lib/body'
import { useMetrics } from '../lib/data'
import { ACTIVITY_LEVELS, ageFrom, bmi, bmiAsia, bmiWho, bmr, healthyRange, navyBodyFat, type Sex } from '../lib/health'
import { fmtDate, fmtKg, isoDate } from '../lib/stats'
import { validateNewPassword } from './ChangePassword'
import { Button, Card, Chip, Field, Heading, Notice, chartColors, font, inputStyle, tooltipStyle } from '../components/ui'

const num = (s: string) => (s.trim() === '' ? null : Number(s))

export default function Me() {
  const { profile, setProfile } = useAuth()
  const p = profile!
  const [reload, setReload] = useState(0)
  const metrics = useMetrics(p.id, reload)

  // Profile fields
  const [height, setHeight] = useState(p.height_cm?.toString() ?? '')
  const [sex, setSex] = useState<Sex | ''>(p.sex ?? '')
  const [birth, setBirth] = useState(p.birth_date ?? '')
  const [goal, setGoal] = useState(p.goal_weight_kg?.toString() ?? '')
  const [profileMsg, setProfileMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  // Measurement form (used both to add a new entry and to correct an old one)
  const [wDate, setWDate] = useState(isoDate(new Date()))
  const [wKg, setWKg] = useState('')
  const [wFat, setWFat] = useState('')
  const [wWaist, setWWaist] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [entryMsg, setEntryMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  // Which measurement the graph shows
  const [kind, setKind] = useState<BodyKind>('weight')

  // Calculators
  const [calcWeight, setCalcWeight] = useState('')
  const [activity, setActivity] = useState(1.55)
  const [neck, setNeck] = useState('')
  const [hip, setHip] = useState('')

  const latest = metrics?.[metrics.length - 1]
  useEffect(() => {
    if (latest && !calcWeight) setCalcWeight(latest.weight_kg.toString())
  }, [latest, calcWeight])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    try {
      setProfile(await api.updateProfile({ height_cm: num(height), sex: sex || null, birth_date: birth || null, goal_weight_kg: num(goal) }))
      setProfileMsg({ kind: 'success', text: 'Saved.' })
    } catch (err) {
      setProfileMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save.' })
    }
  }

  function startEdit(m: BodyMetric) {
    setEditing(m.measured_on)
    setWDate(m.measured_on)
    setWKg(String(m.weight_kg))
    setWFat(m.body_fat_pct != null ? String(m.body_fat_pct) : '')
    setWWaist(m.waist_cm != null ? String(m.waist_cm) : '')
    setEntryMsg(null)
    document.getElementById('measurement-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function resetForm() {
    setEditing(null)
    setWDate(isoDate(new Date()))
    setWKg('')
    setWFat('')
    setWWaist('')
  }

  async function saveEntry(e: FormEvent) {
    e.preventDefault()
    if (!num(wKg)) return
    const existed = !!metrics?.some((m) => m.measured_on === wDate)
    try {
      await api.saveMetric({ measured_on: wDate, weight_kg: num(wKg)!, body_fat_pct: num(wFat), waist_cm: num(wWaist) })
      setCalcWeight(num(wKg)!.toString())
      setEntryMsg({ kind: 'success', text: existed ? `Updated your ${fmtDate(wDate)} entry.` : `Added ${fmtDate(wDate)}.` })
      resetForm()
      setReload((n) => n + 1)
    } catch (err) {
      // keep what was typed so nothing has to be entered again
      setEntryMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the entry.' })
    }
  }

  async function removeEntry(m: BodyMetric) {
    if (!window.confirm(`Remove your ${fmtDate(m.measured_on)} entry (${fmtKg(m.weight_kg)} kg)?`)) return
    try {
      await api.deleteMetric(m.id)
      if (editing === m.measured_on) resetForm()
      setReload((n) => n + 1)
    } catch (err) {
      setEntryMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not remove the entry.' })
    }
  }

  const h = num(height)
  const w = num(calcWeight)
  const age = birth ? ageFrom(birth) : null
  const value = h && w && h > 0 && w > 0 ? bmi(w, h) : null
  const who = value ? bmiWho(value) : null
  const asia = value ? bmiAsia(value) : null
  const range = h ? healthyRange(h, true) : null
  const rangeWho = h ? healthyRange(h, false) : null
  const bmrVal = h && w && age !== null && sex ? bmr(w, h, age, sex) : null
  const waist = latest?.waist_cm
  const navy = sex && h && waist && num(neck) ? navyBodyFat(sex, h, waist, num(neck)!, num(hip) ?? undefined) : null

  const chartHeight = p.height_cm
  const series = metrics ? bodySeries(metrics, kind, chartHeight) : []
  const summary = summarize(series)
  const unit = BODY_KINDS.find((k) => k.kind === kind)!.unit
  const counts = Object.fromEntries(BODY_KINDS.map((k) => [k.kind, metrics ? bodySeries(metrics, k.kind, chartHeight).length : 0])) as Record<BodyKind, number>
  const chartData = series.map((s) => ({ date: fmtDate(s.date), value: s.value }))
  const yValues = series.map((s) => s.value)
  const goalOnChart = kind === 'weight' && p.goal_weight_kg ? p.goal_weight_kg : null
  const domainPoints = [...yValues, ...(goalOnChart ? [goalOnChart] : [])]
  const yDomain: [number, number] = domainPoints.length ? [Math.floor(Math.min(...domainPoints) - 1), Math.ceil(Math.max(...domainPoints) + 1)] : [0, 1]

  return (
    <div>
      <Heading sub={`${p.full_name} · ${p.role}`}>Profile &amp; Body</Heading>

      <Card>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
            Your details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)">
              <input type="number" inputMode="decimal" step="0.1" min="50" max="260" value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Goal weight (kg)">
              <input type="number" inputMode="decimal" step="0.1" min="20" max="400" value={goal} onChange={(e) => setGoal(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Sex">
              <select value={sex} onChange={(e) => setSex(e.target.value as Sex | '')} style={inputStyle}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" value={birth} min="1900-01-01" max={isoDate(new Date())} onChange={(e) => setBirth(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          {profileMsg && <Notice kind={profileMsg.kind}>{profileMsg.text}</Notice>}
          <Button type="submit" wide>
            Save
          </Button>
        </form>
      </Card>

      <Card className="mt-4">
        <form id="measurement-form" onSubmit={saveEntry} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
              {editing ? `Editing ${fmtDate(editing)}` : 'Add a measurement'}
            </div>
            {editing && (
              <button type="button" onClick={resetForm} className="text-xs uppercase tracking-widest px-2" style={{ minHeight: 44, color: '#e63946', fontFamily: font.display }}>
                Cancel
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" required value={wDate} max={isoDate(new Date())} disabled={!!editing} onChange={(e) => setWDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" inputMode="decimal" step="0.1" min="20" max="400" required value={wKg} onChange={(e) => setWKg(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Body fat % (opt.)">
              <input type="number" inputMode="decimal" step="0.1" min="1" max="75" value={wFat} onChange={(e) => setWFat(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Waist cm (opt.)">
              <input type="number" inputMode="decimal" step="0.1" min="30" max="250" value={wWaist} onChange={(e) => setWWaist(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          {entryMsg && <Notice kind={entryMsg.kind}>{entryMsg.text}</Notice>}
          <Button type="submit" wide>
            {editing ? 'Update' : 'Add'}
          </Button>
          <div className="text-xs" style={{ color: '#888899' }}>
            Saving a date that already has an entry replaces it. Body fat and waist are optional.
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Your progress
        </div>
        <div className="flex gap-2 flex-wrap mb-3" role="group" aria-label="Which measurement to graph">
          {BODY_KINDS.map((k) => (
            <Chip key={k.kind} active={kind === k.kind} onClick={() => setKind(k.kind)}>
              {k.label}
              {counts[k.kind] > 0 && <span style={{ opacity: 0.7 }}> · {counts[k.kind]}</span>}
            </Chip>
          ))}
        </div>

        {kind === 'bmi' && !chartHeight ? (
          <Notice kind="warn">Enter your height above and save to see your BMI over time.</Notice>
        ) : series.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: '#888899' }}>
            {kind === 'fat' || kind === 'waist' ? 'No entries with this measurement yet. Add body fat % or waist above.' : 'Add your first measurement above to start your graph.'}
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-3 gap-2 mb-3 text-center" aria-label="Summary">
                <div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                    Latest
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: font.display }}>
                    {summary.latest.value}
                    <span className="text-xs font-normal" style={{ color: '#888899' }}> {unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                    Change
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: font.display, color: summary.change === 0 ? '#c0c0cc' : '#f59e0b' }}>
                    {summary.change > 0 ? '+' : ''}
                    {summary.change}
                    <span className="text-xs font-normal" style={{ color: '#888899' }}> {unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                    Range
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: font.display }}>
                    {summary.min}–{summary.max}
                  </div>
                </div>
              </div>
            )}
            <div role="img" aria-label={`${BODY_KINDS.find((k) => k.kind === kind)!.label} over time: ${series.map((s) => `${fmtDate(s.date)} ${s.value}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} interval="preserveStartEnd" padding={{ left: 12, right: 12 }} />
                  <YAxis stroke={chartColors.axis} fontSize={11} width={40} domain={yDomain} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${v} ${unit}`.trim()} />
                  {goalOnChart && <ReferenceLine y={goalOnChart} stroke={chartColors.amber} strokeDasharray="4 4" label={{ value: 'goal', fill: chartColors.amber, fontSize: 11, position: 'insideTopRight' }} />}
                  {kind === 'bmi' &&
                    [18.5, 23, 25]
                      .filter((y) => y > yDomain[0] && y < yDomain[1])
                      .map((y) => <ReferenceLine key={y} y={y} stroke="#888899" strokeDasharray="3 5" label={{ value: String(y), fill: '#888899', fontSize: 10, position: 'insideTopRight' }} />)}
                  <Line type="monotone" dataKey="value" stroke={kind === 'weight' ? chartColors.blue : kind === 'bmi' ? chartColors.violet : kind === 'fat' ? chartColors.red : chartColors.green} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {kind === 'bmi' && (
              <div className="text-xs mt-1" style={{ color: '#888899' }}>
                Dashed lines: 18.5 (underweight below), 23 and 25 (Asia-Pacific overweight / obese), drawn when they fall inside your graph. BMI uses your current height for every entry.
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          BMI calculator
        </div>
        <Field label="Try a weight (kg)">
          <input type="number" inputMode="decimal" step="0.1" min="20" max="300" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} style={inputStyle} />
        </Field>
        {value && who && asia ? (
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold" style={{ fontFamily: font.display, color: asia.color }}>
                {value.toFixed(1)}
              </span>
              <span style={{ color: '#888899' }}>kg/m²</span>
            </div>
            <BmiBar value={value} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                  Asia-Pacific
                </div>
                <div style={{ color: asia.color }}>{asia.label}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
                  WHO standard
                </div>
                <div style={{ color: who.color }}>{who.label}</div>
              </div>
            </div>
            {range && rangeWho && (
              <div className="text-sm mt-3" style={{ color: '#c0c0cc' }}>
                Healthy weight for {h} cm:{' '}
                <b>
                  {fmtKg(range[0])}–{fmtKg(range[1])} kg
                </b>{' '}
                (Asia-Pacific) or {fmtKg(rangeWho[0])}–{fmtKg(rangeWho[1])} kg (WHO).
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm mt-4" style={{ color: '#888899' }}>
            Enter your height and weight to see your BMI.
          </div>
        )}
        <div className="text-xs mt-3" style={{ color: '#888899' }}>
          BMI ignores muscle mass, so for lifters it can read high. Use it with body fat and waist, not alone.
        </div>
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Energy &amp; body fat
        </div>
        {bmrVal ? (
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs" style={{ color: '#888899' }}>
                BMR (Mifflin-St Jeor)
              </div>
              <div className="text-3xl font-bold" style={{ fontFamily: font.display }}>
                {Math.round(bmrVal)} <span className="text-sm font-normal" style={{ color: '#888899' }}>kcal/day</span>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#888899' }}>
                Daily needs
              </div>
              <select value={activity} onChange={(e) => setActivity(Number(e.target.value))} style={inputStyle} aria-label="Activity level">
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a.factor} value={a.factor}>
                    {a.label}
                  </option>
                ))}
              </select>
              <div className="text-3xl font-bold mt-1" style={{ fontFamily: font.display, color: '#10b981' }}>
                {Math.round(bmrVal * activity)} <span className="text-sm font-normal" style={{ color: '#888899' }}>kcal</span>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#888899' }}>
                Body fat (US Navy method)
              </div>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" placeholder="Neck cm" value={neck} onChange={(e) => setNeck(e.target.value)} style={inputStyle} aria-label="Neck in cm" />
                {sex === 'female' && <input type="number" inputMode="decimal" placeholder="Hip cm" value={hip} onChange={(e) => setHip(e.target.value)} style={inputStyle} aria-label="Hip in cm" />}
              </div>
              <div className="text-3xl font-bold mt-1" style={{ fontFamily: font.display, color: '#f59e0b' }}>
                {navy !== null && isFinite(navy) ? `${navy.toFixed(1)}%` : '—'}
              </div>
              {!waist && (
                <div className="text-xs" style={{ color: '#888899' }}>
                  Needs a measurement with waist above.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: '#888899' }}>
            Add height, sex, date of birth and a measurement to see your calorie needs.
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888899', fontFamily: font.display }}>
          All entries
        </div>
        {!metrics || metrics.length === 0 ? (
          <div className="text-sm py-4 text-center" style={{ color: '#888899' }}>
            Nothing recorded yet.
          </div>
        ) : (
          <ul aria-label="All entries">
            {[...metrics].reverse().map((m) => {
              const bmiValue = chartHeight ? bmi(m.weight_kg, chartHeight) : null
              return (
                <li key={m.id} className="py-3" style={{ borderTop: '1px solid #1f1f28' }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <b>{fmtDate(m.measured_on)}</b>
                    <span style={{ fontFamily: font.mono, fontSize: 14 }}>
                      {fmtKg(m.weight_kg)} kg{m.body_fat_pct ? ` · ${fmtKg(m.body_fat_pct)}% fat` : ''}
                      {m.waist_cm ? ` · ${fmtKg(m.waist_cm)} cm waist` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: '#888899' }}>
                      {bmiValue ? `BMI ${bmiValue.toFixed(1)}` : ''}
                    </span>
                    <span className="flex gap-1">
                      <button onClick={() => startEdit(m)} className="text-xs uppercase tracking-widest px-3" style={{ minHeight: 44, color: '#c0c0cc', fontFamily: font.display }}>
                        Edit
                      </button>
                      <button onClick={() => removeEntry(m)} className="text-xs uppercase tracking-widest px-3" style={{ minHeight: 44, color: '#e63946', fontFamily: font.display }}>
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <PasswordCard />
    </div>
  )
}

function BmiBar({ value }: { value: number }) {
  const pos = Math.min(Math.max(((value - 15) / (40 - 15)) * 100, 0), 100)
  const seg = (from: number, to: number, color: string) => ({ left: `${((from - 15) / 25) * 100}%`, width: `${((to - from) / 25) * 100}%`, background: color })
  return (
    <div className="relative h-3 rounded-full overflow-hidden mt-3" style={{ background: '#1a1a22' }}>
      <div className="absolute h-full" style={seg(15, 18.5, '#3b82f6')} />
      <div className="absolute h-full" style={seg(18.5, 23, '#10b981')} />
      <div className="absolute h-full" style={seg(23, 25, '#f59e0b')} />
      <div className="absolute h-full" style={seg(25, 40, '#e63946')} />
      <div className="absolute top-0 h-full w-1 bg-white" style={{ left: `${pos}%` }} />
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validateNewPassword(pw, confirm)
    if (problem) return setMsg(problem)
    try {
      await api.changePassword(current, pw)
      setMsg('Password updated.')
      setCurrent('')
      setPw('')
      setConfirm('')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not change password.')
    }
  }

  return (
    <Card className="mt-4">
      <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 items-end">
        <Field label="Current password">
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="New password">
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Confirm">
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
        </Field>
        <Button type="submit" variant="ghost" wide>
          Change password
        </Button>
      </form>
      {msg && (
        <div className="text-sm mt-2" role="status" style={{ color: '#888899' }}>
          {msg}
        </div>
      )}
    </Card>
  )
}
