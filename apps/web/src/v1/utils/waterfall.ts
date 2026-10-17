import { computeStatutoryWaterfall } from '@/v1/shared/statutoryWaterfall';
import type { ChargemasterItem, StatutoryWaterfall } from '@/v1/types/domain';

export function recalculateWaterfall(
  items: ChargemasterItem[],
  isSeniorOrPwd: boolean,
  philhealthHci: number,
  philhealthPf: number,
  hmoMaxAllowance: number,
  roomUpgradeExcess: number,
  excessDoctorPf: number,
): StatutoryWaterfall {
  const result = computeStatutoryWaterfall(
    items,
    isSeniorOrPwd,
    philhealthHci,
    philhealthPf,
    hmoMaxAllowance,
    roomUpgradeExcess,
    excessDoctorPf,
  );
  return { ...result, grossCharges: result.grossTotal };
}
