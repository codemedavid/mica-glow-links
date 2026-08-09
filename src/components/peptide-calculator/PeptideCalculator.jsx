import { useId, useState } from 'react'
import { buildTicks, calculateDose, convertDoseValue, formatDoseSummary } from './dosing'
import './peptide-calculator.css'

const CONSULTATION_URL = 'https://nowserving.seriousmd.com/doctor/andrei-francis-flandes'

const SYRINGE_OPTIONS = [0.3, 0.5, 1.0]
const VIAL_OPTIONS = [5, 10, 15]
const WATER_OPTIONS = [1, 2, 3, 5]
const DOSE_OPTIONS = { mcg: [50, 100, 250, 500], mg: [0.25, 0.5, 1, 2.5] }

const INITIAL_STATE = {
  syringeMl: 0.5,
  vialMg: 10,
  waterMl: 2,
  doseValue: 250,
  doseUnit: 'mcg',
  isVialCustom: false,
  isWaterCustom: false,
  isDoseCustom: false,
}

/**
 * @param {{ isSelected: boolean, label: string, ariaLabel?: string, onSelect: () => void }} props
 */
function Chip({ isSelected, label, ariaLabel, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={ariaLabel}
      className={isSelected ? 'pc-chip pc-chip--selected' : 'pc-chip'}
      onClick={onSelect}
    >
      {label}
    </button>
  )
}

/**
 * A numbered question card wrapping one group of choices.
 */
function StepCard({ number, title, groupLabel, headerExtra, children, note }) {
  const titleId = useId()

  return (
    <section className="pc-card" aria-labelledby={titleId}>
      <div className="pc-card-head">
        <span className="pc-step-num" aria-hidden="true">
          {number}
        </span>
        <h2 className="pc-card-title" id={titleId}>
          {title}
        </h2>
      </div>
      {headerExtra}
      <div className="pc-chips" role="radiogroup" aria-label={groupLabel}>
        {children}
      </div>
      {note && <p className="pc-card-note">{note}</p>}
    </section>
  )
}

/**
 * @param {{ label: string, value: string }} props
 */
function StatTile({ label, value }) {
  const labelId = useId()

  return (
    <div className="pc-stat" role="group" aria-labelledby={labelId}>
      <span className="pc-stat-label" id={labelId}>
        {label}
      </span>
      <span className="pc-stat-value">{value}</span>
    </div>
  )
}

/**
 * @param {{ id: string, value: number|string, unitLabel: string, onChange: (value: string) => void }} props
 */
function CustomAmountField({ id, value, unitLabel, onChange }) {
  return (
    <div className="pc-custom">
      <input
        id={id}
        className="pc-custom-input"
        type="number"
        inputMode="decimal"
        min="0"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <label className="pc-custom-label" htmlFor={id}>
        {unitLabel}
      </label>
    </div>
  )
}

/**
 * Reconstitution and dosing calculator.
 *
 * @param {{
 *   onBack: () => void,
 *   showDisclaimer?: boolean,
 *   accent?: string,
 * }} props
 */
