import type { ReactNode } from 'react';
import { errorMessage } from '../lib/api';
import { stageLabel } from '../lib/format';
import { useCurrentStay } from '../lib/stays';
import type { StayDetail, StayRow } from '../lib/types';
import { Empty, ErrorView, Loading, Notice, Screen } from '../ui/kit';

export interface ReadyStay {
  row: StayRow;
  d: StayDetail;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Every tab shows the current stay. This handles the states before there is a
 * bill to show (loading, offline, nothing linked, bill still being prepared),
 * so screens only render the ready case.
 */
export function WithStay({
  children,
  requireBill = true,
}: {
  children: (ready: ReadyStay) => ReactNode;
  requireBill?: boolean;
}) {
  const { stays, row, detail } = useCurrentStay();
  const refresh = () => {
    void stays.refetch();
    if (row) void detail.refetch();
  };
  const refreshing = (stays.isRefetching || detail.isRefetching) && !detail.isPending;

  if (stays.isPending) return <Loading message="Loading your hospital account…" />;
  if (stays.isError) return <ErrorView message={errorMessage(stays.error)} onRetry={refresh} />;
  if (!row) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Empty
          title="No hospital stay yet"
          detail="Your bill appears here once the hospital links your admission to this email."
        />
      </Screen>
    );
  }
  if (detail.isPending) return <Loading message="Loading your bill…" />;
  if (detail.isError) return <ErrorView message={errorMessage(detail.error)} onRetry={refresh} />;
  const d = detail.data;
  if (requireBill && (!d.stay.billReady || !d.ledger)) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Notice tone="info">
          Your bill is still being prepared ({stageLabel(d.stay.stage).toLowerCase()}). Pull down to check
          again, or wait for the hospital’s email.
        </Notice>
      </Screen>
    );
  }
  return <>{children({ row, d, refreshing, refresh })}</>;
}
