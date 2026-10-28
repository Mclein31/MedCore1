import { describe, expect, it } from 'vitest';
import { caseRateMismatch } from '../src/services/ai/claimsForensicService';

describe('caseRateMismatch', () => {
  it('accepts a diagnosis the case rate covers', () => {
    expect(caseRateMismatch('CAP-MR', 'J18.9')).toBeNull();
    expect(caseRateMismatch('APPX', 'k35.8')).toBeNull();
  });

  it('names the covered condition when the diagnosis does not match', () => {
    expect(caseRateMismatch('CAP-MR', 'K80.2')).toBe('community-acquired pneumonia');
  });

  it('does not guess for case rates it does not know', () => {
    expect(caseRateMismatch('UNKNOWN', 'K80.2')).toBeNull();
  });
});