export function PeptideCalculator({ onBack, showDisclaimer = true, accent = '#a78bfa' }) {
  const [state, setState] = useState(INITIAL_STATE)
  const vialFieldId = useId()
  const waterFieldId = useId()
  const doseFieldId = useId()

  const update = (changes) => setState((previous) => ({ ...previous, ...changes }))

  const result = calculateDose(state)
  const summary = formatDoseSummary(result, state)
  const ticks = buildTicks(state.syringeMl)

  const setDoseUnit = (unit) => {
    if (unit === state.doseUnit) return
    update({ doseUnit: unit, doseValue: convertDoseValue(state.doseValue, state.doseUnit, unit) })
  }

  const doseUnitLabel = state.doseUnit === 'mg' ? 'mg per dose' : 'mcg per dose'

  return (
    <section className="pc" aria-labelledby="pc-heading" style={{ '--pc-accent': accent }}>
      <div className="pc-shell">
        <div className="pc-topbar">
          <button type="button" className="pc-back" onClick={onBack}>
            ← Back to Links
          </button>
        </div>

        <header className="pc-hero">
          <span className="pc-avatar">
            <img src="/logo.png" alt="Mica Glow" className="pc-avatar-img" />
          </span>
          <h1 className="pc-title" id="pc-heading">
            Peptide Calculator
          </h1>
          <p className="pc-eyebrow">Reconstitution &amp; dosing</p>
          <p className="pc-lede">
            Answer four questions and see exactly how far to draw the plunger.
          </p>
        </header>

        <StepCard
          number={1}
          title="What is the total volume of your syringe?"
          groupLabel="Syringe volume"
          note={summary.syringeNote}
        >
          {SYRINGE_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={`${option.toFixed(1)} ml`}
              isSelected={state.syringeMl === option}
              onSelect={() => update({ syringeMl: option })}
            />
          ))}
        </StepCard>

        <StepCard number={2} title="Select peptide vial quantity" groupLabel="Vial quantity">
          {VIAL_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={`${option} mg`}
              isSelected={!state.isVialCustom && state.vialMg === option}
              onSelect={() => update({ vialMg: option, isVialCustom: false })}
            />
          ))}
          <Chip
            label="Other"
            ariaLabel="Other vial size"
            isSelected={state.isVialCustom}
            onSelect={() => update({ isVialCustom: true })}
          />
        </StepCard>
        {state.isVialCustom && (
          <CustomAmountField
            id={vialFieldId}
            value={state.vialMg}
            unitLabel="mg in the vial"
            onChange={(value) => update({ vialMg: value })}
          />
        )}

        <StepCard
          number={3}
          title="How much bacteriostatic water are you adding?"
          groupLabel="Bacteriostatic water"
        >
          {WATER_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={`${option} ml`}
              isSelected={!state.isWaterCustom && state.waterMl === option}
              onSelect={() => update({ waterMl: option, isWaterCustom: false })}
            />
          ))}
          <Chip
            label="Other"
            ariaLabel="Other water volume"
            isSelected={state.isWaterCustom}
            onSelect={() => update({ isWaterCustom: true })}
          />
        </StepCard>
        {state.isWaterCustom && (
          <CustomAmountField
            id={waterFieldId}
            value={state.waterMl}
            unitLabel="ml of water"
            onChange={(value) => update({ waterMl: value })}
          />
        )}

        <StepCard
          number={4}
          title="How much peptide do you want in each dose?"
          groupLabel="Dose per injection"
          headerExtra={
            <div className="pc-unit-row">
              <span className="pc-unit-hint">Measure in</span>
              <div className="pc-unit-toggle">
                <button
                  type="button"
                  aria-label="Measure in micrograms"
                  aria-pressed={state.doseUnit === 'mcg'}
                  className={state.doseUnit === 'mcg' ? 'pc-unit pc-unit--selected' : 'pc-unit'}
                  onClick={() => setDoseUnit('mcg')}
                >
                  mcg
                </button>
                <button
                  type="button"
                  aria-label="Measure in milligrams"
                  aria-pressed={state.doseUnit === 'mg'}
                  className={state.doseUnit === 'mg' ? 'pc-unit pc-unit--selected' : 'pc-unit'}
                  onClick={() => setDoseUnit('mg')}
                >
                  mg
                </button>
              </div>
            </div>
          }
        >
          {DOSE_OPTIONS[state.doseUnit].map((option) => (
            <Chip
              key={option}
              label={`${option} ${state.doseUnit}`}
              isSelected={!state.isDoseCustom && state.doseValue === option}
              onSelect={() => update({ doseValue: option, isDoseCustom: false })}
            />
          ))}
          <Chip
            label="Other"
            ariaLabel="Other dose"
            isSelected={state.isDoseCustom}
            onSelect={() => update({ isDoseCustom: true })}
          />
        </StepCard>
        {state.isDoseCustom && (
          <CustomAmountField
            id={doseFieldId}
            value={state.doseValue}
            unitLabel={doseUnitLabel}
            onChange={(value) => update({ doseValue: value })}
          />
        )}

        <div className="pc-result">
          <p className="pc-result-eyebrow">
            <span className="pc-result-dot" aria-hidden="true" />
            Your dose
          </p>

          <div className="pc-result-readout" role="status" aria-live="polite">
            <p className="pc-units">
              <span className="pc-units-value">{summary.unitsLabel}</span>
              <span className="pc-units-caption">units on the syringe</span>
            </p>
            <p className="pc-draw-line">{summary.drawLine}</p>
          </div>

          <div className="pc-syringe" aria-hidden="true" style={{ '--pc-fill': result.fillRatio }}>
            <span className="pc-needle" />
            <span className="pc-hub" />
            <div className="pc-barrel">
              <span className="pc-barrel-fill" />
              <div className="pc-ticks">
                {ticks.map((tick, index) => (
                  <span
                    key={index}
                    className={tick.isMajor ? 'pc-tick pc-tick--major' : 'pc-tick'}
                  >
                    {tick.isMajor && <span className="pc-tick-label">{tick.label}</span>}
                  </span>
                ))}
              </div>
              <span className="pc-plunger" />
              <span className="pc-barrel-gloss" />
              <span className="pc-barrel-unit">units</span>
            </div>
            <span className="pc-collar" />
            <span className="pc-rod" />
            <span className="pc-thumb" />
          </div>

          <div className="pc-stats">
            <StatTile label="Concentration" value={summary.concLine} />
            <StatTile label="Doses per vial" value={summary.dosesLine} />
            <StatTile label="Syringe fill" value={summary.fillLine} />
          </div>

          {result.isOverfilled && (
            <p className="pc-warning" role="alert">
              {summary.warningText}
            </p>
          )}
        </div>

        <div className="pc-actions">
          <button type="button" className="pc-reset" onClick={() => setState(INITIAL_STATE)}>
            Reset
          </button>
          <a className="pc-cta" href={CONSULTATION_URL} target="_blank" rel="noopener noreferrer">
            Book a consultation →
          </a>
        </div>

        {showDisclaimer && (
          <p className="pc-disclaimer">
            Reference tool only. Units assume a standard U-100 insulin syringe. Always confirm
            dosing with your prescriber.
          </p>
        )}

        <p className="pc-copyright">© 2026 Mica Glow</p>
      </div>
    </section>
  )
}
