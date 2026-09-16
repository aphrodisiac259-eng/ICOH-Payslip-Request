/**
 * ICOH Portal - Footer
 */

import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-xs">
            I
          </div>
          <div>
            <p className="font-medium text-slate-300">
              Intercountry Centre for Oral Health (ICOH) for Africa, Jos
            </p>
            <p className="text-slate-500 text-[11px]">
              Federal Ministry of Health and Social Welfare &bull; WHO Collaborating Centre
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            256-bit Encrypted Payroll Vault
          </span>
          <span>&bull;</span>
          <span>Security & Privacy Protocol</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Payroll Desk: payroll@icoh.org.ng
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-slate-800/80 text-center text-slate-500 text-[10px]">
        &copy; {new Date().getFullYear()} Intercountry Centre for Oral Health for Africa. All Rights Reserved. Restricted to Authorized Personnel Only.
      </div>
    </footer>
  );
};
