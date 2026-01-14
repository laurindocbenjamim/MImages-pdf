import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface ProcessingModalProps {
  status: 'UPLOADING' | 'MERGING' | 'COMPLETE' | 'IDLE';
  progress: number;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({ status, progress }) => {
  if (status === 'IDLE') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-[340px] flex flex-col items-center relative overflow-hidden">
        
        {/* Custom CSS for the dashed file animation */}
        <style>{`
          .dashed-stroke {
            stroke-dasharray: 6, 6;
            animation: dash 20s linear infinite;
          }
          @keyframes dash {
            to {
              stroke-dashoffset: 1000;
            }
          }
        `}</style>

        {/* Central Icon Area */}
        <div className="relative w-40 h-40 mb-2 flex items-center justify-center">
          {/* File Shape SVG */}
          <svg width="100%" height="100%" viewBox="0 0 100 120" className="absolute inset-0">
            {/* Dashed Outline */}
            <path 
              d="M 20 5 L 70 5 Q 90 5 90 25 L 90 100 Q 90 120 70 120 L 30 120 Q 10 120 10 100 L 10 35 L 35 10 Z" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              className="dashed-stroke"
              strokeLinecap="round"
            />
            {/* Solid Blue Corner (Top Left - Fold) */}
            <path 
              d="M 10 35 L 35 35 Q 35 35 35 10 L 10 35" 
              fill="#3b82f6" 
              stroke="none"
            />
          </svg>

          {/* Central Percentage Circle */}
          <div className="relative z-10 bg-blue-50/80 w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm">
             <span className="text-4xl font-extrabold text-blue-500 tracking-tighter">
               {Math.round(progress)}%
             </span>
          </div>
        </div>

        {/* Status Text */}
        <h3 className="text-xl font-extrabold text-slate-800 mb-6 tracking-tight text-center">
          {status === 'UPLOADING' && "Uploading in progress..."}
          {status === 'MERGING' && "Merging in progress..."}
          {status === 'COMPLETE' && "Process Complete!"}
        </h3>

        {/* Checklist Item */}
        <div className="w-full flex items-center gap-3 pl-4">
           {status === 'UPLOADING' || status === 'MERGING' || status === 'COMPLETE' ? (
             <div className="bg-blue-500 rounded text-white p-0.5">
               <CheckSquare size={18} fill="currentColor" className="text-white" />
             </div>
           ) : (
             <Square size={20} className="text-slate-300" />
           )}
           <span className="font-semibold text-slate-700 text-base">
             {status === 'MERGING' ? 'Merging' : 'Uploading'}
           </span>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;