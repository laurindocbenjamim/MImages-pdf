import React, { useState } from 'react';
import { ImageFile } from '../types';
import { 
  Undo, Redo, MousePointer2, Type, PenTool, Eraser, 
  Highlighter, Image as ImageIcon, Circle, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Download, Crop, Edit3
} from 'lucide-react';
import DownloadModal from './DownloadModal';
import ImageCropper from './ImageCropper';

interface PreviewEditorProps {
  images: ImageFile[];
  onBack: () => void;
  onUpdateImage: (id: string, newUrl: string) => void;
  onRemoveImage: (id: string) => void;
}

const PreviewEditor: React.FC<PreviewEditorProps> = ({ images, onBack, onUpdateImage, onRemoveImage }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  // Safety check if image deleted
  const currentImage = images[currentPage];
  if (!currentImage && images.length > 0) {
    setCurrentPage(Math.max(0, images.length - 1));
  } else if (!currentImage && images.length === 0) {
    onBack(); // Go back if no images left
    return null;
  }

  const handleSaveCrop = (newUrl: string) => {
    if (editingImageId) {
      onUpdateImage(editingImageId, newUrl);
      setEditingImageId(null);
    }
  };

  const handleDeletePage = () => {
    if (editingImageId) {
      onRemoveImage(editingImageId);
      setEditingImageId(null);
    }
  };

  const ToolbarBtn = ({ icon: Icon, label, active = false }: any) => (
    <button className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 animate-fade-in relative">
      
      {/* Editor Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-slate-50 rounded-md p-1 border border-slate-200">
              <button className="p-1 hover:bg-slate-200 rounded" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                <span className="text-slate-600 font-bold">-</span>
              </button>
              <span className="text-xs font-mono w-12 text-center">{zoom}%</span>
              <button className="p-1 hover:bg-slate-200 rounded" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                <span className="text-slate-600 font-bold">+</span>
              </button>
           </div>
           <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
        </div>

        <div className="hidden md:flex items-center gap-1 overflow-x-auto px-2">
           <div className="flex items-center gap-1 mr-4">
             <ToolbarBtn icon={Undo} label="Undo" />
             <ToolbarBtn icon={Redo} label="Redo" />
           </div>
           <ToolbarBtn icon={MousePointer2} label="Select" active />
           <ToolbarBtn icon={Crop} label="Crop" />
           <ToolbarBtn icon={Type} label="Add Text" />
           <ToolbarBtn icon={PenTool} label="Sign" />
           <ToolbarBtn icon={Highlighter} label="Highlight" />
           <ToolbarBtn icon={Eraser} label="Eraser" />
           <ToolbarBtn icon={ImageIcon} label="Image" />
        </div>

        <div>
           <button 
             onClick={() => setShowDownloadModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all"
           >
             Done
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Thumbnails */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden md:block p-4">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Pages</h3>
              <button className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">Manage</button>
           </div>
           <div className="space-y-4">
             {images.map((img, idx) => (
               <div 
                 key={img.id} 
                 onClick={() => setCurrentPage(idx)}
                 className={`relative cursor-pointer group p-2 rounded-lg border-2 transition-all ${currentPage === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'}`}
               >
                 <div className="aspect-[3/4] bg-white shadow-sm overflow-hidden rounded border border-slate-100">
                    <img src={img.previewUrl} className="w-full h-full object-contain" alt={`Page ${idx + 1}`} />
                 </div>
                 <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] px-1.5 rounded">
                   {idx + 1}
                 </span>
               </div>
             ))}
           </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-8 relative">
           
           {/* Navigation Arrows */}
           <button 
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="absolute left-4 z-10 p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
           >
             <ChevronLeft />
           </button>
           
           <button 
              onClick={() => setCurrentPage(Math.min(images.length - 1, currentPage + 1))}
              disabled={currentPage === images.length - 1}
              className="absolute right-4 z-10 p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
           >
             <ChevronRight />
           </button>

           {/* The "Paper" */}
           <div 
             className="bg-white shadow-xl transition-all duration-300 ease-out cursor-pointer group relative"
             onClick={() => setEditingImageId(currentImage?.id)}
             title="Click to crop or edit"
             style={{ 
               width: `${500 * (zoom/100)}px`, 
               height: `${700 * (zoom/100)}px`,
               transformOrigin: 'center center'
             }}
           >
             {currentImage && (
               <div className="w-full h-full p-8 flex items-center justify-center overflow-hidden">
                 <img 
                   src={currentImage.previewUrl} 
                   alt="Current Page" 
                   className="max-w-full max-h-full object-contain"
                 />
                 
                 {/* Hover Edit Hint */}
                 <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur text-blue-600 px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all font-medium flex items-center gap-2">
                       <Edit3 size={16} />
                       Click to Crop / Edit
                    </div>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

      {showDownloadModal && (
        <DownloadModal 
          images={images} 
          onClose={() => setShowDownloadModal(false)} 
        />
      )}

      {editingImageId && (
        <ImageCropper 
          imageUrl={images.find(i => i.id === editingImageId)?.previewUrl || ''}
          onCancel={() => setEditingImageId(null)}
          onSave={handleSaveCrop}
          onDelete={handleDeletePage}
        />
      )}
    </div>
  );
};

export default PreviewEditor;