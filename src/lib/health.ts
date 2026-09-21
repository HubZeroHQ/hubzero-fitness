export type Sex = 'male' | 'female'

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export interface BmiCategory {
  label: string
  color: string
}

/** WHO international cut-offs. */
export function bmiWho(v: number): BmiCategory {
  if (v < 18.5) return { label: 'Underweight', color: '#3b82f6' }
  if (v < 25) return { label: 'Normal', color: '#10b981' }
  if (v < 30) return { label: 'Overweight', color: '#f59e0b' }
  return { label: 'Obese', color: '#e63946' }
}

/** WHO Asia-Pacific cut-offs, more appropriate for South Asian populations. */
export function bmiAsia(v: number): BmiCategory {
  if (v < 18.5) return { label: 'Underweight', color: '#3b82f6' }
  if (v < 23) return { label: 'Normal', color: '#10b981' }
  if (v < 25) return { label: 'Overweight (at risk)', color: '#f59e0b' }
  return { label: 'Obese', color: '#e63946' }
}

/** Healthy weight range for a height, using BMI 18.5–24.9 (WHO) or 18.5–22.9 (Asia-Pacific). */
export function healthyRange(heightCm: number, asia: boolean): [number, number] {
  const m2 = (heightCm / 100) ** 2
  return [18.5 * m2, (asia ? 22.9 : 24.9) * m2]
}

export function ageFrom(birthDate: string, now = new Date()): number {
  const b = new Date(birthDate)
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

export const ACTIVITY_LEVELS = [
  { label: 'Sedentary (little exercise)', factor: 1.2 },
  { label: 'Light (1–3 days/week)', factor: 1.375 },
  { label: 'Moderate (3–5 days/week)', factor: 1.55 },
  { label: 'Very active (6–7 days/week)', factor: 1.725 },
] as const

/** Epley estimated one-rep max. */
export function e1rm(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30)
}

/** US Navy body-fat estimate. Needs waist (and neck; hip for women) in cm. */
export function navyBodyFat(sex: Sex, heightCm: number, waistCm: number, neckCm: number, hipCm?: number): number | null {
  if (sex === 'male') {
    const d = waistCm - neckCm
    if (d <= 0) return null
    return 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(heightCm)) - 450
  }
  if (!hipCm) return null
  const d = waistCm + hipCm - neckCm
  if (d <= 0) return null
  return 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(heightCm)) - 450
}
