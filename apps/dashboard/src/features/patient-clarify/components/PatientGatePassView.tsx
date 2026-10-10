import React from 'react';
import {DischargePass} from '@/types/domain';
import GatePassQr from '@/components/common/GatePassQr';
import {gatePassPayload} from '../../../../../shared/gatePassPayload';
import {formatPstDateTime} from '../utils/billFormatters';
import {ArrowLeft} from 'lucide-react';
interface Props {gatePass?:DischargePass;patientName:string;roomBed:string;attendingDoctor?:string;onBack?:()=>void}
export const PatientGatePassView:React.FC<Props>=({gatePass,patientName,roomBed,attendingDoctor,onBack})=>{
  const payload=gatePass?gatePassPayload(gatePass):null;
  return <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
    <div className="relative bg-emerald-600 p-5 text-center text-white">
      {onBack&&<button aria-label="Back to patient statement" onClick={onBack} className="absolute left-4 top-5 rounded-lg p-1.5 hover:bg-emerald-700"><ArrowLeft className="h-5 w-5"/></button>}
      <h3 className="text-lg font-bold">Digital discharge pass</h3><p className="text-xs">St. Jude Medical Center — Manila</p>
    </div>
    <div className="space-y-4 p-6 text-center">
      {gatePass&&<p className="font-mono text-lg font-bold">{gatePass.passNumber}</p>}
      {payload?<><GatePassQr payload={payload}/><p className="text-xs text-slate-500">Exit PIN</p><p className="font-mono text-3xl font-bold tracking-[0.25em]">{gatePass!.exitPin}</p><p className="text-xs text-slate-500">Show the QR and private PIN to lobby staff. The hospital verifies this pass online.</p></>:<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{gatePass?.status==='VERIFIED_AT_LOBBY'?'Exit already verified. This pass cannot be reused.':'No active discharge pass is available. Contact hospital billing.'}</p>}
      <dl className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs">
        <div><dt className="text-slate-500">Patient</dt><dd className="font-bold">{patientName}</dd></div>
        <div><dt className="text-slate-500">Room / Bed</dt><dd>{roomBed}</dd></div>
        <div><dt className="text-slate-500">Attending physician</dt><dd>{attendingDoctor||'Not provided'}</dd></div>
        {gatePass&&<div><dt className="text-slate-500">Issued</dt><dd>{formatPstDateTime(gatePass.issuedAt)}</dd></div>}
      </dl>
    </div>
  </div>;
};
