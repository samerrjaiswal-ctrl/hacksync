import * as React from 'react';
import { Search, ChevronDown, ListFilter, Grid2X2, List } from 'lucide-react';


interface FileToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  uploaderFilter: string;
  setUploaderFilter: (uploader: string) => void;
  sortOption: string;
  setSortOption: (sort: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  uploaders: string[];
}

export const FileToolbar: React.FC<FileToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  uploaderFilter,
  setUploaderFilter,
  sortOption,
  setSortOption,
  viewMode,
  setViewMode,
  uploaders,
}) => {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'archive', label: 'Archives' },
    { id: 'doc', label: 'Documents' },
    { id: 'media', label: 'Media' },
    { id: 'code', label: 'Code' },
    { id: 'sheet', label: 'Sheets' },
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl px-space-sm py-1.5 shadow-2xs mb-space-sm flex flex-col xl:flex-row xl:items-center justify-between gap-space-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-space-sm flex-1 min-w-0">
        <div className="relative w-full lg:w-56 shrink-0">
          <Search size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-outline" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-8 py-1 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary/40 focus:bg-surface-container focus:outline-none transition-colors" 
          />
        </div>
        
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 lg:pb-0 scrollbar-none">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2.5 py-0.5 rounded-lg font-label-sm text-label-sm font-medium transition-colors whitespace-nowrap ${
                typeFilter === tab.id 
                  ? 'bg-primary text-on-primary' 
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-space-sm justify-between xl:justify-end shrink-0">
        <div className="relative">
          <select 
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
            className="appearance-none pl-2 pr-6 py-1 bg-surface-container-low hover:bg-surface-container font-label-sm text-label-sm text-on-surface rounded-lg font-medium border border-outline-variant/60 focus:outline-none cursor-pointer"
          >
            <option value="all">All Members</option>
            {uploaders.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="appearance-none pl-2 pr-6 py-1 bg-surface-container-low hover:bg-surface-container font-label-sm text-label-sm text-on-surface rounded-lg font-medium border border-outline-variant/60 focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="size">Size</option>
            <option value="name">Name</option>
          </select>
          <ListFilter size={15} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
        </div>

        <div className="flex items-center bg-surface-container-low border border-outline-variant/60 p-0.5 rounded-lg">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-surface-container-lowest text-primary shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Grid2X2 size={17} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-surface-container-lowest text-primary shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <List size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};



