import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPhp } from '../../utils/formatters';
import {
  Zap,
  TrendingUp,
  Bed,
  CheckCircle,
  Coins,
  ShieldCheck,
  Scale
} from 'lucide-react';

export const VelocityRecoveryPulse: React.FC = () => {
  return (
    <footer className="h-14 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0 overflow-x-auto text-xs">
      <div className="flex items-center gap-6 min-w-max">
        {/* Metric 1: Avg Discharge Turnaround Time */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              24h Avg TAT
            </div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>34.2 mins</span>
              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                (-88% vs 4.8h baseline)
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />

        {/* Metric 2: Bed-Hours Reclaimed */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Bed className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Bed-Hours Reclaimed
            </div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>28.5 Bed-Hours</span>
              <span className="text-[10px] font-normal text-sky-600 dark:text-sky-400">
                (+4 ER turns enabled)
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />

        {/* Metric 3: First-Pass Clean Claim Rate */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Clean Claim Rate
            </div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>96.4%</span>
              <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">
                (PhilHealth eClaims 3.0)
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />

        {/* Metric 4: Point-of-Sale / Digital Collections */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              24h Digital POS Collections
            </div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>₱384,200</span>
              <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                (QR Ph / Maya / GCash)
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />

        {/* Metric 5: RA 9439 Promissory Recovery */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              RA 9439 Promissory Recovery
            </div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>88.2%</span>
              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                (Zero Detention Violations)
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
