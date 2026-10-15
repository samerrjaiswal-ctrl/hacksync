import React, { useState } from 'react';
import type { SlideCategoryAnalysis } from '../../types';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  Sparkles,
  Edit3
} from 'lucide-react';

interface PptFollowUpQuestionsProps {
  categories: SlideCategoryAnalysis[];
  onApplyAnswers: (answeredMap: Record<string, string>) => void;
  onScrollToDescription: () => void;
}

export const PptFollowUpQuestions: React.FC<PptFollowUpQuestionsProps> = ({
  categories,
  onApplyAnswers,
  onScrollToDescription
}) => {
  // Filter categories that have targeted questions (i.e. not fully present)
  const incompleteCategories = categories.filter(
    cat => cat.status !== 'present' && cat.targetedQuestion
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);

  if (incompleteCategories.length === 0) {
    return (
      <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-fade-in">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div>
            <span className="font-semibold text-on-surface block">
              All 10 Pitch Categories Covered!
            </span>
            <span className="text-secondary text-[11px]">
              No pending questions remain. You can review your pitch outlines or proceed to template selection.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (categoryId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [categoryId]: val }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const answeredEntries = Object.entries(answers).filter(([_, val]) => val.trim().length > 0);
    if (answeredEntries.length === 0) return;

    setIsApplying(true);
    const map: Record<string, string> = {};
    for (const [catId, val] of answeredEntries) {
      map[catId] = val.trim();
    }

    onApplyAnswers(map);
    setAnswers({});
    setIsApplying(false);
  };

  const answeredCount = Object.values(answers).filter(v => v.trim().length > 0).length;

  return (
    <div id="complete-your-pitch-section" className="w-full flex flex-col gap-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
        <div>
          <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
            <HelpCircle size={16} className="text-cyan-500" />
            <span>Complete Your Pitch</span>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold">
              {incompleteCategories.length} QUESTIONS REMAINING
            </span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Answer these targeted questions to eliminate gaps. Answers will be integrated into your project description and re-evaluated.
          </p>
        </div>

        <button
          type="button"
          onClick={onScrollToDescription}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Edit3 size={13} />
          <span>Edit Full Description Directly</span>
        </button>
      </div>

      <form onSubmit={handleApply} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {incompleteCategories.map((cat) => (
            <div 
              key={cat.categoryId}
              className="p-3.5 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60 flex flex-col justify-between gap-2.5 shadow-2xs"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono-metadata font-semibold text-secondary">
                    Slide #{cat.categoryNumber}: {cat.title}
                  </span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-surface-container text-secondary border border-outline-variant/60">
                    {cat.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs font-semibold text-on-surface leading-snug">
                  {cat.targetedQuestion}
                </p>
              </div>

              <textarea
                value={answers[cat.categoryId] || ''}
                onChange={(e) => handleInputChange(cat.categoryId, e.target.value)}
                placeholder="Type your response here..."
                rows={2}
                className="w-full px-3 py-2 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs resize-none placeholder:text-secondary/60"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
          <span className="text-xs text-secondary flex items-center gap-1.5">
            <Sparkles size={14} className="text-cyan-500" />
            <span>{answeredCount} answer(s) prepared to merge.</span>
          </span>

          <button
            type="submit"
            disabled={answeredCount === 0 || isApplying}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <Send size={13} />
            <span>Apply Answers &amp; Re-Analyze</span>
          </button>
        </div>
      </form>
    </div>
  );
};
