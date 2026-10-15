import React, { useState, useRef } from 'react';
import type { 
  SelectedPptTemplate, 
  PptTemplateOption, 
  PptProjectAnalysis, 
  PptxGenerationResult,
  PptxParsedTemplate
} from '../../types';
import { generateHackathonPptx } from '../../lib/pptxGenerator';
import { parseUploadedPptxTemplate } from '../../lib/pptxTemplateParser';
import { 
  Upload, 
  Layers, 
  Check, 
  FileText, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft,
  Presentation,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sun
} from 'lucide-react';

interface PptTemplateSelectorProps {
  projectName: string;
  onReturnToReview: () => void;
  analysis?: PptProjectAnalysis | null;
}

export const PptTemplateSelector: React.FC<PptTemplateSelectorProps> = ({
  projectName,
  onReturnToReview,
  analysis
}) => {
  const [selectedOption, setSelectedOption] = useState<PptTemplateOption>('default_hacksync');
  const [customFile, setCustomFile] = useState<{ name: string; size: number } | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<PptxParsedTemplate | null>(null);
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<PptxGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate .pptx file extension
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setUploadError('Invalid format: Only .pptx PowerPoint files are supported.');
      e.target.value = '';
      return;
    }

    // Validate size limit (max 25MB)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File is too large: Maximum allowed template size is 25MB.');
      e.target.value = '';
      return;
    }

    setUploadError(null);
    setIsParsingTemplate(true);

    try {
      const parsed = await parseUploadedPptxTemplate(file, file.name);
      setParsedTemplate(parsed);
      setCustomFile({
        name: file.name,
        size: file.size
      });
      setSelectedOption('custom_upload');
    } catch (err: any) {
      console.error('Template parsing error:', err);
      setUploadError(err.message || 'Failed to inspect PowerPoint template structure.');
      setCustomFile(null);
      setParsedTemplate(null);
    } finally {
      setIsParsingTemplate(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setCustomFile(null);
    setParsedTemplate(null);
    setUploadError(null);
    setSelectedOption('default_hacksync');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Real PPTX Generation Action
  const handleGeneratePptx = async () => {
    if (!analysis || !analysis.categories || analysis.categories.length === 0) {
      setGenerationError('Cannot generate PowerPoint: No analyzed project categories found. Please complete project input and analysis first.');
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    try {
      const result = await generateHackathonPptx(analysis, {
        templateOption: selectedOption,
        customFileName: customFile?.name,
        parsedTemplate: selectedOption === 'custom_upload' ? parsedTemplate || undefined : undefined
      });
      setGenerationResult(result);
    } catch (err: any) {
      console.error('PPTX generation error:', err);
      setGenerationError(err.message || 'An error occurred while generating the PowerPoint presentation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const templateState: SelectedPptTemplate = {
    option: selectedOption,
    customFileName: customFile?.name,
    customFileSize: customFile?.size,
    parsedTemplate: parsedTemplate || undefined,
    selectedAt: new Date(),
    status: isGenerating ? 'generating' : generationResult ? 'generated' : 'selected_generation_pending'
  };

  const slideCount = analysis?.categories?.length || 10;
  const missingCount = analysis?.totalMissing || 0;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
              <Presentation size={16} className="text-primary" />
              <span>Select Slide Template &amp; Generate Deck</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-500/15 text-slate-950 dark:text-cyan-200 border border-cyan-500/40">
              16:9 RATIO • {slideCount} SLIDES
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Export a high-impact, fully editable PowerPoint pitch deck formatted for hackathon judging panels.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToReview}
          className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft size={13} />
          <span>Back to Slide Review</span>
        </button>
      </div>

      {/* Template Selection Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* OPTION 1: Use HackSync Default Dark Theme */}
        <div 
          onClick={() => setSelectedOption('default_hacksync')}
          className={`p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-4 border ${
            selectedOption === 'default_hacksync'
              ? 'bg-surface-container-lowest/90 dark:bg-[#0A0F1D]/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
              : 'bg-surface-container-low/70 dark:bg-slate-900/40 border-outline-variant/60 hover:border-outline-variant'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-on-surface">Option B: HackSync Default Theme</h4>
                  <span className="text-[10px] text-secondary font-mono-code">Native Dark Pitch • 16:9</span>
                </div>
              </div>

              {selectedOption === 'default_hacksync' && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Clean, high-contrast dark navy &amp; cyan aesthetic matching HackSync's design system. Every shape, card, and bullet is 100% editable in PowerPoint.
            </p>

            {/* Dark Theme Slide Previews Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-20 rounded-lg bg-[#0A0F1D] border border-cyan-500/30 p-2 flex flex-col justify-between text-white relative overflow-hidden shadow-xs">
                <span className="text-[8px] font-mono-code text-cyan-400">#1 TITLE</span>
                <div>
                  <span className="text-[10px] font-bold block truncate text-white">{projectName}</span>
                  <span className="text-[8px] text-slate-400 truncate block">Hackathon Pitch Deck</span>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-[#0E1528] border border-rose-500/30 p-2 flex flex-col justify-between text-white shadow-xs">
                <span className="text-[8px] font-mono-code text-rose-400">#2 PROBLEM</span>
                <div>
                  <span className="text-[9px] font-semibold block text-slate-200">The Core Friction</span>
                  <div className="w-full h-1 bg-rose-500/40 rounded mt-1"></div>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-[#0A0F1D] border border-cyan-500/30 p-2 flex flex-col justify-between text-white shadow-xs">
                <span className="text-[8px] font-mono-code text-cyan-400">#6 ARCHITECTURE</span>
                <div className="flex items-center justify-around gap-1 text-[7px] text-slate-300">
                  <span className="px-1 py-0.5 rounded bg-slate-800">UI</span>
                  <span>&rarr;</span>
                  <span className="px-1 py-0.5 rounded bg-slate-800">P2P</span>
                  <span>&rarr;</span>
                  <span className="px-1 py-0.5 rounded bg-slate-800">Cloud</span>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-[#0E1528] border border-emerald-500/30 p-2 flex flex-col justify-between text-white shadow-xs">
                <span className="text-[8px] font-mono-code text-emerald-400">#{slideCount} CONCLUSION</span>
                <div>
                  <span className="text-[9px] font-semibold block text-slate-200">Team Roster</span>
                  <span className="text-[7px] text-slate-400">Presentation Ready</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px]">
            <span className="text-secondary">Tailored layouts for {slideCount} slides</span>
            <span className="text-primary font-bold">Standard</span>
          </div>
        </div>

        {/* OPTION 2: Light Blue Background with Black Lines & Text Combination */}
        <div 
          onClick={() => setSelectedOption('light_blue')}
          className={`p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-4 border ${
            selectedOption === 'light_blue'
              ? 'bg-surface-container-lowest/90 dark:bg-[#0A0F1D]/90 border-sky-400 shadow-[0_0_25px_rgba(2,132,199,0.2)] ring-1 ring-sky-400/50'
              : 'bg-surface-container-low/70 dark:bg-slate-900/40 border-outline-variant/60 hover:border-outline-variant'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40 flex items-center justify-center">
                  <Sun size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-on-surface">Option B: Light Blue &amp; Black Lines</h4>
                  <span className="text-[10px] text-sky-600 dark:text-sky-300 font-mono-code font-semibold">Ice Blue • Black Ink • High Contrast</span>
                </div>
              </div>

              {selectedOption === 'light_blue' && (
                <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Soft light blue background with sharp black lines, solid black text, and crisp white cards. Designed for bright auditoriums and high daytime legibility.
            </p>

            {/* Light Blue Theme Slide Previews Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-20 rounded-lg bg-[#E8F4FD] border-2 border-black p-2 flex flex-col justify-between text-black relative overflow-hidden shadow-xs">
                <span className="text-[8px] font-mono-code font-bold text-black border-b border-black pb-0.5 inline-block">#1 TITLE</span>
                <div>
                  <span className="text-[10px] font-extrabold block truncate text-black">{projectName}</span>
                  <span className="text-[8px] text-slate-700 truncate block font-medium">Hackathon Pitch Deck</span>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-white border-2 border-black p-2 flex flex-col justify-between text-black shadow-xs">
                <span className="text-[8px] font-mono-code font-bold text-black">#2 PROBLEM</span>
                <div>
                  <span className="text-[9px] font-bold block text-black">The Core Friction</span>
                  <div className="w-full h-1 bg-black rounded mt-1"></div>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-[#E8F4FD] border-2 border-black p-2 flex flex-col justify-between text-black shadow-xs">
                <span className="text-[8px] font-mono-code font-bold text-black">#6 ARCHITECTURE</span>
                <div className="flex items-center justify-around gap-1 text-[7px] text-black font-bold">
                  <span className="px-1 py-0.5 rounded bg-white border border-black">UI</span>
                  <span>&rarr;</span>
                  <span className="px-1 py-0.5 rounded bg-white border border-black">P2P</span>
                  <span>&rarr;</span>
                  <span className="px-1 py-0.5 rounded bg-white border border-black">Cloud</span>
                </div>
              </div>

              <div className="h-20 rounded-lg bg-white border-2 border-black p-2 flex flex-col justify-between text-black shadow-xs">
                <span className="text-[8px] font-mono-code font-bold text-black">#{slideCount} CONCLUSION</span>
                <div>
                  <span className="text-[9px] font-bold block text-black">Team Roster</span>
                  <span className="text-[7px] text-slate-700 font-semibold">Presentation Ready</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px]">
            <span className="text-secondary">Black outlines &amp; typography</span>
            <span className="text-sky-600 dark:text-sky-300 font-bold">New Theme</span>
          </div>
        </div>

        {/* OPTION 3: Upload My PowerPoint Template (Active OOXML Adapter) */}
        <div 
          onClick={() => {
            if (!customFile && fileInputRef.current) {
              fileInputRef.current.click();
            } else {
              setSelectedOption('custom_upload');
            }
          }}
          className={`p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-4 border ${
            selectedOption === 'custom_upload'
              ? 'bg-surface-container-lowest/90 dark:bg-[#0A0F1D]/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
              : 'bg-surface-container-low/70 dark:bg-slate-900/40 border-outline-variant/60 hover:border-outline-variant'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-on-surface">Option A: Upload My PowerPoint Template</h4>
                  <span className="text-[10px] text-purple-400 font-mono-code font-semibold">
                    {parsedTemplate ? 'OOXML Adapter Active' : 'Custom .pptx Reader &amp; Adapter'}
                  </span>
                </div>
              </div>

              {selectedOption === 'custom_upload' && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Upload your custom hackathon PowerPoint template. HackSync automatically inspects its color palette, fonts, background, and layouts, applying your custom styling to the exported pitch deck.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
            />

            {/* Custom File Upload Box */}
            {!customFile ? (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="p-5 rounded-xl border border-dashed border-outline-variant hover:border-primary/60 bg-surface-container-low/50 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer"
              >
                {isParsingTemplate ? (
                  <Sparkles size={22} className="text-primary animate-spin" />
                ) : (
                  <Upload size={22} className="text-primary" />
                )}
                <span className="text-xs font-semibold text-on-surface">
                  {isParsingTemplate ? 'Inspecting OOXML Template...' : 'Click to select custom .pptx'}
                </span>
                <span className="text-[10px] text-secondary font-mono-code">Max file size: 25MB</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="p-3.5 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={18} className="text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-on-surface truncate">{customFile.name}</span>
                      <span className="text-[10px] text-secondary font-mono-code">{formatFileSize(customFile.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 rounded-md text-error hover:bg-error-container/20 transition-colors"
                      title="Remove custom template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Parsed Template Details Card */}
                {parsedTemplate && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-cyan-500/30 flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Theme: {parsedTemplate.themeName || 'Custom'}</span>
                      </span>
                      <span className="text-[10px] font-mono-code text-secondary">
                        {parsedTemplate.isLightMode ? 'Light Palette' : 'Dark Palette'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-secondary">Palette:</span>
                      <div className="flex items-center gap-1">
                        <span 
                          className="w-4 h-4 rounded-full border border-slate-600 shadow-xs" 
                          style={{ backgroundColor: `#${parsedTemplate.colors?.background || 'FFFFFF'}` }}
                          title={`Background: #${parsedTemplate.colors?.background}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border border-slate-600 shadow-xs" 
                          style={{ backgroundColor: `#${parsedTemplate.colors?.textPrimary || '000000'}` }}
                          title={`Text: #${parsedTemplate.colors?.textPrimary}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border border-slate-600 shadow-xs" 
                          style={{ backgroundColor: `#${parsedTemplate.colors?.accentPrimary || '06B6D4'}` }}
                          title={`Accent: #${parsedTemplate.colors?.accentPrimary}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono-code text-secondary ml-auto truncate max-w-[120px]">
                        Font: {parsedTemplate.fonts?.heading || 'Segoe UI'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <div className="p-2 rounded-lg bg-error-container text-on-error-container text-[11px] flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-surface-container-low text-[11px] text-secondary flex items-start gap-1.5 leading-normal">
              <Sparkles size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>OOXML Style Adapter:</strong> Automatically inherits background color, text color, accent highlights, and typography from your uploaded slide deck.
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px]">
            <span className="text-secondary">{parsedTemplate ? 'Adapter Active' : 'Custom Upload'}</span>
            <span className="text-purple-400 font-mono-code font-semibold">CUSTOM PPTX</span>
          </div>
        </div>
      </div>

      {/* Missing Content Alert Banner (if any) */}
      {missingCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-secondary animate-fade-in">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-on-surface">
              Pitch Content Notice ({missingCount} slide{missingCount > 1 ? 's' : ''} have missing details)
            </span>
            <p className="leading-relaxed text-[11px]">
              You can still generate your presentation deck now. Missing slides will be included with structured pitch revision placeholders so your deck remains complete.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {generationResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2 text-xs text-secondary animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>PowerPoint Pitch Deck Generated Successfully!</span>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30">
              {generationResult.slideCount} SLIDES READY
            </span>
          </div>
          <p className="leading-relaxed">
            Downloaded as <code className="text-cyan-600 dark:text-cyan-300 font-mono-code font-bold">{generationResult.fileName}</code>. Open with Microsoft PowerPoint, Google Slides, or Keynote to edit.
          </p>
        </div>
      )}

      {/* Generation Error Banner */}
      {generationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 animate-fade-in">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Selected Template Status & Real Generation Bar */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Presentation size={18} />
          </div>
          <div>
            <span className="font-semibold text-on-surface block">
              Active Theme: {
                templateState.option === 'default_hacksync' 
                  ? 'Option B: HackSync Default Theme (Dark Navy & Cyan)' 
                  : templateState.option === 'light_blue'
                  ? 'Option C: Light Blue Background & Black Lines'
                  : `Option A: Custom Upload (${customFile?.name || 'PowerPoint Template'})`
              }
            </span>
            <span className="text-secondary text-[11px]">
              Ready to generate {slideCount} editable 16:9 widescreen presentation slides in your chosen style.
            </span>
          </div>
        </div>

        {/* Real Generation Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {generationResult && (
            <button
              type="button"
              onClick={handleGeneratePptx}
              disabled={isGenerating}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Download Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGeneratePptx}
            disabled={isGenerating || !analysis}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate real editable .pptx presentation file"
          >
            {isGenerating ? (
              <>
                <Sparkles size={14} className="animate-spin text-cyan-200" />
                <span>Generating {slideCount}-Slide PPTX...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Generate PowerPoint (.pptx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
