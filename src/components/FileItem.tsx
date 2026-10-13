import * as React from 'react';
import { Download, CloudOff, Loader2, Trash2 } from 'lucide-react';
import type { FileData } from '../types';

interface FileItemProps {
  file: FileData;
  viewMode: 'grid' | 'list';
  isAvailable?: boolean;
  isOwner?: boolean;
  isLeader?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
  transferState?: string;
  transferProgress?: number;
  onRequestDownload?: () => void;
  onDelete?: (fileId: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ 
  file, 
  viewMode, 
  isAvailable = false, 
  isOwner = false,
  isLeader: _isLeader = false,
  canDelete = false,
  canDownload = !isOwner,
  transferState,
  transferProgress = 0,
  onRequestDownload,
  onDelete
}) => {
  const [downloadElapsedTime, setDownloadElapsedTime] = React.useState(0);

  React.useEffect(() => {
    let interval: any;
    if (transferState === 'transferring' || transferState === 'requesting' || transferState === 'awaiting-acceptance') {
      interval = setInterval(() => {
        setDownloadElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setDownloadElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [transferState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const getIconColor = (type: FileData['type']) => {
    switch (type) {
      case 'archive': return 'text-primary';
      case 'doc': return 'text-error';
      case 'media': return 'text-surface-variant';
      case 'code': return 'text-secondary';
      case 'sheet': return 'text-emerald-700';
      default: return 'text-slate-600';
    }
  };

  const getBadgeColor = (type: FileData['type']) => {
    switch (type) {
      case 'archive': return 'bg-primary-container text-on-primary-container';
      case 'doc': return 'bg-error-container text-on-error-container';
      case 'media': return 'bg-surface-container text-on-surface-variant';
      case 'code': return 'bg-secondary-fixed text-on-secondary-fixed-variant';
      case 'sheet': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-200 text-slate-800';
    }
  };
  
  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRequestDownload) {
      onRequestDownload();
    }
  };

  const FileIcon = (
    <svg className="w-11 h-11 shrink-0" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 8C8 5.79086 9.79086 4 12 4H28L40 16V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8Z" fill="currentColor" fillOpacity="0.2"></path>
      <path d="M28 4V16H40" fill="currentColor" fillOpacity="0.4"></path>
      <path d="M16 26H32M16 30H28M16 34H24" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"></path>
    </svg>
  );

  const opacityClass = (!isAvailable && !isOwner) ? 'opacity-50 grayscale' : '';

  if (viewMode === 'list') {
    return (
      <div 
        className={`group relative bg-surface-container-lowest hover:bg-primary/5 border-b border-outline-variant/30 p-2.5 transition-all flex items-center justify-between cursor-pointer select-none ${opacityClass}`}
      >
        <div className="flex items-center gap-3">
           <div className={`w-8 h-8 flex items-center justify-center ${getIconColor(file.type)} group-hover:scale-105 transition-transform`}>
             <svg className="w-8 h-8 shrink-0" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8C8 5.79086 9.79086 4 12 4H28L40 16V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8Z" fill="currentColor" fillOpacity="0.2"></path>
             </svg>
           </div>
           <div className="flex flex-col">
             <span className="font-headline-sm text-[13px] text-on-surface truncate font-semibold" title={file.name}>{file.name}</span>
             <div className="flex items-center gap-2 font-mono-metadata text-[10px] text-slate-600 mt-0.5">
               <span className={`px-1 py-0.2 rounded font-bold uppercase tracking-wider ${getBadgeColor(file.type)}`}>{file.name.split('.').pop() || 'FILE'}</span>
               <span>{formatSize(file.size)}</span>
               {!isAvailable && !isOwner && <span className="text-error flex items-center gap-1"><CloudOff size={10} /> Offline</span>}
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end mr-3 hidden sm:flex">
             <span className="font-mono-metadata text-[10px] text-slate-800 font-semibold">{isOwner ? 'You' : file.uploader}</span>
             <span className="font-mono-metadata text-[9px] text-slate-600">
               {file.uploadedAt.toLocaleDateString()} {file.uploadedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
           </div>
           
           <div className="flex items-center gap-1.5">
             {/* Download Button */}
             {canDownload && (
               transferState === 'transferring' || transferState === 'requesting' || transferState === 'awaiting-acceptance' ? (
                 <div className="flex items-center gap-2">
                   <span className="font-mono-metadata text-[10px] text-slate-500 font-medium">{formatTime(downloadElapsedTime)}</span>
                   <div className="flex items-center gap-1 text-primary">
                     <span className="font-mono-code text-[11px] font-semibold">{Math.round(transferProgress)}%</span>
                     <Loader2 size={16} className="animate-spin" />
                   </div>
                 </div>
               ) : (
                 <button 
                   className={`${isAvailable ? 'opacity-80 hover:opacity-100 hover:text-primary hover:bg-surface-container' : 'opacity-30 cursor-not-allowed'} transition-all p-1.5 text-slate-600 rounded`} 
                   title={`Download ${file.name}`}
                   onClick={handleDownload}
                 >
                   <Download size={16} />
                 </button>
               )
             )}

             {/* Delete Button */}
             {canDelete && onDelete && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                 className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
                 title={`Delete ${file.name}`}
               >
                 <Trash2 size={16} />
               </button>
             )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`file-card group relative bg-surface-container-lowest hover:bg-primary/5 hover:border-primary/40 border border-transparent rounded-lg p-2.5 transition-all flex flex-col items-center text-center cursor-pointer select-none ${opacityClass}`}
    >
      <div className="w-full flex justify-between items-center mb-1">
        <span className={`px-1 py-0.2 rounded font-mono-metadata text-[9px] uppercase font-bold tracking-wider ${getBadgeColor(file.type)}`}>
          {file.name.split('.').pop() || 'FILE'}
        </span>
        <div className="flex items-center gap-1">
          {/* Download Button */}
          {canDownload && (
            transferState === 'transferring' || transferState === 'requesting' || transferState === 'awaiting-acceptance' ? (
               <div className="flex items-center gap-1 text-primary bg-primary/5 px-1 py-0.5 rounded">
                 <span className="font-mono-code text-[10px] font-semibold">{Math.round(transferProgress)}%</span>
                 <Loader2 size={13} className="animate-spin" />
               </div>
            ) : (
              <button 
                className={`${isAvailable ? 'opacity-80 hover:opacity-100 hover:text-primary hover:bg-surface-container' : 'opacity-30 cursor-not-allowed'} transition-all p-0.5 text-slate-600 rounded`} 
                title={`Download ${file.name}`}
                onClick={handleDownload}
              >
                <Download size={15} />
              </button>
            )
          )}

          {/* Delete Button */}
          {canDelete && onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
              className="p-0.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all shrink-0"
              title={`Delete ${file.name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className={`w-12 h-12 my-1 flex items-center justify-center ${getIconColor(file.type)} group-hover:scale-105 transition-transform`}>
        {FileIcon}
      </div>
      <span className="w-full font-headline-sm text-[12px] leading-tight text-on-surface truncate font-semibold mt-1 tracking-tight" title={file.name}>
        {file.name}
      </span>
      <div className="flex items-center gap-1 font-mono-metadata text-[10px] text-slate-800 font-semibold mt-1">
        <span>{formatSize(file.size)}</span>
        <span className="text-outline">•</span>
        <span className="font-medium text-slate-600 truncate max-w-[70px]" title={file.uploader}>
          {isOwner ? 'You' : file.uploader}
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 font-mono-metadata text-[9px] text-slate-600 mt-0.5">
        {file.uploadedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        {!isAvailable && !isOwner && (
          <>
            <span className="text-outline">•</span>
            <CloudOff size={10} className="text-error" />
          </>
        )}
        {(transferState === 'transferring' || transferState === 'requesting' || transferState === 'awaiting-acceptance') && (
          <>
            <span className="text-outline">•</span>
            <span className="text-primary font-medium">{formatTime(downloadElapsedTime)} elapsed</span>
          </>
        )}
      </div>
    </div>
  );
};



