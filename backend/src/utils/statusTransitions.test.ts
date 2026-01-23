/**
 * Status Transition Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  isValidPaymentTransition,
  isValidEntryTransition,
  validatePaymentTransition,
  validateEntryTransition,
  getValidPaymentTargets,
  getValidEntryTargets,
} from './statusTransitions.js'
import { ValidationError } from './errors.js'

describe('Payment Status Transitions', () => {
  describe('isValidPaymentTransition', () => {
    it('should allow same status (no-op)', () => {
      expect(isValidPaymentTransition('draft', 'draft')).toBe(true)
      expect(isValidPaymentTransition('paid', 'paid')).toBe(true)
    })

    it('should allow draft -> pending', () => {
      expect(isValidPaymentTransition('draft', 'pending')).toBe(true)
    })

    it('should allow pending -> paid', () => {
      expect(isValidPaymentTransition('pending', 'paid')).toBe(true)
    })

    it('should allow pending -> rejected', () => {
      expect(isValidPaymentTransition('pending', 'rejected')).toBe(true)
    })

    it('should allow paid -> refunded', () => {
      expect(isValidPaymentTransition('paid', 'refunded')).toBe(true)
    })

    it('should allow rejected -> pending (resubmit)', () => {
      expect(isValidPaymentTransition('rejected', 'pending')).toBe(true)
    })

    // Invalid transitions
    it('should NOT allow paid -> draft', () => {
      expect(isValidPaymentTransition('paid', 'draft')).toBe(false)
    })

    it('should NOT allow paid -> pending', () => {
      expect(isValidPaymentTransition('paid', 'pending')).toBe(false)
    })

    it('should NOT allow refunded -> any other status', () => {
      expect(isValidPaymentTransition('refunded', 'draft')).toBe(false)
      expect(isValidPaymentTransition('refunded', 'pending')).toBe(false)
      expect(isValidPaymentTransition('refunded', 'paid')).toBe(false)
      expect(isValidPaymentTransition('refunded', 'rejected')).toBe(false)
    })

    it('should NOT allow draft -> paid (must go through pending)', () => {
      expect(isValidPaymentTransition('draft', 'paid')).toBe(false)
    })

    it('should NOT allow draft -> rejected', () => {
      expect(isValidPaymentTransition('draft', 'rejected')).toBe(false)
    })

    it('should NOT allow draft -> refunded', () => {
      expect(isValidPaymentTransition('draft', 'refunded')).toBe(false)
    })
  })

  describe('validatePaymentTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() => validatePaymentTransition('draft', 'pending')).not.toThrow()
      expect(() => validatePaymentTransition('pending', 'paid')).not.toThrow()
      expect(() => validatePaymentTransition('paid', 'refunded')).not.toThrow()
    })

    it('should throw ValidationError for invalid transitions', () => {
      expect(() => validatePaymentTransition('paid', 'draft')).toThrow(ValidationError)
      expect(() => validatePaymentTransition('refunded', 'paid')).toThrow(ValidationError)
    })

    it('should include helpful message in error', () => {
      try {
        validatePaymentTransition('paid', 'draft')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).message).toContain("'paid'")
        expect((error as ValidationError).message).toContain("'draft'")
        expect((error as ValidationError).message).toContain('refunded')
      }
    })

    it('should indicate terminal state in error message', () => {
      try {
        validatePaymentTransition('refunded', 'draft')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).message).toContain('terminal state')
      }
    })
  })

  describe('getValidPaymentTargets', () => {
    it('should return valid targets for each status', () => {
      expect(getValidPaymentTargets('draft')).toEqual(['pending'])
      expect(getValidPaymentTargets('pending')).toEqual(['paid', 'rejected'])
      expect(getValidPaymentTargets('paid')).toEqual(['refunded'])
      expect(getValidPaymentTargets('rejected')).toEqual(['pending'])
      expect(getValidPaymentTargets('refunded')).toEqual([])
    })

    it('should return a copy (not modify original)', () => {
      const targets = getValidPaymentTargets('draft')
      targets.push('paid' as any)
      expect(getValidPaymentTargets('draft')).toEqual(['pending'])
    })
  })
})

describe('Entry Status Transitions', () => {
  describe('isValidEntryTransition', () => {
    it('should allow same status (no-op)', () => {
      expect(isValidEntryTransition('draft', 'draft')).toBe(true)
      expect(isValidEntryTransition('locked', 'locked')).toBe(true)
    })

    it('should allow draft -> entered', () => {
      expect(isValidEntryTransition('draft', 'entered')).toBe(true)
    })

    it('should allow entered -> locked', () => {
      expect(isValidEntryTransition('entered', 'locked')).toBe(true)
    })

    // Invalid transitions
    it('should NOT allow locked -> entered', () => {
      expect(isValidEntryTransition('locked', 'entered')).toBe(false)
    })

    it('should NOT allow locked -> draft', () => {
      expect(isValidEntryTransition('locked', 'draft')).toBe(false)
    })

    it('should NOT allow entered -> draft', () => {
      expect(isValidEntryTransition('entered', 'draft')).toBe(false)
    })

    it('should NOT allow draft -> locked (must go through entered)', () => {
      expect(isValidEntryTransition('draft', 'locked')).toBe(false)
    })
  })

  describe('validateEntryTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() => validateEntryTransition('draft', 'entered')).not.toThrow()
      expect(() => validateEntryTransition('entered', 'locked')).not.toThrow()
    })

    it('should throw ValidationError for invalid transitions', () => {
      expect(() => validateEntryTransition('locked', 'entered')).toThrow(ValidationError)
      expect(() => validateEntryTransition('entered', 'draft')).toThrow(ValidationError)
    })

    it('should indicate terminal state in error message', () => {
      try {
        validateEntryTransition('locked', 'draft')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).message).toContain('terminal state')
      }
    })
  })

  describe('getValidEntryTargets', () => {
    it('should return valid targets for each status', () => {
      expect(getValidEntryTargets('draft')).toEqual(['entered'])
      expect(getValidEntryTargets('entered')).toEqual(['locked'])
      expect(getValidEntryTargets('locked')).toEqual([])
    })
  })
})
