import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Building2, LogOut, UserRoundCog } from 'lucide-react';
import { useMedCore } from '@/context/MedCoreContext';
import { UniversalSearch } from './UniversalSearch';
import { NotificationCenter } from '../notifications/NotificationCenter';
export const GlobalCommandBar:React.FC=()=>{
  const {currentUser,logout,requestConfirmation,beginAccountSwitch}=useMedCore();
  const [open,setOpen]=useState(false),[switching,setSwitching]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  const accounts=[['Elena Santos','elena.santos@stjude.ph'],['Arthur Delgado','arthur.delgado@stjude.ph'],['Dr. Carlos Mendoza','carlos.mendoza@stjude.ph'],['Kristine Ramos','kristine.ramos@stjude.ph'],['Grace Tan','grace.tan@stjude.ph'],['Bert Aquino','bert.aquino@stjude.ph']];
  const change=async(email='')=>{setSwitching(true);try{await beginAccountSwitch(email);}finally{setSwitching(false);setOpen(false);}};
  return <header className="no-print h-12 border-b border-slate-200 bg-white px-3 sm:px-4 grid grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(160px,640px)_minmax(0,1fr)] items-center gap-3 z-30 sticky top-0 shadow-2xs">
    <div className="flex items-center gap-2 shrink-0"><img src="/logo/MedCore_Badge_Logo.png" alt="MedCore" className="h-7 w-auto"/><div><div className="flex items-center gap-1.5"><span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-none">MedCore</span><span className="hidden sm:block text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded">v2.4</span></div><div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 mt-0.5"><Building2 className="h-2.5 w-2.5" aria-hidden="true"/>{currentUser?.facilityName||'St. Jude Medical Center Manila'}</div></div></div>
    <UniversalSearch/>
    <div className="flex items-center justify-self-end gap-2"><NotificationCenter/><div ref={root} className="relative">
      <button ref={trigger} type="button" aria-label="Staff account menu" aria-expanded={open} aria-controls="staff-account-menu" onClick={()=>setOpen(value=>!value)} className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{(currentUser?.fullName||'Staff').split(' ').map((name:string)=>name[0]).join('').slice(0,2)}</span>
        <span className="hidden sm:block text-left"><span className="block text-xs font-semibold text-slate-900">{currentUser?.fullName||'Staff account'}</span><span className="mt-0.5 block text-[10px] text-slate-500">{currentUser?.title||currentUser?.role?.replace(/_/g,' ')}</span></span><ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true"/>
      </button>
      {open&&<div id="staff-account-menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        <p className="px-2 py-2 text-xs font-semibold text-slate-900">Switch staff account</p><p className="px-2 pb-2 text-[11px] text-slate-500">Sign in to change identity and permissions.</p>
        {accounts.map(([name,email])=><button key={email} type="button" disabled={switching||email===currentUser?.email} onClick={()=>void change(email)} className="block w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500">{name}</button>)}
        <button type="button" disabled={switching} onClick={()=>void change()} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"><UserRoundCog className="h-4 w-4"/>Use another account</button>
        <button type="button" onClick={()=>{setOpen(false);requestConfirmation({title:'Sign Out & Lock Workstation',description:'End this staff session and lock the workstation?',confirmLabel:'Sign Out',variant:'warning',onConfirm:logout});}} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-2 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-blue-500"><LogOut className="h-4 w-4"/>Sign Out &amp; Lock Workstation</button>
      </div>}
    </div></div>
  </header>;
};
