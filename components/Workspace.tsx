import React from 'react';
import { ImageFile } from '../types';
import { Plus, X, FileImage, Trash2 } from 'lucide-react';

interface WorkspaceProps {
  images: ImageFile[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveImage: (id: string) => void;
  onMerge: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ images, onAddFiles, onRemoveImage, onMerge }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50 animate-fade-in">
      {/* Workspace Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Merge PDF</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
              {images.length} Files
            </span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <label className="cursor-pointer border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
              <Plus size={18} />
              <span>Add file</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => onAddFiles(e.target.files)}
              />
            </label>
            <button 
              onClick={onMerge}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <FileImage size={18} />
              Merge Images
            </button>
          </div>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {images.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p>No images selected. Add some images to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {images.map((img, index) => (
                <div key={img.id} className="group relative aspect-[3/4] bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                  {/* Image Preview */}
                  <div className="absolute inset-2 bottom-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img 
                      src={img.previewUrl} 
                      alt={img.name} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Remove Button */}
                  <button 
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 rounded-full p-1.5 shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>

                  {/* File Info */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 px-3 flex items-center justify-center border-t border-slate-50">
                    <span className="text-xs font-medium text-slate-600 truncate max-w-full">
                      {img.name}
                    </span>
                  </div>
                  
                  {/* Connector Plus (Visual candy from screenshot) */}
                  {index < images.length - 1 && (
                     <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 translate-x-1/2 z-10 text-slate-300">
                        <Plus size={24} />
                     </div>
                  )}
                </div>
              ))}

              {/* Add Card at end of grid */}
               <label className="aspect-[3/4] bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 transition-colors gap-2">
                 <div className="bg-slate-50 p-3 rounded-full">
                    <Plus size={24} />
                 </div>
                 <span className="text-sm font-medium">Add file</span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => onAddFiles(e.target.files)}
                  />
               </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;