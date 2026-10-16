import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, Field, Input, PageHeader } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

interface Verified {
  result: 'VERIFIED';
  passNumber: string;
  patientName: string;
  bedCode: string;
}

export function Lobby() {
  const [passNumber, setPassNumber] = useState('');
  const [pin, setPin] = useState('');
  const passRef = useRef<HTMLInputElement>(null);
  const verify = useMutation({
    mutationFn: () =>
      api<Verified>('/v1/staff/gate-passes/verify', {
        method: 'POST',
        body: { passNumber: passNumber.trim().toUpperCase(), pin },
      }),
    onSettled: () => setPin(''),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    verify.mutate();
  };
  const reset = () => {
    verify.reset();
    setPassNumber('');
    setPin('');
    passRef.current?.focus();
  };

  return (
    <>
      <PageHeader title="Lobby exit check" subtitle="Each pass works once. Five wrong PINs void it." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Pass number" hint="Scan the QR code or type the number, like GP-ABCDE23456.">
              {(f) => (
                <Input
                  {...f}
                  ref={passRef}
                  autoFocus
                  autoComplete="off"
                  value={passNumber}
                  maxLength={13}
                  className="font-mono uppercase"
                  onChange={(e) => setPassNumber(e.target.value.toUpperCase())}
                />
              )}
            </Field>
            <Field label="Patient’s 6-digit PIN">
              {(f) => (
                <Input
                  {...f}
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  maxLength={6}
                  className="tabular font-mono tracking-[0.3em]"
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </Field>
            <Button
              type="submit"
              busy={verify.isPending}
              disabled={!/^GP-[A-Z0-9]{10}$/.test(passNumber.trim()) || pin.length !== 6}
            >
              Verify pass
            </Button>
          </form>
        </Card>
        <div aria-live="polite">
          {verify.isSuccess && (
            <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6">
              <CheckCircle2 aria-hidden className="size-10 text-emerald-600" />
              <p className="mt-3 text-2xl font-semibold text-emerald-900">Cleared to leave</p>
              <p className="mt-2 text-emerald-900">
                {verify.data.patientName} · bed {verify.data.bedCode}
              </p>
              <p className="mt-1 font-mono text-sm text-emerald-800">{verify.data.passNumber}</p>
              <p className="mt-3 text-sm text-emerald-800">
                Check that the name matches the patient’s wristband.
              </p>
              <Button className="mt-5" variant="secondary" onClick={reset}>
                Next patient
              </Button>
            </div>
          )}
          {verify.isError && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-6">
              <ShieldAlert aria-hidden className="size-10 text-red-600" />
              <p className="mt-3 text-xl font-semibold text-red-900">Do not let through yet</p>
              <p className="mt-2 text-red-900">{errorMessage(verify.error)}</p>
              <Button className="mt-5" variant="secondary" onClick={reset}>
                Start over
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
