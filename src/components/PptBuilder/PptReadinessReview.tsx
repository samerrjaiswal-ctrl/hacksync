import React from 'react';
import type { PptProjectAnalysis } from '../../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight, 
  ArrowLeft,
  ListOrdered
} from 'lucide-react';

interface PptReadinessReviewProps {
  analysis: PptProjectAnalysis;
  onProceedToTemplates: () => void;
  onReturnToInput: () => void;
}

export const PptReadinessReview: React.FC<PptReadinessReviewProps> = ({
  analysis,
  onProceedToTemplates,
  onReturnToInput
}) => {
  const {
    projectName,
    categories,
    completionPercentage,
    totalPresent,
    totalPartiallyCovered,
    totalMissing,
    totalNeedsVerification,
    isReadyForTemplateSelection,
    unresolvedQuestions
  } = analysis;

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in text-on-surface">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span>{categories.length}-Slide Pitch Deck Review: {projectName}</span>
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-semibold ${
              isReadyForTemplateSelection
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}>
              {isReadyForTemplateSelection ? 'PITCH READY' : 'REVISION REQUIRED'}
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Slide-by-slide structure, verified outlines, and final readiness verification.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToInput}
          className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft size={13} />
          <span>Back to Project Input</span>
        </button>
      </div>

      {/* Completeness Summary Banner */}
      <div className="p-4 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-on-surface">Overall Pitch Readiness Score:</span>
          <span className="text-xs font-mono-code font-bold text-primary">{completionPercentage}% Completed</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              completionPercentage >= 80 ? 'bg-emerald-500' : completionPercentage >= 60 ? 'bg-cyan-500' : 'bg-amber-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-lg bg-surface-container flex flex-col">
            <span className="text-[10px] uppercase font-mono-metadata text-secondary">Present</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalPresent}/{categories.length} Slides</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-container flex flex-col">
            <span className="text-[10px] uppercase font-mono-metadata text-secondary">Partial</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{totalPartiallyCovered} Slides</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-container flex flex-col">
            <span className="text-[10px] uppercase font-mono-metadata text-secondary">Verify</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">{totalNeedsVerification} Slides</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-container flex flex-col">
            <span className="text-[10px] uppercase font-mono-metadata text-secondary">Missing</span>
            <span className={`font-semibold ${totalMissing > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{totalMissing} Slides</span>
          </div>
        </div>
      </div>

      {/* Unresolved Questions Callout (if any) */}
      {unresolvedQuestions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-secondary">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-on-surface">
              Unresolved Items Detected ({unresolvedQuestions.length}):
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              {unresolvedQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 10-Slide Outlines Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5 uppercase font-mono-metadata tracking-wider">
            <ListOrdered size={14} className="text-cyan-500" />
            <span>Slide Content Outlines ({categories.length} Slides)</span>
          </h4>
          <span className="text-[11px] text-secondary font-mono-code">16:9 Presentation Format</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.map((cat) => (
            <div 
              key={cat.categoryId}
              className="p-4 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60 flex flex-col justify-between gap-3 shadow-2xs"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-surface-container text-secondary flex items-center justify-center font-mono-code text-[11px] font-bold">
                      {cat.categoryNumber}
                    </span>
                    <h5 className="font-semibold text-xs text-on-surface">
                      {cat.title}
                    </h5>
                  </div>
                  <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full font-semibold ${
                    cat.status === 'present'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : cat.status === 'needs_verification'
                      ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                      : cat.status === 'partially_covered'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {cat.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                {/* Outline Items */}
                <div className="flex flex-col gap-1 text-[11px]">
                  <span className="font-semibold text-secondary text-[10px] uppercase font-mono-metadata">
                    Key Bullet Points:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-on-surface">
                    {(cat.contentOutline || []).map((pt, idx) => (
                      <li key={idx} className="leading-snug">{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Status Note */}
              <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-secondary">
                {cat.notes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Action Footer */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          {isReadyForTemplateSelection ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span className="text-on-surface">
                <strong>Pitch Deck Verified:</strong> All 10 slide categories have sufficient details to proceed to template selection.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span className="text-secondary">
                Some categories are still missing. You can answer the follow-up questions or proceed if you prefer.
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onProceedToTemplates}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all self-end sm:self-auto shrink-0"
        >
          <span>Continue to Template Selection</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
