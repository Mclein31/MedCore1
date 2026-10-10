import { matchesEncounterSearch } from '@/utils/encounterSearch';
import React, { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/components/common';
import { useMedCore } from '@/context/MedCoreContext';
export const UniversalSearch:React.FC=()=>{
  const {searchQuery,setSearchQuery,encounters,selectEncounter,setActiveRoute,setActiveFilter}=useMedCore();
  const [open,setOpen]=useState(false),[selected,setSelected]=useState(0);
  const input=useRef<HTMLInputElement>(null),root=useRef<HTMLDivElement>(null);
  const query=searchQuery.trim().toLowerCase();
  const matches=encounters.filter(enc=>matchesEncounterSearch(enc,query)).slice(0,8);
  useEffect(()=>{
    const keyboard=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();input.current?.focus();setOpen(true);}if(event.key==='Escape')setOpen(false);};
    const outside=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    window.addEventListener('keydown',keyboard);document.addEventListener('mousedown',outside);
    return()=>{window.removeEventListener('keydown',keyboard);document.removeEventListener('mousedown',outside);};
  },[]);
  const choose=(id:string)=>{selectEncounter(id);setActiveFilter('ALL');setSearchQuery('');setActiveRoute('DISCHARGE_CLEARANCE');setOpen(false);};
  return <div ref={root} className="relative min-w-0 w-full max-w-2xl justify-self-center">
    <SearchInput ref={input} type="search" size="sm" value={searchQuery} onChange={value=>{setSearchQuery(value);setSelected(0);setOpen(true);}} onFocus={()=>setOpen(true)}
      aria-label="Universal search" placeholder="Search patients, MRNs, bills…" role="combobox" aria-autocomplete="list" aria-expanded={open&&!!query} aria-controls="universal-search-results"
      aria-activedescendant={open&&query&&matches[selected]?`search-result-${selected}`:undefined} wrapperClassName="w-full" className="w-full"
      onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setSelected(index=>Math.max(0,Math.min(index+1,matches.length-1)));}if(event.key==='ArrowUp'){event.preventDefault();setSelected(index=>Math.max(0,index-1));}if(event.key==='Enter'&&query&&matches[selected]){event.preventDefault();choose(matches[selected].id);}}}/>
    {open&&query&&<div id="universal-search-results" role="listbox" aria-label="Matching patients and encounters" className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
      {matches.length===0?<p className="p-4 text-xs text-slate-500">No matching hospital records.</p>:matches.map((enc,index)=><button key={enc.id} id={`search-result-${index}`} type="button" role="option" aria-selected={index===selected} onClick={()=>choose(enc.id)} className={`block w-full px-4 py-3 text-left text-xs hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 ${index===selected?'bg-blue-50/60':''}`}><span className="block font-semibold text-slate-900">{enc.patient.fullName||enc.patient.maskedName}</span><span className="mt-1 block text-slate-500">{enc.patient.mrn} · {enc.roomBed} · {enc.encounterNumber}</span></button>)}
    </div>}
  </div>;
};
