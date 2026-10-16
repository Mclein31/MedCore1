import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { StayRow } from './types';

export const staysKey = ['stays'] as const;
export const stayKey = (id: string) => ['stay', id] as const;

interface StaySelection {
  selectedId: string | null;
  select: (id: string) => void;
}

const SelectionContext = createContext<StaySelection | null>(null);

/** Remembers which hospital stay the tabs show. Defaults to the most recent one. */
export function StaySelectionProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const value = useMemo(() => ({ selectedId: chosen, select: setChosen }), [chosen]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useStays() {
  return useQuery({ queryKey: staysKey, queryFn: api.stays, select: (d) => d.items });
}

/** The stay the tabs are showing: the one the patient picked, else the most recent. */
export function useCurrentStay() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error('useCurrentStay must be used inside StaySelectionProvider');
  const stays = useStays();
  const items: StayRow[] = stays.data ?? [];
  const row = items.find((s) => s.id === selection.selectedId) ?? items[0] ?? null;
  const detail = useQuery({
    queryKey: stayKey(row?.id ?? 'none'),
    queryFn: () => api.stay(row!.id),
    enabled: Boolean(row),
  });
  return { stays, items, row, detail, select: selection.select };
}

/** Refetch the list and one stay after anything that changes money or status. */
export function useRefreshStay() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: stayKey(id) }),
        queryClient.invalidateQueries({ queryKey: staysKey }),
      ]),
    [queryClient],
  );
}
