import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { JellyfinCredentials, JellyfinItem, DuplicateGroup } from '../types';
import { fetchMovies, deleteItem, fetchLibraries, getImageUrl } from '../services/jellyfinService';
import { DuplicateItem } from './DuplicateItem';
import { RefreshCw, LayoutGrid, CheckCircle2, AlertTriangle, Search, LogOut, ArrowLeft, Folder, Library } from 'lucide-react';

interface ScannerProps {
  creds: JellyfinCredentials;
  onLogout: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ creds, onLogout }) => {
  // Library Selection State
  const [libraries, setLibraries] = useState<JellyfinItem[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<JellyfinItem | null>(null);
  
  // Scanner State
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial load: Fetch Libraries
  useEffect(() => {
    const loadLibraries = async () => {
      setLoading(true);
      try {
        const libs = await fetchLibraries(creds);
        setLibraries(libs);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch libraries');
      } finally {
        setLoading(false);
      }
    };
    loadLibraries();
  }, [creds]);

  // Scan Logic
  const scanLibrary = useCallback(async () => {
    if (!selectedLibrary) return;
    
    setLoading(true);
    setError(null);
    try {
      const allMovies = await fetchMovies(creds, selectedLibrary.Id);
      setItems(allMovies);
    } catch (err: any) {
      setError(err.message || 'Failed to scan library');
    } finally {
      setLoading(false);
    }
  }, [creds, selectedLibrary]);

  // Trigger scan when library is selected
  useEffect(() => {
    if (selectedLibrary) {
      scanLibrary();
    }
  }, [selectedLibrary, scanLibrary]);

  const handleBackToLibraries = () => {
    setSelectedLibrary(null);
    setItems([]);
    setError(null);
    setSearchTerm('');
  };

  // Grouping Logic
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, DuplicateGroup> = {};

    items.forEach(item => {
      // Priority 1: TMDb ID
      // Priority 2: IMDb ID
      // Priority 3: Name + Year (normalized)
      let key = '';
      if (item.ProviderIds.Tmdb) {
        key = `tmdb-${item.ProviderIds.Tmdb}`;
      } else if (item.ProviderIds.Imdb) {
        key = `imdb-${item.ProviderIds.Imdb}`;
      } else {
        const normName = item.Name.toLowerCase().replace(/[^a-z0-9]/g, '');
        key = `name-${normName}-${item.ProductionYear || '0000'}`;
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          title: item.Name,
          year: item.ProductionYear,
          items: []
        };
      }
      groups[key].items.push(item);
    });

    // Filter only groups with > 1 item
    let duplicates = Object.values(groups).filter(g => g.items.length > 1);

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      duplicates = duplicates.filter(g => 
        g.title.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Sort groups by title
    return duplicates.sort((a, b) => a.title.localeCompare(b.title));
  }, [items, searchTerm]);

  const handleDelete = async (itemId: string) => {
    setProcessingId(itemId);
    try {
      await deleteItem(creds, itemId);
      // Remove locally to avoid re-scan
      setItems(prev => prev.filter(i => i.Id !== itemId));
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to determine the "best" item in a group to highlight it (keep recommendation)
  const getBestItemId = (groupItems: JellyfinItem[]): string => {
    // Logic: Highest bitrate > Largest size
    return groupItems.reduce((prev, current) => {
      const prevBitrate = prev.MediaSources?.[0]?.Bitrate || 0;
      const currBitrate = current.MediaSources?.[0]?.Bitrate || 0;
      
      if (currBitrate > prevBitrate) return current;
      if (currBitrate === prevBitrate) {
         const prevSize = prev.MediaSources?.[0]?.Size || 0;
         const currSize = current.MediaSources?.[0]?.Size || 0;
         return currSize > prevSize ? current : prev;
      }
      return prev;
    }).Id;
  };

  const totalDuplicates = duplicateGroups.reduce((acc, group) => acc + group.items.length - 1, 0);
  const wastedSpace = useMemo(() => {
      let total = 0;
      duplicateGroups.forEach(group => {
          const sizes = group.items.map(i => i.MediaSources?.[0]?.Size || 0);
          const totalGroup = sizes.reduce((a,b) => a+b, 0);
          const max = Math.max(...sizes);
          total += (totalGroup - max);
      });
      return (total / (1024 * 1024 * 1024)).toFixed(1);
  }, [duplicateGroups]);

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 bg-gray-900">
        <RefreshCw className="w-16 h-16 animate-spin text-purple-600 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">
          {selectedLibrary ? `Scanning "${selectedLibrary.Name}"...` : 'Loading Libraries...'}
        </h2>
        <p className="text-gray-400">
          {selectedLibrary ? 'Analyzing metadata and identifying duplicates.' : 'Connecting to server...'}
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
        <div className="bg-red-900/10 border border-red-800/50 p-8 rounded-2xl max-w-lg text-center backdrop-blur-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Operation Failed</h2>
          <p className="text-red-200 mb-8 leading-relaxed">{error}</p>
          <div className="flex gap-4 justify-center">
            {selectedLibrary ? (
              <button 
                onClick={handleBackToLibraries}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                <Library className="w-4 h-4" /> Choose Library
              </button>
            ) : null}
            <button 
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Library Selection ---
  if (!selectedLibrary) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-900">
        {/* Simple Header */}
        <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg shadow-lg">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Select Library</h1>
            </div>
            <button 
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
          <p className="text-gray-400 mb-8 text-lg">Choose a library to scan for duplicate movies.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {libraries.map((lib) => {
              const imgUrl = getImageUrl(creds, lib.Id, lib.ImageTags.Primary);
              return (
                <button
                  key={lib.Id}
                  onClick={() => setSelectedLibrary(lib)}
                  className="group relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 hover:ring-2 hover:ring-purple-500/50 transition-all text-left"
                >
                   {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={lib.Name} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                         <Folder className="w-12 h-12 text-gray-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent p-4 flex items-end">
                      <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{lib.Name}</span>
                   </div>
                </button>
              );
            })}
          </div>
          {libraries.length === 0 && (
            <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700 border-dashed">
              <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300">No libraries found</h3>
              <p className="text-gray-500">Ensure your user has access to libraries.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- View: Scanner Results ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button 
                 onClick={handleBackToLibraries}
                 className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                 title="Back to Libraries"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white hidden sm:block tracking-tight truncate max-w-[200px]">
                {selectedLibrary.Name}
              </h1>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
               <div className="relative hidden md:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                 <input 
                    type="text" 
                    placeholder="Filter by title..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-900/50 border border-gray-600 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none w-48 lg:w-64 transition-all"
                 />
               </div>
               
               <div className="h-6 w-px bg-gray-700 hidden md:block"></div>

               <button 
                onClick={scanLibrary}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                title="Rescan Library"
               >
                 <RefreshCw className="w-5 h-5" />
               </button>
               <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all"
               >
                 <LogOut className="w-4 h-4" />
                 <span className="hidden sm:inline">Logout</span>
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-800/30 border-b border-gray-700/50 py-4">
         <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
             <div className="flex items-center gap-2 text-gray-400">
               <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
               Scanned Movies: <strong className="text-white">{items.length}</strong>
             </div>
             <div className="flex items-center gap-2 text-gray-400">
               <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
               Conflict Groups: <strong className="text-white">{duplicateGroups.length}</strong>
             </div>
             <div className="flex items-center gap-2 text-gray-400">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
               Duplicates: <strong className="text-white">{totalDuplicates}</strong>
             </div>
             <div className="flex items-center gap-2 text-gray-400">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
               Wasted Space: <strong className="text-white">~{wastedSpace} GB</strong>
             </div>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {duplicateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
             <div className="inline-flex items-center justify-center p-8 bg-green-500/10 rounded-full mb-6 ring-1 ring-green-500/30">
                <CheckCircle2 className="w-20 h-20 text-green-500" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-3">"{selectedLibrary.Name}" is Clean!</h2>
             <p className="text-gray-400 text-lg">No duplicate movies were found in this library.</p>
             <button onClick={scanLibrary} className="mt-8 text-purple-400 hover:text-purple-300 underline underline-offset-4">
                Scan Again
             </button>
          </div>
        ) : (
          <div className="space-y-16">
            {duplicateGroups.map((group) => {
              const bestId = getBestItemId(group.items);
              
              return (
                <div key={group.id} className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-6 border-b border-gray-800 pb-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{group.title}</h2>
                    {group.year && <span className="text-gray-500 text-xl font-light">({group.year})</span>}
                    <div className="sm:ml-auto flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                           {group.id.startsWith('tmdb') ? 'TMDB Match' : (group.id.startsWith('imdb') ? 'IMDB Match' : 'Name Match')}
                        </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.items.map((item) => (
                      <DuplicateItem 
                        key={item.Id} 
                        item={item} 
                        creds={creds} 
                        onDelete={handleDelete}
                        isDeleting={processingId === item.Id}
                        highlight={item.Id === bestId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
