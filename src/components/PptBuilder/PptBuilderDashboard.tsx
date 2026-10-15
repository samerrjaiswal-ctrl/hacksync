import React, { useState, useEffect } from 'react';
import type { 
  ProjectAnalysisInput, 
  PptProjectAnalysis,
  GroqAiConfig,
  SlideChecklistItem
} from '../../types';
import { 
  getExampleHackathonProject, 
  GROQ_AI_CONFIG,
  fetchGroqAiStatus,
  analyzeProjectWithBackendApi,
  DEFAULT_10_SLIDES,
  getPointWiseStarterTemplate,
  parseHashChecklist,
  getDefaultHashChecklistText,
  analyzeHackathonProject
} from '../../lib/pptAnalyzer';
import { PptChecklistGrid } from './PptChecklistGrid';
import { PptFollowUpQuestions } from './PptFollowUpQuestions';
import { PptReadinessReview } from './PptReadinessReview';
import { PptTemplateSelector } from './PptTemplateSelector';
import { 
  Presentation, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Bot, 
  X, 
  ShieldCheck, 
  RotateCcw, 
  AlertCircle,
  Sliders,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListChecks,
  Edit3,
  Check,
  FileCode
} from 'lucide-react';

interface PptBuilderDashboardProps {
  teamName: string;
}

export type PptDashboardSubTab = 'analysis' | 'review' | 'templates';

