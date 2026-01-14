import React, { useState } from 'react';
import { ImageFile } from '../types';
import { 
  Undo, Redo, MousePointer2, Type, PenTool, Eraser, 
  Highlighter, Image as ImageIcon, Circle, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Download, Crop, Edit3, ChevronUp, ChevronDown,
  Droplets, Wand2, Loader2, FileText, ScanText
} from 'lucide-react';
import DownloadModal from './DownloadModal';
import ImageCropper from './ImageCropper';
import { removeBackground } from '../utils/imageProcessor';
import { digitizeHandwriting, extractDocumentLayout } from '../services/aiService';

interface PreviewEditorProps {
  images: ImageFile[];
  onBack: () => void;
  onUpdateImage: (id: string, newUrl: string) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (index: number, direction: -1 | 1) => void;
}

const PreviewEditor: React.FC<PreviewEditorProps> = ({ images, onBack, onUpdateImage, onRemoveImage, onMoveImage }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  
  // View Mode: 'IMAGE' or 'TEXT' (Structured Edit)
  const [viewMode, setViewMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [extractedContents, setExtractedContents] = useState<Record<string, string>>({});
  
  // Processing States
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

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

  const handleRemoveBg = async () => {
    if (!currentImage || isProcessingBg) return;
    setIsProcessingBg(true);
    try {
      const newUrl = await removeBackground(currentImage.previewUrl);
      onUpdateImage(currentImage.id, newUrl);
    } catch (err) {
      console.error("Failed to remove background", err);
      alert("Could not process image background.");
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleDigitize = async () => {
    if (!currentImage || isDigitizing) return;
    setIsDigitizing(true);
    try {
      const newUrl = await digitizeHandwriting(currentImage.previewUrl);
      onUpdateImage(currentImage.id, newUrl);
    } catch (err) {
      console.error("Failed to digitize", err);
      alert("AI Digitization failed. Please check your connection or try a different image.");
    } finally {
      setIsDigitizing(false);
    }
  };

  const handleExtractText = async () => {
    if (!currentImage || isExtracting) return;
    
    // If we already have content, just toggle mode
    if (extractedContents[currentImage.id]) {
      setViewMode('TEXT');
      return;
    }

    setIsExtracting(true);
    try {
      const html = await extractDocumentLayout(currentImage.previewUrl);
      setExtractedContents(prev => ({
        ...prev,
        [currentImage.id]: html
      }));
      setViewMode('TEXT');
    } catch (err) {
      console.error("Failed to extract layout", err);
      alert("Could not extract text structure.");
    } finally {
      setIsExtracting(false);
    }
  };

  const ToolbarBtn = ({ icon: Icon, label, active = false, onClick, disabled, loading, colorClass }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px] relative
        ${active ? 'bg-blue-50 text-blue-600' : colorClass ? colorClass : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? <Loader2 size={20} className="animate-spin text-blue-600" /> : <Icon size={20} />}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 animate-fade-in relative">
      
      {/* Editor Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-20 overflow-x-auto">
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
           
           {/* View Mode Toggles */}
           <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 hidden sm:flex">
              <button 
                onClick={() => setViewMode('IMAGE')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-2 ${viewMode === 'IMAGE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ImageIcon size={14} /> Image
              </button>
              <button 
                onClick={() => extractedContents[currentImage.id] ? setViewMode('TEXT') : handleExtractText()}
                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-2 ${viewMode === 'TEXT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={14} /> Text Edit
              </button>
           </div>
        </div>

        <div className="flex items-center gap-1 px-2">
           <ToolbarBtn icon={Crop} label="Crop" onClick={() => setEditingImageId(currentImage.id)} disabled={viewMode === 'TEXT'} />
           
           {/* Magic Tools */}
           <div className="mx-2 flex items-center gap-1 bg-indigo-50/50 rounded-lg px-1 border border-indigo-100">
             <ToolbarBtn 
                icon={Droplets} 
                label="Clear BG" 
                onClick={handleRemoveBg} 
                loading={isProcessingBg}
                disabled={viewMode === 'TEXT'}
                colorClass="text-indigo-600 hover:bg-indigo-50"
             />
             <ToolbarBtn 
                icon={Wand2} 
                label="Digitize" 
                onClick={handleDigitize} 
                loading={isDigitizing} 
                disabled={viewMode === 'TEXT'}
                colorClass="text-indigo-600 hover:bg-indigo-50"
             />
             <ToolbarBtn 
                icon={ScanText} 
                label="Extract" 
                onClick={handleExtractText} 
                loading={isExtracting}
                active={viewMode === 'TEXT'} 
                colorClass="text-indigo-600 hover:bg-indigo-50"
             />
           </div>

           <div className="h-8 w-px bg-slate-200 mx-2"></div>

           <ToolbarBtn icon={Type} label="Add Text" disabled={viewMode === 'TEXT'} />
           <ToolbarBtn icon={PenTool} label="Sign" disabled={viewMode === 'TEXT'} />
        </div>

        <div>
           <button 
             onClick={() => setShowDownloadModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all whitespace-nowrap"
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
           </div>
           <div className="space-y-4">
             {images.map((img, idx) => (
               <div 
                 key={img.id} 
                 onClick={() => {
                    setCurrentPage(idx);
                    // Reset view mode if no text for new page or default behavior
                    if (!extractedContents[img.id]) setViewMode('IMAGE');
                 }}
                 className={`relative cursor-pointer group p-2 rounded-lg border-2 transition-all ${currentPage === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'}`}
               >
                 <div className="aspect-[3/4] bg-white shadow-sm overflow-hidden rounded border border-slate-100 relative">
                    <img src={img.previewUrl} className="w-full h-full object-contain" alt={`Page ${idx + 1}`} />
                    {extractedContents[img.id] && (
                      <div className="absolute top-1 right-1 bg-green-500 text-white p-0.5 rounded shadow">
                        <FileText size={10} />
                      </div>
                    )}
                 </div>
                 <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] px-1.5 rounded z-10">
                   {idx + 1}
                 </span>
                 
                 {/* Reorder Controls */}
                 <div className={`absolute top-1 right-1 flex flex-col gap-1 z-20 transition-opacity ${currentPage === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMoveImage(idx, -1); }}
                      disabled={idx === 0}
                      className="p-1 bg-white/90 shadow text-slate-600 hover:text-blue-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMoveImage(idx, 1); }}
                      disabled={idx === images.length - 1}
                      className="p-1 bg-white/90 shadow text-slate-600 hover:text-blue-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={12} />
                    </button>
                 </div>
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

           {/* The "Paper" Container */}
           <div 
             className="bg-white shadow-xl transition-all duration-300 ease-out group relative overflow-hidden"
             style={{ 
               width: `${500 * (zoom/100)}px`, 
               minHeight: `${700 * (zoom/100)}px`, // Changed to minHeight for text expansion
               height: viewMode === 'TEXT' ? 'auto' : `${700 * (zoom/100)}px`, // Auto height for text
               transformOrigin: 'top center'
             }}
           >
             {currentImage && (
               <>
                 {/* VIEW MODE: IMAGE */}
                 {viewMode === 'IMAGE' && (
                    <div className="w-full h-full p-8 flex items-center justify-center overflow-hidden relative">
                        <img 
                          src={currentImage.previewUrl} 
                          alt="Current Page" 
                          className="max-w-full max-h-full object-contain relative z-10"
                        />
                        
                        {/* Hover Edit Hint (Only in Image Mode) */}
                        {!isProcessingBg && !isDigitizing && !isExtracting && (
                            <div 
                                onClick={() => setEditingImageId(currentImage?.id)}
                                className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors flex items-center justify-center z-10 cursor-pointer"
                                title="Click to crop"
                            >
                                <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur text-blue-600 px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all font-medium flex items-center gap-2">
                                    <Edit3 size={16} />
                                    Crop / Edit
                                </div>
                            </div>
                        )}
                    </div>
                 )}

                 {/* VIEW MODE: TEXT (Editable) */}
                 {viewMode === 'TEXT' && (
                    <div className="w-full h-full bg-white relative z-10 text-left">
                        {/* 
                           Simulating a document page. 
                           Using contentEditable to allow user corrections.
                           Tailwind Typography (prose) would be ideal here if available, 
                           using standard utility classes for now to mimic document structure.
                        */}
                        <div 
                           contentEditable
                           suppressContentEditableWarning
                           className="w-full h-full p-12 outline-none prose prose-slate max-w-none text-slate-800 focus:bg-blue-50/10 transition-colors"
                           style={{ 
                             fontSize: `${12 * (zoom/100)}px` // Scale font with zoom
                           }}
                           dangerouslySetInnerHTML={{ __html: extractedContents[currentImage.id] || '<p class="text-slate-400 italic">No text extracted yet.</p>' }}
                        />
                    </div>
                 )}
                 
                 {/* Processing Overlay */}
                 {(isProcessingBg || isDigitizing || isExtracting) && (
                   <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                     <Loader2 size={32} className="animate-spin text-blue-600" />
                     <span className="text-sm font-semibold text-blue-700 animate-pulse">
                        {isDigitizing && 'Digitizing Handwriting...'}
                        {isProcessingBg && 'Removing Background...'}
                        {isExtracting && 'Analyzing Layout & Extracting Text...'}
                     </span>
                   </div>
                 )}
               </>
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