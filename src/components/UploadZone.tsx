import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { CloudUpload, Plus, X, FolderPlus, Loader2 } from 'lucide-react';


interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadFileName: string;
  cancelUpload: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onUpload, 
  isUploading, 
  uploadProgress, 
  uploadFileName,
  cancelUpload 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStartTime, setZipStartTime] = useState<number | null>(null);
  const [zipElapsedTime, setZipElapsedTime] = useState(0);
  
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [uploadElapsedTime, setUploadElapsedTime] = useState(0);

  useEffect(() => {
    if (isZipping && !zipStartTime) setZipStartTime(Date.now());
    else if (!isZipping) { setZipStartTime(null); setZipElapsedTime(0); }
  }, [isZipping]);

  useEffect(() => {
    let interval: any;
    if (isZipping && zipStartTime) {
      interval = setInterval(() => {
        setZipElapsedTime(Math.floor((Date.now() - zipStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isZipping, zipStartTime]);

  useEffect(() => {
    if (isUploading && !uploadStartTime) setUploadStartTime(Date.now());
    else if (!isUploading) { setUploadStartTime(null); setUploadElapsedTime(0); }
  }, [isUploading]);

  useEffect(() => {
    let interval: any;
    if (isUploading && uploadStartTime) {
      interval = setInterval(() => {
        setUploadElapsedTime(Math.floor((Date.now() - uploadStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isUploading, uploadStartTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        onUpload(Array.from(e.clipboardData.files));
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onUpload]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', 'true');
      folderInputRef.current.setAttribute('directory', 'true');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      alert('No files selected in folder.');
      return;
    }

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const firstPath = fileArray[0].webkitRelativePath || '';
    const folderName = (firstPath.split('/')[0] || 'Shared_Folder').replace(/[^a-zA-Z0-9_-]/g, '_');

    setIsZipping(true);
    setZipProgress(0);

    try {
      const { Zip, ZipPassThrough, zipSync } = await import('fflate');
      let zipFile: File;

      if (typeof navigator.storage !== 'undefined' && navigator.storage.getDirectory) {
        const opfsRoot = await navigator.storage.getDirectory();
        const fileHandle = await opfsRoot.getFileHandle(`${folderName}-${Date.now()}.zip`, { create: true });
        const writable = await (fileHandle as any).createWritable();

        let totalSize = fileArray.reduce((acc, f) => acc + f.size, 0);
        let processedSize = 0;

        await new Promise<void>((resolve, reject) => {
          let hasError = false;
          let writeChain = Promise.resolve();
          
          const zip = new Zip((err, data, _final) => {
            if (err) { hasError = true; reject(err); return; }
            
            writeChain = writeChain.then(async () => {
              if (hasError) return;
              try {
                if (data && data.length > 0) {
                  await writable.write(data);
                }
              } catch (e) {
                hasError = true;
                reject(e);
              }
            });
          });

          // Process files sequentially to avoid opening too many file handles at once (NotReadableError limit)
          const processFiles = async () => {
            try {
              for (const file of fileArray) {
                if (hasError) break;
                const path = file.webkitRelativePath || file.name;
                const fileStream = new ZipPassThrough(path);
                zip.add(fileStream);

                const reader = file.stream().getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  fileStream.push(value, false);
                  processedSize += value.length;
                  if (totalSize > 0) {
                    setZipProgress(Math.round((processedSize / totalSize) * 100));
                  }
                }
                fileStream.push(new Uint8Array(0), true);
              }
              zip.end();
              
              // Wait for all queued chunks to finish writing to OPFS
              await writeChain;
              
              if (!hasError) {
                await writable.close();
                resolve();
              }
            } catch (err) {
              hasError = true;
              reject(err);
            }
          };

          processFiles();
        });

        zipFile = await fileHandle.getFile();
      } else {
        // Fallback for browsers without OPFS
        const zipData: Record<string, Uint8Array> = {};
        for (const file of fileArray) {
          const path = file.webkitRelativePath || file.name;
          zipData[path] = new Uint8Array(await file.arrayBuffer());
        }
        const zipped = zipSync(zipData, { level: 0 }); // level 0 = STORE (no compression, fastest)
        zipFile = new File([zipped], `${folderName}.zip`, { type: 'application/zip' });
      }
      
      onUpload([zipFile]);
    } catch (err: any) {
      console.error('Failed to zip folder', err);
      alert('Failed to zip folder: ' + err.message);
    } finally {
      setIsZipping(false);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <div 
        className={`relative group bg-surface-container-lowest border ${isDragActive ? 'border-primary bg-primary/5' : 'border-dashed border-outline-variant hover:border-primary'} rounded-xl px-space-md py-8 transition-all shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-space-sm overflow-hidden`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-lg bg-surface-container-low text-primary flex items-center justify-center shrink-0">
            <CloudUpload size={18} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Drop files here, browse, or paste (Ctrl+V / ⌘V)</span>
            <span className="hidden md:inline font-mono-metadata text-mono-metadata text-outline">· Instant sync · Team storage policy applies</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            multiple 
            onChange={handleFileChange}
          />
          <input 
            type="file" 
            className="hidden" 
            ref={folderInputRef} 
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple 
            onChange={handleFolderChange}
          />
          <button 
            onClick={() => folderInputRef.current?.click()}
            className="px-3 py-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded font-label-sm text-label-sm font-medium shadow-2xs flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <FolderPlus size={15} />
            <span>Browse Folder</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-container rounded font-label-sm text-label-sm font-medium shadow-2xs flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Browse Files</span>
          </button>
        </div>
      </div>

      {isZipping && (
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-lg px-space-sm py-1.5 shadow-2xs flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="text-secondary animate-spin" size={16} />
            <span className="font-mono-code text-[11px] font-semibold text-on-surface truncate">Zipping folder...</span>
            <span className="font-mono-metadata text-mono-metadata text-secondary font-medium">— {zipProgress}% ({formatTime(zipElapsedTime)})</span>
          </div>
          <div className="flex items-center gap-space-sm w-44">
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className={`bg-secondary h-full rounded-full transition-all duration-100`} style={{ width: `${zipProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-lg px-space-sm py-1.5 shadow-2xs flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="text-primary animate-spin" size={16} />
            <span className="font-mono-code text-[11px] font-semibold text-on-surface truncate">uploading {uploadFileName}</span>
            <span className="font-mono-metadata text-mono-metadata text-primary font-medium">— {uploadProgress}% • Syncing ({formatTime(uploadElapsedTime)})</span>
          </div>
          <div className="flex items-center gap-space-sm w-44">
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className={`bg-primary h-full rounded-full transition-all duration-300`} style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <button 
              onClick={cancelUpload}
              className="text-outline hover:text-error p-0.5 rounded transition-colors" 
              title="Cancel upload"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};



