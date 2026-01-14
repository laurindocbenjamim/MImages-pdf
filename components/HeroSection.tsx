import React, { useCallback } from 'react';
import { Upload, CheckCircle2, Image as ImageIcon, FilePlus } from 'lucide-react';

interface HeroSectionProps {
  onFilesSelected: (files: FileList | null) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onFilesSelected }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Content */}
        <div className="space-y-8 max-w-lg">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Merge Images into <br />
            <span className="text-blue-600">One PDF</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium">
            Smooth, simple, and fast.
          </p>
          
          <div className="space-y-4">
            {[
              "Work with JPG, PNG, and more",
              "Use on desktop & mobile",
              "Get high-quality results every time"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-600">
                <CheckCircle2 className="text-blue-500" size={20} />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card (Upload Zone) */}
        <div 
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 text-center transition-all duration-300 hover:shadow-2xl"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 bg-slate-50/50 hover:bg-blue-50/30 transition-colors">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl transform -rotate-6 flex items-center justify-center text-blue-600 shadow-sm z-10 absolute -left-6">
                  <ImageIcon size={32} />
                </div>
                <div className="w-20 h-20 bg-purple-100 rounded-2xl transform rotate-6 flex items-center justify-center text-purple-600 shadow-sm relative z-20">
                  <ImageIcon size={32} />
                </div>
                <div className="absolute -top-4 -right-4 bg-white p-1.5 rounded-full shadow-md z-30">
                  <div className="bg-slate-200 p-1 rounded-full">
                     <FilePlus size={16} className="text-slate-600"/>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-6">Up to 100 Mb. Up to 15 files.</p>
            
            <label className="inline-flex">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => onFilesSelected(e.target.files)}
              />
              <span className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                <Upload size={20} />
                Upload file
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;