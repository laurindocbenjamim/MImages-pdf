import React, { useState } from 'react';
import { ImageFile } from '../types';
import { X, FileText, Download, Printer, Check, ArrowRight, Mail, Wand2, Hash } from 'lucide-react';
import { generatePDF } from '../services/pdfService';

interface DownloadModalProps {
  images: ImageFile[];
  onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ images, onClose }) => {
  const [step, setStep] = useState<'CONFIG' | 'EMAIL'>('CONFIG');
  const [fileName, setFileName] = useState('merged-document');
  const [format, setFormat] = useState('pdf');
  const [includePageNumbers, setIncludePageNumbers] = useState(false);
  const [enableScanMode, setEnableScanMode] = useState(false);
  
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleNextStep = () => {
    if (fileName.trim() === '') return;
    setStep('EMAIL');
  };

  const handleDownload = async () => {
    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    
    setIsGenerating(true);
    try {
      if (format === 'pdf') {
        console.log("Registered user email:", email);
        await generatePDF(images, fileName, {
          includePageNumbers,
          enableScanMode
        });
      } else {
        alert("This demo only supports PDF generation fully.");
      }
    } catch (error) {
      console.error("Failed to generate", error);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  const FormatOption = ({ id, label, ext, color }: any) => (
    <div 
      onClick={() => setFormat(id)}
      className={`relative cursor-pointer border rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-all ${format === id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${color}`}>
          {id.toUpperCase()}
        </span>
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{label}</span>
          <span className="text-xs text-slate-500">.{ext}</span>
        </div>
      </div>
      {format === id && <div className="bg-blue-500 rounded-full p-0.5"><Check size={12} className="text-white" /></div>}
    </div>
  );

  const ToggleOption = ({ icon: Icon, label, description, checked, onChange }: any) => (
    <div 
      onClick={() => onChange(!checked)}
      className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-all ${checked ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${checked ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-sm">{label}</span>
          <span className="text-xs text-slate-500">{description}</span>
        </div>
      </div>
      
      <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">
            {step === 'CONFIG' ? 'Export Settings' : 'Final Step'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {step === 'CONFIG' ? (
            <>
              {/* File Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">File Name</label>
                <div className="flex items-center border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <input 
                    type="text" 
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="flex-1 outline-none text-slate-700 font-medium"
                    placeholder="Enter file name"
                  />
                  <FileText size={16} className="text-slate-400" />
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</label>
                <FormatOption id="pdf" label="PDF Document" ext="pdf" color="bg-red-500" />
                {/* 
                <FormatOption id="docx" label="Word Document" ext="docx" color="bg-blue-600" />
                <FormatOption id="jpg" label="JPG Image" ext="jpg" color="bg-yellow-500" />
                */}
              </div>

              {/* Advanced Options */}
              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processing Options</label>
                 
                 <ToggleOption 
                   icon={Wand2} 
                   label="Scan Mode" 
                   description="Clean background & enhance text"
                   checked={enableScanMode} 
                   onChange={setEnableScanMode} 
                 />

                 <ToggleOption 
                   icon={Hash} 
                   label="Page Numbers" 
                   description="Add numbering to footer"
                   checked={includePageNumbers} 
                   onChange={setIncludePageNumbers} 
                 />
              </div>
            </>
          ) : (
            <div className="py-4 space-y-4 animate-fade-in">
              <div className="text-center space-y-2 mb-6">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} />
                 </div>
                 <h4 className="text-xl font-bold text-slate-800">Where should we send your file?</h4>
                 <p className="text-slate-500 text-sm">Please enter your email address to unlock the download.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className={`flex items-center border rounded-lg px-3 py-3 focus-within:ring-2 transition-all ${emailError ? 'border-red-300 ring-red-100' : 'border-slate-300 focus-within:ring-blue-500 focus-within:border-blue-500'}`}>
                  <Mail size={18} className="text-slate-400 mr-3" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className="flex-1 outline-none text-slate-700 font-medium"
                    placeholder="name@example.com"
                    autoFocus
                  />
                </div>
                {emailError && <p className="text-red-500 text-xs font-medium">{emailError}</p>}
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                 By proceeding, you agree to receive your file via download and occasional updates about our products.
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-gray-100 space-y-3">
           {step === 'CONFIG' ? (
             <button 
               onClick={handleNextStep}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               Continue <ArrowRight size={20} />
             </button>
           ) : (
             <button 
               onClick={handleDownload}
               disabled={isGenerating}
               className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               {isGenerating ? (
                 <span>Generating...</span>
               ) : (
                 <>
                   <Download size={20} />
                   Download Now
                 </>
               )}
             </button>
           )}
           
           {step === 'CONFIG' && (
              <button onClick={onClose} className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                Cancel
              </button>
           )}
           {step === 'EMAIL' && (
              <button onClick={() => setStep('CONFIG')} className="w-full text-slate-500 font-semibold py-2 text-sm hover:text-slate-700">
                Back to settings
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;