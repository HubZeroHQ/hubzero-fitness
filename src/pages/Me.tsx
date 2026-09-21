import { useEffect, useState, type FormEvent } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useMetrics } from '../lib/data'
import { ACTIVITY_LEVELS, ageFrom, bmi, bmiAsia, bmiWho, bmr, healthyRange, navyBodyFat, type Sex } from '../lib/health'
import { fmtDate, fmtKg, isoDate } from '../lib/stats'
import { validateNewPassword } from './ChangePassword'
import { Button, Card, Field, Heading, chartColors, font, inputStyle, tooltipStyle } from '../components/ui'

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
  const [msg, setMsg] = useState('')

  // Weigh-in
  const [wDate, setWDate] = useState(isoDate(new Date()))
  const [wKg, setWKg] = useState('')
  const [wFat, setWFat] = useState('')
  const [wWaist, setWWaist] = useState('')

  // Calculator inputs default to the latest weigh-in
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
      setMsg('Saved.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  async function addWeighIn(e: FormEvent) {
    e.preventDefault()
    if (!num(wKg)) return
    try {
      await api.saveMetric({ measured_on: wDate, weight_kg: num(wKg)!, body_fat_pct: num(wFat), waist_cm: num(wWaist) })
      setCalcWeight(num(wKg)!.toString())
      setWKg('')
      setWFat('')
      setWWaist('')
      setReload((n) => n + 1)
    } catch {
      /* leave the form as is so nothing typed is lost */
    }
  }

  async function removeWeighIn(id: number) {
    await api.deleteMetric(id)
    setReload((n) => n + 1)
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

  return (
    <div>
      <Heading sub={`${p.full_name} · ${p.role}`}>Profile &amp; BMI</Heading>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
              Your details
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <input type="number" step="0.1" min="100" max="250" value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Goal weight (kg)">
                <input type="number" step="0.1" min="30" max="250" value={goal} onChange={(e) => setGoal(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Sex">
                <select value={sex} onChange={(e) => setSex(e.target.value as Sex | '')} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input type="date" value={birth} max={isoDate(new Date())} onChange={(e) => setBirth(e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit">Save</Button>
              <span className="text-sm" style={{ color: '#888899' }}>
                {msg}
              </span>
            </div>
          </form>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
            BMI calculator
          </div>
          <Field label="Weight (kg)">
            <input type="number" step="0.1" min="20" max="300" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} style={inputStyle} />
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
                  Healthy weight for {h} cm: <b>{fmtKg(range[0])}–{fmtKg(range[1])} kg</b> (Asia-Pacific) or {fmtKg(rangeWho[0])}–{fmtKg(rangeWho[1])} kg (WHO).
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
      </div>

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
              <div className="text-xs" style={{ color: '#888899' }}>
                Daily needs
              </div>
              <select value={activity} onChange={(e) => setActivity(Number(e.target.value))} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }}>
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
              <div className="text-xs" style={{ color: '#888899' }}>
                Body fat (US Navy method)
              </div>
              <div className="flex gap-2 mt-1">
                <input type="number" placeholder="Neck cm" value={neck} onChange={(e) => setNeck(e.target.value)} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                {sex === 'female' && <input type="number" placeholder="Hip cm" value={hip} onChange={(e) => setHip(e.target.value)} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />}
              </div>
              <div className="text-3xl font-bold mt-1" style={{ fontFamily: font.display, color: '#f59e0b' }}>
                {navy !== null && isFinite(navy) ? `${navy.toFixed(1)}%` : '—'}
              </div>
              {!waist && (
                <div className="text-xs" style={{ color: '#888899' }}>
                  Needs a weigh-in with waist below.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: '#888899' }}>
            Add height, sex, date of birth and a weigh-in to see your calorie needs.
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Weigh-ins
        </div>
        <form onSubmit={addWeighIn} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <Field label="Date">
            <input type="date" value={wDate} max={isoDate(new Date())} onChange={(e) => setWDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" step="0.1" required value={wKg} onChange={(e) => setWKg(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Body fat % (opt.)">
            <input type="number" step="0.1" value={wFat} onChange={(e) => setWFat(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Waist cm (opt.)">
            <input type="number" step="0.1" value={wWaist} onChange={(e) => setWWaist(e.target.value)} style={inputStyle} />
          </Field>
          <Button type="submit">Add</Button>
        </form>

        {metrics && metrics.length >= 2 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.map((m) => ({ date: fmtDate(m.measured_on), kg: m.weight_kg }))}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} />
                <YAxis stroke={chartColors.axis} fontSize={11} width={40} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip {...tooltipStyle} />
                {p.goal_weight_kg && <ReferenceLine y={p.goal_weight_kg} stroke={chartColors.amber} strokeDasharray="4 4" label={{ value: 'goal', fill: chartColors.amber, fontSize: 11 }} />}
                <Line type="monotone" dataKey="kg" stroke={chartColors.blue} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {metrics && metrics.length > 0 && (
          <div className="mt-3 space-y-1 text-sm">
            {[...metrics].reverse().slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1" style={{ borderTop: '1px solid #1f1f28' }}>
                <span style={{ color: '#888899' }}>{fmtDate(m.measured_on)}</span>
                <span style={{ fontFamily: font.mono }}>
                  {fmtKg(m.weight_kg)} kg{m.body_fat_pct ? ` · ${fmtKg(m.body_fat_pct)}% fat` : ''}
                  {m.waist_cm ? ` · ${fmtKg(m.waist_cm)} cm waist` : ''}
                </span>
                <button onClick={() => removeWeighIn(m.id)} className="text-xs" style={{ color: '#e63946' }}>
                  remove
                </button>
              </div>
            ))}
          </div>
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
        <Button type="submit" variant="ghost">
          Change password
        </Button>
      </form>
      {msg && (
        <div className="text-sm mt-2" style={{ color: '#888899' }}>
          {msg}
        </div>
      )}
    </Card>
  )
}
