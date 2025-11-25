import React, { useState } from 'react';
import { JellyfinCredentials, JellyfinItem } from '../types';
import { getImageUrl } from '../services/jellyfinService';
import { Trash2, Film, HardDrive, FileVideo, Maximize, Clock, AlertCircle, Check, X } from 'lucide-react';

interface DuplicateItemProps {
  item: JellyfinItem;
  creds: JellyfinCredentials;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  highlight?: boolean;
}

export const DuplicateItem: React.FC<DuplicateItemProps> = ({ item, creds, onDelete, isDeleting, highlight }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = getImageUrl(creds, item.Id, item.ImageTags.Primary);
  const mediaSource = item.MediaSources?.[0];
  const videoStream = mediaSource?.MediaStreams?.find(s => s.Type === 'Video');
  
  // Convert bytes to GB
  const sizeGB = mediaSource?.Size ? (mediaSource.Size / (1024 * 1024 * 1024)).toFixed(2) : 'Unknown';
  
  // Calculate bitrate in Mbps
  const bitrateMbps = mediaSource?.Bitrate ? (mediaSource.Bitrate / 1000000).toFixed(1) : 
                     (videoStream?.BitRate ? (videoStream.BitRate / 1000000).toFixed(1) : 'Unknown');

  // Format Date Created
  const dateCreated = item.DateCreated ? new Date(item.DateCreated).toLocaleDateString() : 'Unknown';

  return (
    <div className={`relative flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden transition-all duration-300 ${highlight ? 'ring-2 ring-green-500 shadow-lg shadow-green-900/20 scale-[1.01]' : 'border border-gray-700 hover:border-gray-500'}`}>
      
      {highlight && (
        <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 text-center z-10">
          Highest Quality (Estimated)
        </div>
      )}

      <div className="relative h-48 bg-gray-900 w-full group overflow-hidden">
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={item.Name} 
            className="w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-700 bg-gray-800/50">
            <Film className="w-12 h-12 mb-2 opacity-50" />
            {imgError && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Image Error</span>}
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex gap-1">
          <span className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-mono text-white border border-white/10">
            {videoStream?.Width && videoStream?.Height ? `${videoStream.Width}p` : 'N/A'}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent p-3 pt-10">
            <p className="text-xs font-mono text-gray-300 break-all leading-tight opacity-80" title={mediaSource?.Path}>
              {mediaSource?.Path?.split(/[/\\]/).pop() || item.Name}
            </p>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
           <div className="flex items-center gap-2" title="File Size">
             <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
             <span className="text-gray-200 font-medium">{sizeGB} GB</span>
           </div>
           <div className="flex items-center gap-2" title="Bitrate">
             <Maximize className="w-4 h-4 text-green-400 shrink-0" />
             <span className="text-gray-200">{bitrateMbps} Mbps</span>
           </div>
           <div className="flex items-center gap-2" title="Container">
             <FileVideo className="w-4 h-4 text-purple-400 shrink-0" />
             <span className="text-gray-200 uppercase">{mediaSource?.Container || 'MKV'}</span>
           </div>
           <div className="flex items-center gap-2" title="Date Added">
             <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
             <span className="text-gray-400 text-xs">{dateCreated}</span>
           </div>
        </div>

        <div className="mt-auto pt-2">
          {isConfirming ? (
             <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => onDelete(item.Id)}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors text-sm shadow-lg shadow-red-900/20"
                >
                  <Check className="w-4 h-4" /> Confirm
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isDeleting}
                  className="px-3 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-gray-200 py-2.5 rounded-lg font-medium transition-colors text-sm border border-gray-600"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
             </div>
          ) : (
            <button
                onClick={() => setIsConfirming(true)}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium group-hover:border-red-500/50"
            >
                {isDeleting ? (
                    <span className="animate-pulse flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Deleting...
                    </span>
                ) : (
                    <>
                        <Trash2 className="w-4 h-4" />
                        Delete File
                    </>
                )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};