export const PptBuilderDashboard: React.FC<PptBuilderDashboardProps> = ({
  teamName
}) => {
  // Input form state
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [hackathonName, setHackathonName] = useState('');
  const [teamNameInput, setTeamNameInput] = useState(teamName || '');
  const [membersDetails, setMembersDetails] = useState('');

  // Hash checklist text state (# 1. Title, # 2. Problem...)
  const [hashChecklistText, setHashChecklistText] = useState<string>(() => getDefaultHashChecklistText());
  const [isHashEditorOpen, setIsHashEditorOpen] = useState(true);

  // Active checklist state calculated dynamically from hash checklist
  const [checklist, setChecklist] = useState<SlideChecklistItem[]>(() => {
    const parsed = parseHashChecklist(getDefaultHashChecklistText());
    return parsed.length > 0 ? parsed : DEFAULT_10_SLIDES;
  });
  
  // Checklist Customizer Modal state
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [tempChecklist, setTempChecklist] = useState<SlideChecklistItem[]>(() => checklist);
  const [batchPasteMode, setBatchPasteMode] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState('');

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<PptDashboardSubTab>('analysis');

  // Analysis result state
  const [analysis, setAnalysis] = useState<PptProjectAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Groq AI Config & Status state
  const [groqStatus, setGroqStatus] = useState<GroqAiConfig>(GROQ_AI_CONFIG);

  // Groq AI Integration Guide Modal
  const [isGroqModalOpen, setIsGroqModalOpen] = useState(false);

  // Fetch backend Groq configuration on mount
  useEffect(() => {
    fetchGroqAiStatus().then(status => {
      setGroqStatus(status);
    });
  }, []);

  // Update checklist dynamically when hash text changes
  const handleHashChecklistChange = (text: string) => {
    setHashChecklistText(text);
    const parsed = parseHashChecklist(text);
    if (parsed.length > 0) {
      setChecklist(parsed);
    }
  };

  // Reset to default hash checklist
  const handleResetDefaultChecklist = () => {
    const defaultText = getDefaultHashChecklistText();
    setHashChecklistText(defaultText);
    const parsed = parseHashChecklist(defaultText);
    setChecklist(parsed);
    setToastMessage(`Reset checklist to ${parsed.length} default slides.`);
  };

  // Open modal with clone of current checklist
  const handleOpenChecklistModal = () => {
    setTempChecklist(JSON.parse(JSON.stringify(checklist)));
    setBatchPasteMode(false);
    setBatchPasteText(checklist.map(s => `# ${s.number}. ${s.title}: ${s.descriptionGuide}`).join('\n'));
    setIsChecklistModalOpen(true);
  };

  // Save changes from modal
  const handleSaveChecklist = () => {
    if (tempChecklist.length === 0) {
      setToastMessage('Checklist must have at least 1 slide.');
      return;
    }
    const normalized: SlideChecklistItem[] = tempChecklist.map((s, idx) => ({
      ...s,
      number: idx + 1,
      id: s.id || `slide_${idx + 1}`
    }));
    setChecklist(normalized);
    setHashChecklistText(normalized.map(s => `# ${s.number}. ${s.title}: ${s.descriptionGuide}`).join('\n'));
    setIsChecklistModalOpen(false);
    setToastMessage(`Checklist updated: ${normalized.length} slides configured!`);
  };

  // Batch parse pasted lines into slides
  const handleBatchReplaceFromText = () => {
    const lines = batchPasteText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setToastMessage('Please enter at least one line with a slide title.');
      return;
    }
    const parsed: SlideChecklistItem[] = lines.map((line, idx) => {
      const cleaned = line.replace(/^(#+\s*|\d+[\.\)]|\-|\•)\s*/, '').trim();
      const colonIdx = cleaned.indexOf(':');
      let title = cleaned;
      let guide = 'Details and evidence for this slide.';
      if (colonIdx > 0) {
        title = cleaned.slice(0, colonIdx).trim();
        guide = cleaned.slice(colonIdx + 1).trim() || guide;
      }
      return {
        id: `custom_slide_${idx + 1}`,
        number: idx + 1,
        title: title || `Slide ${idx + 1}`,
        descriptionGuide: guide,
        defaultQuestion: `What specific details and proof do you have for ${title}?`
      };
    });
    setTempChecklist(parsed);
    setBatchPasteMode(false);
    setToastMessage(`Loaded ${parsed.length} slides from text! Review and click Save.`);
  };

  // Reorder temp checklist item
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tempChecklist.length - 1)) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    const copy = [...tempChecklist];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setTempChecklist(copy);
  };

  // Delete temp checklist item
  const handleRemoveSlideItem = (index: number) => {
    if (tempChecklist.length <= 1) {
      setToastMessage('Checklist must contain at least 1 slide.');
      return;
    }
    setTempChecklist(prev => prev.filter((_, i) => i !== index));
  };

  // Update field in temp item
  const handleUpdateSlideItem = (index: number, field: 'title' | 'descriptionGuide', value: string) => {
    setTempChecklist(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Run Real Groq AI Project Analysis via secure backend endpoint
  const handleAnalyze = async (overrideInput?: Partial<ProjectAnalysisInput>) => {
    const activeChecklist = overrideInput?.customSlides || checklist;
    const input: ProjectAnalysisInput = {
      description: overrideInput?.description !== undefined ? overrideInput.description : description,
      projectName: overrideInput?.projectName !== undefined ? overrideInput.projectName : projectName,
      hackathonName: overrideInput?.hackathonName !== undefined ? overrideInput.hackathonName : hackathonName,
      teamName: overrideInput?.teamName !== undefined ? overrideInput.teamName : teamNameInput,
      membersDetails: overrideInput?.membersDetails !== undefined ? overrideInput.membersDetails : membersDetails,
      customSlides: activeChecklist,
      checklistText: hashChecklistText
    };

    if (!input.description.trim()) {
      setToastMessage(`Please describe your hackathon project to run the ${activeChecklist.length}-slide analysis.`);
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const result = await analyzeProjectWithBackendApi(input);
      setAnalysis(result);
      if (result.categories && result.categories.length > 0) {
        const updatedFromGroq: SlideChecklistItem[] = result.categories.map((c, idx) => ({
          id: c.categoryId,
          number: c.categoryNumber || idx + 1,
          title: c.title,
          descriptionGuide: c.descriptionGuide || '',
          defaultQuestion: c.targetedQuestion
        }));
        setChecklist(updatedFromGroq);
      }
      setToastMessage(`AI Analysis complete for all ${result.categories.length} slides! Pitch readiness: ${result.completionPercentage}%`);
    } catch (err: any) {
      console.warn('Groq AI analysis error, falling back to local analysis engine:', err);
      try {
        const fallback = analyzeHackathonProject(input);
        setAnalysis(fallback);
        setToastMessage(`Project analyzed locally (${fallback.categories.length} slides, ${fallback.completionPercentage}% readiness).`);
      } catch {
        const msg = err.message || 'Groq AI analysis failed. Please verify your backend server connection.';
        setErrorMessage(msg);
        setToastMessage(msg);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load Example Hackathon Project and run live AI analysis
  const handleLoadExample = () => {
    const example = getExampleHackathonProject();
    setDescription(example.description);
    setProjectName(example.projectName || '');
    setHackathonName(example.hackathonName || '');
    setTeamNameInput(example.teamName || '');
    setMembersDetails(example.membersDetails || '');
    setErrorMessage(null);

    // Run real AI analysis on the example input with active checklist
    handleAnalyze({ ...example, customSlides: checklist });
  };

  // Handle follow-up answers merging and re-analysis
  const handleApplyFollowUpAnswers = (answeredMap: Record<string, string>) => {
    const additions = Object.entries(answeredMap)
      .map(([catId, ans]) => `\n\n[Addendum for ${catId.replace(/_/g, ' ').toUpperCase()}]:\n${ans}`)
      .join('');

    const newDescription = description + additions;
    setDescription(newDescription);

    handleAnalyze({ description: newDescription, customSlides: checklist });
  };

  // Scroll to description input helper
  const handleScrollToDescription = () => {
    const el = document.getElementById('project-description-input');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white border border-cyan-500/40 shadow-xl text-xs font-medium backdrop-blur-md animate-fade-in">
          <Sparkles size={14} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ========================================================
          1. HEADER BANNER - Matching Video Link / Git Connect Aesthetics
          ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A0F1D] via-[#0F172A] to-[#0A0F1D] border border-cyan-500/20 shadow-xl p-6 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Presentation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>PPT Builder</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>{checklist.length}-SLIDE CHECKLIST</span>
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                  PITCH PREP
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Turn your hackathon idea into a presentation-ready pitch with dynamic checklists and point-wise outlines.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsGroqModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
              title="View Groq AI architecture preparation details"
            >
              <Bot size={14} />
              <span>Groq AI Spec</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('analysis')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'analysis'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText size={13} />
            <span>1. Project Input &amp; Checklist ({checklist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (analysis) {
                setActiveSubTab('review');
              } else {
                setToastMessage(`Analyze your project first to view the ${checklist.length}-slide review outline.`);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'review'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>2. Readiness Review</span>
            {analysis && (
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {analysis.completionPercentage}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (analysis) {
                setActiveSubTab('templates');
              } else {
                setToastMessage('Analyze your project first before selecting a template.');
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers size={13} />
            <span>3. Template Selection</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SUB-TAB 1: PROJECT INPUT & ANALYSIS WORKFLOW
          ======================================================== */}
      {activeSubTab === 'analysis' && (
        <div className="w-full flex flex-col gap-6">
          {/* Main Input Panel Card */}
          <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs flex flex-col gap-4">
            
            {/* DYNAMIC CHECKLIST CONFIGURATION BAR - No Fixed 10/12 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-container-low/80 border border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <ListChecks size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-on-surface">Dynamic Slide Checklist:</span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold">
                      {checklist.length} Slides Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                    Slides are calculated dynamically from your # checklist. No fixed 10 or 12 limit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsHashEditorOpen(!isHashEditorOpen)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isHashEditorOpen
                      ? 'bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60'
                  }`}
                  title="Toggle custom # slide checklist editor"
                >
                  <Edit3 size={13} />
                  <span>{isHashEditorOpen ? 'Hide # Editor' : 'Edit # Checklist'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaultChecklist}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 transition-all cursor-pointer"
                  title="Reset to default # checklist template"
                >
                  Reset Checklist
                </button>

                <button
                  type="button"
                  onClick={handleOpenChecklistModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Open card manager modal"
                >
                  <Sliders size={13} />
                  <span>Manage Cards</span>
                </button>
              </div>
            </div>

            {/* DYNAMIC HASH CHECKLIST EDITOR BOX */}
            {isHashEditorOpen && (
              <div className="p-4 rounded-xl bg-surface-container-low/90 border border-cyan-500/30 flex flex-col gap-2.5 animate-fade-in shadow-inner">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <ListChecks size={14} className="text-cyan-400" />
                      <span>Hackathon Slide Checklist (# Format)</span>
                    </span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      {checklist.length} Slides Calculated
                    </span>
                  </div>
                  <span className="text-[11px] text-secondary">
                    Each line starting with <code className="text-cyan-400 font-mono-code font-bold">#</code> calculates a slide
                  </span>
                </div>

                <textarea
                  rows={7}
                  value={hashChecklistText}
                  onChange={(e) => handleHashChecklistChange(e.target.value)}
                  placeholder={`# 1. Project Title: Official project name & vision\n# 2. Problem Statement: Core user friction and why it matters\n# 3. Market Gap: Existing alternatives and shortcomings\n# 4. Proposed Solution: Core architecture and concept\n# 5. Live Prototype & Demo: Working proof and verification\n# 6. Team & Conclusion: Members, roles and contact`}
                  className="w-full p-3 bg-surface text-on-surface text-xs rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary font-mono-code leading-relaxed shadow-xs"
                />

                <div className="flex items-center justify-between text-[11px] text-secondary flex-wrap gap-1">
                  <span>Syntax: <code className="text-cyan-400 font-mono-code"># [Slide Title]: [Evaluation Guide]</code></span>
                  <span>Number of slides is 100% dynamic based on user</span>
                </div>
              </div>
            )}

            {/* Input Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Describe Your Hackathon Project</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Point-wise descriptions are ideal for hackathons. No character limits — describe as thoroughly as needed.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Populate input with a sample complete project pitch"
                >
                  <Sparkles size={13} className="text-cyan-500" />
                  <span>Load Example Project</span>
                </button>

                {description && (
                  <button
                    type="button"
                    onClick={() => {
                      setDescription('');
                      setProjectName('');
                      setHackathonName('');
                      setMembersDetails('');
                      setAnalysis(null);
                    }}
                    className="p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                    title="Clear input"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Optional Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-secondary">
                  Project Name (Optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. HackSync"
                  className="w-full px-3 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-secondary">
                  Hackathon Name (Optional)
                </label>
                <input
                  type="text"
                  value={hackathonName}
                  onChange={(e) => setHackathonName(e.target.value)}
                  placeholder="e.g. Hackathon 2026"
                  className="w-full px-3 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-secondary">
                  Team Name (Optional)
                </label>
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="e.g. SyncSquad"
                  className="w-full px-3 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-secondary">
                  Members &amp; Roles (Optional)
                </label>
                <input
                  type="text"
                  value={membersDetails}
                  onChange={(e) => setMembersDetails(e.target.value)}
                  placeholder="e.g. Sameer (Dev), Alex (UI)"
                  className="w-full px-3 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            </div>

            {/* Large Textarea for Project Description with Point-Wise Template Insert */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label htmlFor="project-description-input" className="text-xs font-semibold text-on-surface flex items-center gap-2">
                  <span>Project Description (Point-Wise Recommended)</span>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/15 text-slate-950 dark:text-cyan-200 border border-cyan-500/30 font-bold">
                    No Character Limit
                  </span>
                </label>
                
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(getPointWiseStarterTemplate());
                      setToastMessage('Point-wise hackathon pitch template inserted!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Insert hackathon-ready point-wise project template"
                  >
                    <ListChecks size={13} className="text-cyan-700 dark:text-cyan-400" />
                    <span>Insert Point-Wise Template</span>
                  </button>

                  <span className="text-[11px] text-secondary font-mono-code">
                    {description.length} chars • {wordCount} words
                  </span>
                </div>
              </div>

              <textarea
                id="project-description-input"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your hackathon project description point-wise (e.g., • Problem: ..., • Solution: ..., • Features: ..., • Architecture: ..., • Demo: ...). Evaluates against your active checklist slides with no character limit..."
                className="w-full p-3.5 bg-surface text-on-surface text-xs rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs leading-relaxed resize-y font-mono-body"
              />
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/40">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>
                  Real AI analysis powered by Groq ({groqStatus.activeModel || 'openai/gpt-oss-20b'}) evaluated against {checklist.length} pitch slides. Key strictly protected.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || !description.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <Sparkles size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                  <span>{isAnalyzing ? `Analyzing with Groq AI (${checklist.length} Slides)...` : `Analyze Project Details (${checklist.length} Slides)`}</span>
                </button>
              </div>
            </div>

            {/* Error Message & Recovery Guidance */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2 animate-fade-in">
                <div className="flex items-center gap-2 font-semibold text-rose-200">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>Groq AI Analysis Request Failed</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>
                <div className="text-[11px] text-slate-300 bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-1">
                  <strong className="text-cyan-400">Recovery Guidance:</strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                    <li>Verify that your server environment contains a valid <code className="text-cyan-300 font-mono-code">GROQ_API_KEY</code>.</li>
                    <li>Ensure the configured model (<code className="text-cyan-300 font-mono-code">{groqStatus.activeModel || 'openai/gpt-oss-20b'}</code>) is active and accessible.</li>
                    <li>If rate-limited, wait 10–30 seconds before submitting another analysis request.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Results Display */}
          {analysis && (
            <div className="flex flex-col gap-6">
              {/* Analysis Summary Score Card */}
              <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono-code font-bold text-sm">
                      {analysis.completionPercentage}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-on-surface">{analysis.categories.length}-Slide Analysis Summary</h3>
                        {analysis.modelUsed && (
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1">
                            <Sparkles size={10} className="text-cyan-600 dark:text-cyan-400" />
                            <span>{analysis.modelUsed}</span>
                          </span>
                        )}
                        <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full font-semibold ${
                          analysis.isReadyForTemplateSelection
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : analysis.completionPercentage >= 40
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {analysis.isReadyForTemplateSelection ? 'PITCH READY' : analysis.completionPercentage >= 40 ? 'ALMOST READY' : 'REVISION NEEDED'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {analysis.overallSummary || `${analysis.totalCovered} of ${analysis.categories.length} categories covered with substantive evidence.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('review')}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Review Slide Outlines</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-mono-metadata text-secondary">Present</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {analysis.totalPresent} / {analysis.categories.length}
                    </span>
                    <span className="text-[10px] text-secondary">Strong evidence found</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-mono-metadata text-secondary">Partially Covered</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {analysis.totalPartiallyCovered}
                    </span>
                    <span className="text-[10px] text-secondary">Brief mention; details needed</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-mono-metadata text-secondary">Needs Verification</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                      {analysis.totalNeedsVerification}
                    </span>
                    <span className="text-[10px] text-secondary">Requires prototype proof</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-mono-metadata text-secondary">Missing</span>
                    <span className={`font-bold text-sm ${analysis.totalMissing > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {analysis.totalMissing}
                    </span>
                    <span className="text-[10px] text-secondary">Zero information provided</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Checklist Grid */}
              <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs">
                <PptChecklistGrid 
                  categories={analysis.categories} 
                  onFocusCategoryQuestion={() => {
                    const section = document.getElementById('complete-your-pitch-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>

              {/* Follow-Up Questions Section */}
              <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs">
                <PptFollowUpQuestions
                  categories={analysis.categories}
                  onApplyAnswers={handleApplyFollowUpAnswers}
                  onScrollToDescription={handleScrollToDescription}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: READINESS REVIEW
          ======================================================== */}
      {activeSubTab === 'review' && analysis && (
        <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs">
          <PptReadinessReview
            analysis={analysis}
            onProceedToTemplates={() => setActiveSubTab('templates')}
            onReturnToInput={() => setActiveSubTab('analysis')}
          />
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: TEMPLATE SELECTION (Frontend Only)
          ======================================================== */}
      {activeSubTab === 'templates' && (
        <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs">
          <PptTemplateSelector
            projectName={projectName || analysis?.projectName || 'Hackathon Project'}
            onReturnToReview={() => setActiveSubTab(analysis ? 'review' : 'analysis')}
            analysis={analysis}
          />
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT / REPLACE SLIDES CHECKLIST
          ======================================================== */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-container-lowest/95 dark:bg-[#0A0F1D]/95 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 my-2 text-on-surface">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                    <span>Customize &amp; Replace Slide Checklist</span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 font-bold">
                      {tempChecklist.length} Slides
                    </span>
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Tailor your pitch slides according to specific hackathon evaluation guidelines.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChecklistModalOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Actions & Template Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-secondary font-medium text-[11px]">Template:</span>
                <button
                  type="button"
                  onClick={() => setTempChecklist(parseHashChecklist(getDefaultHashChecklistText()))}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Default # Checklist
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!batchPasteMode) {
                      setBatchPasteText(tempChecklist.map(s => `${s.number}. ${s.title}: ${s.descriptionGuide}`).join('\n'));
                    }
                    setBatchPasteMode(!batchPasteMode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-slate-950 dark:text-cyan-200 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCode size={13} />
                  <span>{batchPasteMode ? 'Switch to Card View' : 'Batch Paste from Text'}</span>
                </button>
              </div>
            </div>

            {/* Batch Paste Mode */}
            {batchPasteMode ? (
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Paste Hackathon Slide Checklist (One Slide Per Line)</span>
                  <span className="text-[11px] text-secondary">e.g. 1. Title, 2. Problem, ...</span>
                </label>
                <textarea
                  rows={10}
                  value={batchPasteText}
                  onChange={(e) => setBatchPasteText(e.target.value)}
                  placeholder={`1. Title Slide: Project name and team members\n2. Problem Statement: Core user pain points\n3. Existing Solutions: Market shortcomings\n4. Proposed Solution: How our application works\n5. Key Features: Unique value points\n6. System Architecture: End-to-end user workflow\n7. Tech Stack: Frontend, backend, database\n8. Demo & Prototype: Working screenshots and status\n9. Impact & Feasibility: Audience and scalability\n10. Conclusion & Team: Team roles and contact`}
                  className="w-full p-3 bg-surface text-on-surface text-xs rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary font-mono-code leading-relaxed"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBatchPasteMode(false)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-secondary hover:text-on-surface cursor-pointer"
                  >
                    Back to List
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchReplaceFromText}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Parse &amp; Replace Checklist
                  </button>
                </div>
              </div>
            ) : (
              /* Individual Slide Cards List */
              <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {tempChecklist.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-start gap-3 hover:border-outline-variant transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface-container text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono-code font-bold text-xs shrink-0 mt-1">
                      {idx + 1}
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={slide.title}
                          onChange={(e) => handleUpdateSlideItem(idx, 'title', e.target.value)}
                          placeholder={`Slide ${idx + 1} Title`}
                          className="flex-1 px-2.5 py-1 bg-surface text-on-surface text-xs font-semibold rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <input
                        type="text"
                        value={slide.descriptionGuide}
                        onChange={(e) => handleUpdateSlideItem(idx, 'descriptionGuide', e.target.value)}
                        placeholder="What should be covered in this slide? (Evaluation criteria)"
                        className="w-full px-2.5 py-1 bg-surface text-secondary text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Move & Delete Controls */}
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-secondary hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container cursor-pointer"
                        title="Move slide up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, 'down')}
                        disabled={idx === tempChecklist.length - 1}
                        className="p-1 rounded text-secondary hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container cursor-pointer"
                        title="Move slide down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlideItem(idx)}
                        disabled={tempChecklist.length <= 1}
                        className="p-1 rounded text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-500/10 cursor-pointer ml-1"
                        title="Delete slide"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Slide Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = tempChecklist.length + 1;
                    setTempChecklist(prev => [
                      ...prev,
                      {
                        id: `custom_slide_${Date.now()}`,
                        number: nextNum,
                        title: `Slide ${nextNum}`,
                        descriptionGuide: 'Key metrics, architecture, or takeaways for this slide.',
                        defaultQuestion: `What specific details and outcomes cover Slide ${nextNum}?`
                      }
                    ]);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/5 text-cyan-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Slide ({tempChecklist.length + 1})</span>
                </button>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40">
              <span className="text-[11px] text-secondary font-mono-code">
                {tempChecklist.length} slides will be evaluated by Groq AI
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-outline-variant text-xs text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChecklist}
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Save &amp; Apply Checklist</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: GROQ AI INTEGRATION SPECIFICATION
          ======================================================== */}
      {isGroqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest/95 dark:bg-[#0A0F1D]/95 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 my-2 text-on-surface">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-cyan-500" />
                <h3 className="font-semibold text-sm text-on-surface">Groq AI Integration — Active Specification</h3>
              </div>
              <button
                onClick={() => setIsGroqModalOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-secondary leading-relaxed flex flex-col gap-3">
              <p>
                Groq AI analysis is integrated via a secure server-side Node.js proxy endpoint (<code className="font-mono-code text-cyan-300">/api/groq-analyze</code>). The client frontend never interacts with Groq directly or handles API keys.
              </p>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-1.5 font-mono-code text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Provider:</span>
                  <span className="text-on-surface font-semibold">{groqStatus.provider}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Configured Model:</span>
                  <span className="text-cyan-400 font-semibold">{groqStatus.activeModel || groqStatus.defaultModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Status:</span>
                  <span className={`font-semibold ${groqStatus.isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {groqStatus.isConfigured ? 'Active & Connected (Server Proxy)' : 'Pending Server Key Configuration'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Active Checklist:</span>
                  <span className="text-cyan-400 font-semibold">{checklist.length} Slides (Dynamic)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Endpoint:</span>
                  <span className="text-on-surface">POST /api/groq-analyze</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-1 text-[11px]">
                <span className="font-semibold text-on-surface flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Security &amp; Architecture Standards:</span>
                </span>
                <ul className="list-disc pl-4 space-y-1 text-secondary">
                  <li>API keys reside strictly in server-side environment variables (<code className="font-mono-code">GROQ_API_KEY</code>).</li>
                  <li>Zero client-side key exposure: not present in Vite bundles or browser storage.</li>
                  <li>Dynamic checklist support: evaluate any 10, 12, or custom N-slide pitch deck structure.</li>
                  <li>Point-wise pitch deck outlines generated specifically for hackathon presentations.</li>
                  <li>Gracefully handles timeouts (35s), rate limits (429), and model errors without silent mock fallback.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setIsGroqModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs cursor-pointer"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
