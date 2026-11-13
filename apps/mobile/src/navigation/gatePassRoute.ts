import type { RootStackParamList } from './types';

/**
 * Where "View discharge pass" goes: the pass itself (RecordDetail shows the QR, PIN and status) when
 * its number is known, otherwise the Documents list that contains it.
 */
export function gatePassRoute(
  encounterId: string | undefined,
  passNumber: string | undefined | null,
): ['RecordDetail', RootStackParamList['RecordDetail']] | ['Documents'] {
  return encounterId && passNumber
    ? ['RecordDetail', { encounterId, documentKind: 'GATE_PASS', documentId: passNumber }]
    : ['Documents'];
}
