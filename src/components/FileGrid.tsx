import * as React from 'react';
import type { FileData } from '../types';
import { FileItem } from './FileItem';
import { FolderHeart } from 'lucide-react';
import type { TransferContext } from '../lib/webrtc/types';

interface FileGridProps {
  files: FileData[];
  viewMode: 'grid' | 'list';
  currentUserId: string | null;
  peers: string[];
  transfers: Record<string, TransferContext>;
  localKeys: Set<string>;
  onRequestFile: (fileId: string, fileName: string, fileSize: number, mimeType: string, ownerId: string) => void;
  onDeleteFile?: (fileId: string) => void;
  isLeader?: boolean;
}

export const FileGrid: React.FC<FileGridProps> = ({ files, viewMode, currentUserId, peers: _peers, transfers, localKeys, onRequestFile, onDeleteFile, isLeader = false }) => {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xs h-64">
        <FolderHeart size={48} className="mb-4 text-primary/40" />
        <h3 className="font-headline-md text-on-surface mb-2">No files found</h3>
        <p className="font-body-sm max-w-md">Try adjusting your filters or upload a new file to this workspace.</p>
      </div>
    );
  }

  const renderFileItem = (file: FileData) => {
    const isOwner = file.uploaderId === currentUserId;
    const hasLocalPayload = localKeys.has(file.id);
    const isAvailable = true; // Shared files in workspace are active and requestable on-demand

    // Only show downloads where *we* are the receiver — the sending side must not see a download spinner
    const activeTransfer = Object.values(transfers).find(
      t => t.fileId === file.id &&
        t.receiverId === currentUserId &&
        !t.isAutoSync &&
        (t.state === 'transferring' || t.state === 'requesting' || t.state === 'awaiting-acceptance')
    );

    return (
      <FileItem 
        key={file.id} 
        file={file} 
        viewMode={viewMode} 
        isAvailable={isAvailable}
        isOwner={isOwner}
        isLeader={isLeader}
        canDelete={true}
        canDownload={true}
        transferState={activeTransfer?.state}
        transferProgress={activeTransfer ? Math.min(100, Math.floor((activeTransfer.progress || 0) * 100)) : 0}
        onDelete={onDeleteFile}
        onRequestDownload={async () => {
          if (hasLocalPayload) {
            try {
              const { getFile } = await import('../lib/indexedDB');
              const localFile = await getFile(file.id);
              if (localFile) {
                const url = URL.createObjectURL(localFile);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                return;
              }
            } catch (err) {
              console.error('Failed to get local file', err);
            }
          }
          if (activeTransfer) {
            alert('A transfer is already in progress.');
            return;
          }
          if (file.uploaderId) {
            onRequestFile(file.id, file.name, file.size, file.type === 'archive' ? 'application/zip' : 'application/octet-stream', file.uploaderId);
          }
        }}
      />
    );
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xs overflow-hidden">
        {files.map(renderFileItem)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xs">
      {files.map(renderFileItem)}
    </div>
  );
};



