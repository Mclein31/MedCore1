import { useEffect, useState, useSyncExternalStore } from 'react';
import { ViewportOverlay } from '../components/common/ViewportOverlay';
type Request = { message: string; min: number; resolve: (value: string | null) => void };
let pending: Request | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function finish(value: string | null) {
  const request = pending;
  pending = null;
  listeners.forEach((fn) => fn());
  request?.resolve(value);
}
export function requestBridgeInput(message: string, min = 1): Promise<string | null> {
  if (pending) return Promise.reject(new Error('Complete the current input first.'));
  return new Promise((resolve) => {
    pending = { message, min, resolve };
    listeners.forEach((fn) => fn());
  });
}
function InputForm({ request }: { request: Request }) {
  const [value, setValue] = useState('');
  return (
    <ViewportOverlay
      layer="confirmation"
      dialogLabel="Required action details"
      onDismiss={() => finish(null)}
    >
      <form
        className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          finish(request.min ? value.trim() : 'confirmed');
        }}
      >
        <h3 className="font-bold text-lg text-slate-900">Required action details</h3>
        {request.min > 0 ? (
          <label className="block text-sm font-medium text-slate-700">
            {request.message}
            <input
              className="mt-3 w-full rounded-lg border border-slate-300 p-3"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              minLength={request.min}
              required
            />
          </label>
        ) : (
          <p className="text-sm text-slate-700">{request.message}</p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-slate-300"
            onClick={() => finish(null)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-brand-teal text-white disabled:opacity-40"
            disabled={request.min > 0 && value.trim().length < request.min}
          >
            Confirm details
          </button>
        </div>
      </form>
    </ViewportOverlay>
  );
}
export function BridgeInputDialog() {
  const request = useSyncExternalStore(
    subscribe,
    () => pending,
    () => null,
  );
  useEffect(() => () => finish(null), []);
  return request ? <InputForm key={request.message} request={request} /> : null;
}
