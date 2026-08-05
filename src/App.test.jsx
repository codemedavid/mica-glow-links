import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

const BOOKING_URL = 'https://nowserving.seriousmd.com/doctor/andrei-francis-flandes'

/**
 * Journey: As a community member considering GLP-1, I want to book a
 * consultation with Dr. Andrei Francis Flandes straight from the links page,
 * so that I can get medical guidance before ordering.
 */
describe('Book a Consultation link', () => {
  beforeEach(() => {
    window.location.hash = ''
    render(<App />)
  })

  it('is visible on the home view', () => {
    expect(screen.getByRole('link', { name: /book a consultation/i })).toBeVisible()
  })

  it('points to the doctor booking page', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveAttribute('href', BOOKING_URL)
  })

  it('opens in a new tab without leaking the opener', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('names the doctor so visitors know who they are booking with', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveTextContent(/dr\.?\s*andrei francis flandes/i)
  })
})
