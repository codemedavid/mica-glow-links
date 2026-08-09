/**
 * Reconstitution and dosing math for the Peptide Calculator.
 *
 * Ported from the "Advanced Peptide Calculator" design. Kept free of React so
 * the arithmetic can be tested on its own.
 */

export const MCG_PER_MG = 1000
/** Insulin syringes are U-100: 100 units per millilitre. */
export const UNITS_PER_ML = 100
/** Gradations drawn along the barrel; every fifth one is labelled. */
export const TICK_COUNT = 20
const MAJOR_TICK_EVERY = 5
/** Floating-point slack so a dose that exactly fills the syringe is not flagged. */
export const OVERFILL_EPSILON = 1e-9

/** Custom inputs hand back strings, including '' — treat anything unusable as 0. */
const toNumber = (value) => Number(value) || 0

/**
 * Round to `digits` decimals and drop trailing zeroes, so 5 reads as "5"
 * rather than "5.0".
 *
 * @param {number} value
 * @param {number} digits
 * @returns {string}
 */
export function roundTo(value, digits) {
  return Number(value.toFixed(digits)).toString()
}

/**
 * Restate a dose when the user switches between mcg and mg.
 *
 * @param {number|string} value
 * @param {'mcg'|'mg'} fromUnit
 * @param {'mcg'|'mg'} toUnit
 * @returns {number}
 */
export function convertDoseValue(value, fromUnit, toUnit) {
  const amount = toNumber(value)
  if (fromUnit === toUnit) return amount
  return toUnit === 'mg' ? amount / MCG_PER_MG : amount * MCG_PER_MG
}

/**
 * @typedef {object} DoseInput
 * @property {number} syringeMl Barrel capacity in ml.
 * @property {number|string} vialMg Peptide in the vial, in mg.
 * @property {number|string} waterMl Bacteriostatic water added, in ml.
 * @property {number|string} doseValue Target dose, expressed in `doseUnit`.
 * @property {'mcg'|'mg'} doseUnit
 */

/**
 * @param {DoseInput} input
 */
export function calculateDose({ syringeMl, vialMg, waterMl, doseValue, doseUnit }) {
  const mg = toNumber(vialMg)
  const water = toNumber(waterMl)
  const doseMcg = convertDoseValue(doseValue, doseUnit, 'mcg')

  const concMcgPerMl = water > 0 ? (mg * MCG_PER_MG) / water : 0
  const drawMl = concMcgPerMl > 0 ? doseMcg / concMcgPerMl : 0
  const units = drawMl * UNITS_PER_ML
  const fillRatio = syringeMl > 0 ? Math.min(drawMl / syringeMl, 1) : 0
  const dosesPerVial = doseMcg > 0 ? Math.floor((mg * MCG_PER_MG) / doseMcg) : 0

  return {
    doseMcg,
    concMcgPerMl,
    drawMl,
    units,
    fillRatio,
    dosesPerVial,
    isOverfilled: drawMl > syringeMl + OVERFILL_EPSILON,
  }
}

/**
 * Evenly spaced barrel gradations, scaled to the chosen syringe.
 *
 * @param {number} syringeMl
 */
export function buildTicks(syringeMl) {
  const maxUnits = Math.round(syringeMl * UNITS_PER_ML)

  return Array.from({ length: TICK_COUNT }, (_, index) => {
    const position = index + 1
    const isMajor = position % MAJOR_TICK_EVERY === 0
    return {
      isMajor,
      label: isMajor ? String(Math.round((maxUnits / TICK_COUNT) * position)) : '',
    }
  })
}

const EMPTY = '—'

/**
 * Turn a calculation into the strings shown on the page.
 *
 * @param {ReturnType<typeof calculateDose>} result
 * @param {DoseInput} input
 */
export function formatDoseSummary(result, { syringeMl }) {
  const { doseMcg, concMcgPerMl, drawMl, units, fillRatio, dosesPerVial, isOverfilled } = result
  const capacityUnits = Math.round(syringeMl * UNITS_PER_ML)

  return {
    unitsLabel: units > 0 ? roundTo(units, 1) : EMPTY,
    drawLine:
      drawMl > 0
        ? `Draw ${roundTo(drawMl, 3)} ml to get ${roundTo(doseMcg, 0)} mcg (${roundTo(
            doseMcg / MCG_PER_MG,
            3
          )} mg) per dose.`
        : 'Fill in the fields above to see your draw volume.',
    concLine: concMcgPerMl > 0 ? `${roundTo(concMcgPerMl / MCG_PER_MG, 2)} mg/ml` : EMPTY,
    dosesLine: dosesPerVial > 0 ? `${dosesPerVial} doses` : EMPTY,
    fillLine: drawMl > 0 ? `${Math.round(fillRatio * 100)}%` : EMPTY,
    syringeNote: `A ${syringeMl.toFixed(1)} ml insulin syringe is marked 0–${capacityUnits} units.`,
    warningText: isOverfilled
      ? `That dose needs ${roundTo(drawMl, 2)} ml — more than your ${syringeMl.toFixed(
          1
        )} ml syringe holds. Use less water or a larger syringe.`
      : '',
  }
}
