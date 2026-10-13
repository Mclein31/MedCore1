import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, CheckCheck, CreditCard, ShieldCheck, TriangleAlert, X } from '@/components/common/SolarIcons';
import { useMedCore } from '@/context/MedCoreContext';
import type { StaffNotification } from '../../../../shared/notifications';

export function relativeNotificationTime(timestamp:string):string {
  const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(timestamp))/60000));
  return minutes<1?'Just now':minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:`${Math.floor(minutes/1440)}d ago`;
}
export const NotificationCenter:React.FC=()=>{
  const {notifications,unreadNotificationCount,notificationError,refreshNotifications,markNotificationsRead,
    selectEncounter,setActiveRoute,setSearchQuery,setActiveFilter}=useMedCore();
  const [open,setOpen]=useState(false),[filter,setFilter]=useState('All'),[marking,setMarking]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open) return;
    close.current?.focus();
    const outside=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  const mark=async(ids:string[])=>{setMarking(true);try{await markNotificationsRead(ids);}catch{/* Keep unread flags and render the server error. */}finally{setMarking(false);}};
  const visit=(item:StaffNotification)=>{
    selectEncounter(item.encounterId);setSearchQuery('');setActiveFilter('ALL');setActiveRoute('DISCHARGE_CLEARANCE');setOpen(false);
    if(!item.read)void mark([item.id]);
  };
  const items=notifications.filter(item=>filter==='All'||filter==='Payments'&&item.type==='PAYMENT'||filter==='Discharges'&&['STAGE','GATE_PASS'].includes(item.type)||filter==='Alerts'&&['HMO','DISPUTE'].includes(item.type));
  return <div ref={root} className="relative shrink-0" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
    <button ref={trigger} type="button" aria-label={`Hospital notifications${unreadNotificationCount?`, ${unreadNotificationCount} unread`:''}`} aria-expanded={open} aria-controls="hospital-notifications" aria-haspopup="dialog"
      onClick={()=>{setOpen(value=>!value);if(!open)void refreshNotifications();}}
      className="relative h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <Bell className="w-5 h-5" aria-hidden="true"/>{unreadNotificationCount>0&&<span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{unreadNotificationCount>99?'99+':unreadNotificationCount}</span>}
    </button>
    {open&&<section id="hospital-notifications" role="dialog" aria-labelledby="notification-title" className="absolute right-0 top-full mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
      <div className="flex items-start gap-2 border-b border-slate-100 p-4"><div className="min-w-0 flex-1"><h2 id="notification-title" className="text-sm font-bold leading-5 text-slate-900">Hospital Operational Telemetry &amp; Notifications</h2><p className="mt-1 text-xs text-slate-500">Latest hospital updates</p></div>
        <button ref={close} type="button" aria-label="Close notifications" onClick={()=>{setOpen(false);trigger.current?.focus();}} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"><X className="h-4 w-4"/></button></div>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2"><div role="group" aria-label="Notification filters" className="flex flex-wrap gap-1">{['All','Payments','Discharges','Alerts'].map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)} className={`rounded-md px-2 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 ${filter===value?'bg-blue-50 text-blue-700':'text-slate-500 hover:bg-slate-50'}`}>{value}</button>)}</div></div>
      <div className="flex justify-end px-3 py-2"><button type="button" disabled={marking||!unreadNotificationCount} onClick={()=>void mark(notifications.filter(item=>!item.read).map(item=>item.id))} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 disabled:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500"><CheckCheck className="h-3.5 w-3.5"/>{marking?'Saving…':'Mark all as read'}</button></div>
      {notificationError&&<div role="alert" className="mx-3 mb-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Could not refresh hospital updates. Your last confirmed read state is retained.<button type="button" className="ml-2 underline font-semibold" onClick={()=>void refreshNotifications()}>Retry</button></div>}
      <div className="max-h-[min(28rem,65vh)] overflow-y-auto overscroll-contain">{items.length===0?<p className="px-4 py-8 text-center text-sm text-slate-500">{notificationError?'Updates are temporarily unavailable.':'No hospital updates in this filter.'}</p>:items.map(item=>{
        const Icon=item.type==='PAYMENT'?CreditCard:item.type==='GATE_PASS'?ShieldCheck:item.type==='DISPUTE'?TriangleAlert:ArrowUpRight;
        const tone=item.type==='PAYMENT'?'bg-emerald-50 text-emerald-700':item.type==='GATE_PASS'?'bg-purple-50 text-purple-700':item.type==='DISPUTE'?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700';
        return <button key={item.id} type="button" onClick={()=>visit(item)} className={`flex w-full gap-3 border-t border-slate-100 p-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${item.read?'bg-white':'bg-blue-50/30'}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" aria-hidden="true"/></span>
          <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="text-xs font-semibold text-slate-900 flex-1">{item.title}</span>{!item.read&&<span aria-label="Unread" className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600"/>}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span><time dateTime={item.timestamp} className="mt-1 block text-[11px] text-slate-400">{relativeNotificationTime(item.timestamp)}</time></span>
        </button>;
      })}</div>
    </section>}
  </div>;
};
