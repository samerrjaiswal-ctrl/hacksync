import React from 'react';
import type { SlideCategoryAnalysis, SlideCoverageStatus } from '../../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Quote, 
  ArrowRight
} from 'lucide-react';

interface PptChecklistGridProps {
  categories: SlideCategoryAnalysis[];
  onFocusCategoryQuestion?: (categoryId: string) => void;
}

const statusConfig: Record<SlideCoverageStatus, {
  label: string;
  badgeClass: string;
  borderClass: string;
  icon: React.ReactNode;
}> = {
  present: {
    label: 'Present',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/30 hover:border-emerald-500/50',
    icon: <CheckCircle2 size={13} className="text-emerald-500" />
  },
  partially_covered: {
    label: 'Partially Covered',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/30 hover:border-amber-500/50',
    icon: <Clock size={13} className="text-amber-500" />
  },
  needs_verification: {
    label: 'Needs Verification',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    borderClass: 'border-cyan-500/30 hover:border-cyan-500/50',
    icon: <ShieldAlert size={13} className="text-cyan-500" />
  },
  missing: {
    label: 'Missing',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    borderClass: 'border-rose-500/30 hover:border-rose-500/50',
    icon: <AlertCircle size={13} className="text-rose-500" />
  }
};

export const PptChecklistGrid: React.FC<PptChecklistGridProps> = ({
  categories,
  onFocusCategoryQuestion
}) => {
  return (
    <div className="w-full flex flex-col gap-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
        <div>
          <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
            <span>{categories.length}-Slide Pitch Category Checklist</span>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold">
              EVALUATION
            </span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Transparent breakdown of evidence, gaps, and verification status across all {categories.length} slides.
          </p>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono-code">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Present</span>
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Partial</span>
          </span>
          <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span>Verify</span>
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Missing</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {categories.map((cat) => {
          const cfg = statusConfig[cat.status];

          return (
            <div 
              key={cat.categoryId}
              id={`slide-card-${cat.categoryId}`}
              className={`p-4 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border ${cfg.borderClass} transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs`}
            >
              <div className="flex flex-col gap-2">
                {/* Header Row: Slide Number + Title + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-surface-container text-secondary flex items-center justify-center font-mono-code text-xs font-bold border border-outline-variant/60 shrink-0">
                      {cat.categoryNumber}
                    </span>
                    <div>
                      <h4 className="font-semibold text-xs text-on-surface leading-tight">
                        {cat.title}
                      </h4>
                      <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                        {cat.descriptionGuide}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-semibold border flex items-center gap-1 shrink-0 ${cfg.badgeClass}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </span>
                </div>

                {/* Evidence Section (if any provided) */}
                {cat.evidenceText.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1 p-2 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-[11px]">
                    <span className="font-semibold text-secondary flex items-center gap-1 text-[10px] uppercase font-mono-metadata tracking-wider">
                      <Quote size={11} className="text-primary" />
                      <span>Evidence Found in Description:</span>
                    </span>
                    <ul className="space-y-1 text-on-surface">
                      {cat.evidenceText.slice(0, 2).map((ev, idx) => (
                        <li key={idx} className="line-clamp-2 pl-2 border-l-2 border-primary/40 italic text-[11px]">
                          "{ev}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Details / Gaps */}
                {cat.missingDetails.length > 0 && (
                  <div className="flex flex-col gap-1 text-[11px]">
                    <span className="font-semibold text-secondary text-[10px] uppercase font-mono-metadata tracking-wider">
                      Required Additions:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-secondary">
                      {cat.missingDetails.map((gap, idx) => (
                        <li key={idx} className="leading-snug">
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer Row: Assessment Note & Action */}
              <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-secondary truncate text-[10px]">
                  {cat.notes}
                </span>

                {cat.status !== 'present' && onFocusCategoryQuestion && (
                  <button
                    type="button"
                    onClick={() => onFocusCategoryQuestion(cat.categoryId)}
                    className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px] shrink-0 cursor-pointer"
                  >
                    <span>Answer Gap</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
