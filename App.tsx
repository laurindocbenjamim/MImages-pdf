import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import Workspace from './components/Workspace';
import ProcessingModal from './components/ProcessingModal';
import PreviewEditor from './components/PreviewEditor';
import { ImageFile, AppState, ProcessingStatus } from './types';
import { v4 as uuidv4 } from 'uuid'; // Note: In a real app we'd install this, here I'll mock a simple ID generator

// Simple ID generator since we can't easily install uuid in this env
const generateId = () => Math.random().toString(36).substring(2, 9);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState(0);

  // Handle adding files
  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;

    setStatus(ProcessingStatus.UPLOADING);
    setProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Process files
    const newImages: ImageFile[] = Array.from(fileList).map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file)
    }));

    setTimeout(() => {
      setImages(prev => [...prev, ...newImages]);
      setStatus(ProcessingStatus.IDLE);
      setAppState(AppState.WORKSPACE);
    }, 1200); // Fake delay for UX
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      return newImages;
    });
  };

  const handleUpdateImage = (id: string, newUrl: string) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, previewUrl: newUrl } : img
    ));
  };

  const handleMoveImage = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= images.length) return;
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index + direction];
      newImages[index + direction] = temp;
      return newImages;
    });
  };

  const handleMerge = () => {
    if (images.length === 0) return;

    setStatus(ProcessingStatus.MERGING);
    setProgress(0);

    // Simulate Server Processing
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // Slower than upload
      });
    }, 50);

    setTimeout(() => {
      setStatus(ProcessingStatus.COMPLETE);
      setTimeout(() => {
        setStatus(ProcessingStatus.IDLE);
        setAppState(AppState.PREVIEW);
      }, 800);
    }, 3000);
  };

  const resetApp = () => {
    // Only ask if there is data to lose
    if (images.length > 0) {
      if (!confirm("Are you sure you want to start a new project? Your current changes will be lost.")) {
        return;
      }
    }
    setAppState(AppState.LANDING);
    setImages([]);
    setStatus(ProcessingStatus.IDLE);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <Header 
        onReset={resetApp} 
        showNewProject={appState !== AppState.LANDING} 
      />
      
      <main className="flex flex-col">
        {appState === AppState.LANDING && (
          <HeroSection onFilesSelected={handleFilesSelected} />
        )}
        
        {appState === AppState.WORKSPACE && (
          <Workspace 
            images={images} 
            onAddFiles={handleFilesSelected} 
            onRemoveImage={handleRemoveImage}
            onMerge={handleMerge}
          />
        )}

        {appState === AppState.PREVIEW && (
          <PreviewEditor 
            images={images} 
            onBack={() => setAppState(AppState.WORKSPACE)} 
            onUpdateImage={handleUpdateImage}
            onRemoveImage={handleRemoveImage}
            onMoveImage={handleMoveImage}
          />
        )}
      </main>

      <ProcessingModal status={status} progress={progress} />
      
      {/* Simple Footer */}
      {appState === AppState.LANDING && (
        <footer className="py-6 text-center text-slate-400 text-sm">
          <p>© 2024 PDFLeader Clone. Built with React & Tailwind.</p>
        </footer>
      )}
    </div>
  );
};

export default App;