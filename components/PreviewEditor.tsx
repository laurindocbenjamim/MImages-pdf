import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ImageFile, EditorPage } from '../types';
import { 
  Undo, Redo, Image as ImageIcon,
  ChevronLeft, ChevronRight, Crop, Edit3,
  Loader2, FileText, ScanText, Check,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  Palette, ArrowUp, ArrowDown, List, ListOrdered
} from 'lucide-react';
import DownloadModal from './DownloadModal';
import ImageCropper from './ImageCropper';
import { extractDocumentLayout } from '../services/aiService';

// Memoized Text Editor Component to prevent re-renders breaking selection
const RichTextEditor = React.memo(({ html, onChange, className, style }: { html: string, onChange: (h: string) => void, className: string, style: React.CSSProperties }) => {
  return (
      <div 
          id="editor-content"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange(e.currentTarget.innerHTML)}
          className={className}
          style={style}
          dangerouslySetInnerHTML={{ __html: html }}
      />
  );
});

interface PreviewEditorProps {
  images: ImageFile[];
  onBack: () => void;
  onUpdateImage: (id: string, newUrl: string) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (index: number, direction: -1 | 1) => void;
}

interface ExtractOptions {
  removeImage: boolean;
  forceBlack: boolean;
  formatted: boolean;
}

const PreviewEditor: React.FC<PreviewEditorProps> = ({ images, onBack, onUpdateImage, onRemoveImage, onMoveImage }) => {
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  // Track the last valid selection range inside the editor
  const lastValidRange = useRef<Range | null>(null);

  // Initialize pages
  useEffect(() => {
    if (!initialized && images.length > 0) {
      const initialPages: EditorPage[] = images.map(img => ({
        id: img.id,
        type: 'IMAGE',
        content: img.previewUrl,
        originalName: img.name
      }));
      setPages(initialPages);
      setInitialized(true);
    } else if (initialized) {
       // Only update image content if the pages structure matches roughly or by ID
       setPages(prev => prev.map(p => {
         const matchingImg = images.find(img => img.id === p.id);
         if (matchingImg && p.type === 'IMAGE') {
           return { ...p, content: matchingImg.previewUrl };
         }
         return p;
       }));
    }
  }, [images, initialized]);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showExtractPopup, setShowExtractPopup] = useState(false);
  const [extractConfig, setExtractConfig] = useState<ExtractOptions>({
    removeImage: true,
    forceBlack: true,
    formatted: true
  });

  // Text Formatting State
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: true,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  const currentPage = pages[currentPageIndex];

  // Selection Change Listener & Range Saver
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const editor = document.getElementById('editor-content');
        
        // Save range if it's inside our editor
        if (editor && editor.contains(range.commonAncestorContainer)) {
           lastValidRange.current = range;
        }
      }

      if (currentPage?.type !== 'TEXT') return;
      try {
        setFormatState({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
            justifyFull: document.queryCommandState('justifyFull'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
        });
      } catch (e) {
        // Ignore errors if command not supported or no selection
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [currentPage]);

  // Safety check
  useEffect(() => {
     if (pages.length === 0 && initialized) {
        onBack();
     }
  }, [pages, initialized, onBack]);

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
    } else if (currentPage) {
       const newPages = pages.filter((_, idx) => idx !== currentPageIndex);
       setPages(newPages);
       if (currentPageIndex >= newPages.length) {
         setCurrentPageIndex(Math.max(0, newPages.length - 1));
       }
    }
  };

  const handleMovePage = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= pages.length) return;
    
    const newPages = [...pages];
    const temp = newPages[index];
    newPages[index] = newPages[index + direction];
    newPages[index + direction] = temp;
    setPages(newPages);
    
    // Follow the current page selection
    if (currentPageIndex === index) {
        setCurrentPageIndex(index + direction);
    } else if (currentPageIndex === index + direction) {
        setCurrentPageIndex(index);
    }
  };

  const handleConfirmExtraction = async () => {
    setShowExtractPopup(false);
    if (!currentPage || isExtracting || currentPage.type !== 'IMAGE') return;

    setIsExtracting(true);
    try {
      const html = await extractDocumentLayout(currentPage.content, extractConfig.formatted);
      
      const newPage: EditorPage = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'TEXT',
        content: html,
        originalName: `${currentPage.originalName || 'Page'} (Text)`,
        parentId: currentPage.id
      };

      const newPages = [...pages];
      newPages.splice(currentPageIndex + 1, 0, newPage);
      
      setPages(newPages);
      setCurrentPageIndex(currentPageIndex + 1);
      
    } catch (err) {
      console.error("Failed to extract layout", err);
      alert("Could not extract text structure.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTextChange = useCallback((newHtml: string) => {
     setPages(currentPages => {
        const updatedPages = [...currentPages];
        // We need to use function update to ensure we have latest pages, 
        // but we need the current page index from the closure or ref.
        // Since we are inside useCallback with [currentPageIndex], this callback is recreated when index changes.
        // So `currentPageIndex` is fresh.
        if (currentPageIndex < updatedPages.length) {
             updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], content: newHtml };
        }
        return updatedPages;
     });
  }, [currentPageIndex]);

  const execCmd = (cmd: string, val?: string) => {
    // Restore selection if lost (e.g. clicking on color input or select)
    const sel = window.getSelection();
    const editor = document.getElementById('editor-content');
    const isSelectionInEditor = sel && sel.rangeCount > 0 && editor && editor.contains(sel.anchorNode);

    if (!isSelectionInEditor && lastValidRange.current) {
        sel?.removeAllRanges();
        sel?.addRange(lastValidRange.current);
    }

    document.execCommand(cmd, false, val);
    
    // Force update state after command
    const selectionEvent = new Event('selectionchange');
    document.dispatchEvent(selectionEvent);
  };

  const ToolbarBtn = ({ icon: Icon, label, active = false, onClick, disabled, loading, colorClass, title }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={(e) => e.preventDefault()} // Prevent focus loss for text editing
      title={title}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[40px] h-[52px] relative
        ${active ? 'bg-blue-100 text-blue-700' : colorClass ? colorClass : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        ${(disabled || loading) ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      {loading ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Icon size={18} />}
      {label && <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>}
    </button>
  );

  const CheckboxOption = ({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange?: (val: boolean) => void, disabled?: boolean }) => (
    <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${checked ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
        {checked && <Check size={12} className="text-white" />}
      </div>
      <input 
        type="checkbox" 
        className="hidden" 
        checked={checked} 
        onChange={(e) => onChange && onChange(e.target.checked)} 
        disabled={disabled}
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
  
  // Memoize style for editor to prevent unnecessary re-renders of the memoized component
  const editorStyle = useMemo(() => ({
     fontSize: `${12 * (zoom/100)}px`
  }), [zoom]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 animate-fade-in relative">
      
      {/* Editor Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-20 overflow-visible relative h-18">
        <div className="flex items-center gap-4">
           {/* Zoom Controls */}
           <div className="flex items-center gap-2 bg-slate-50 rounded-md p-1 border border-slate-200">
              <button className="p-1 hover:bg-slate-200 rounded" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                <span className="text-slate-600 font-bold">-</span>
              </button>
              <span className="text-xs font-mono w-12 text-center">{zoom}%</span>
              <button className="p-1 hover:bg-slate-200 rounded" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                <span className="text-slate-600 font-bold">+</span>
              </button>
           </div>
        </div>

        {/* Dynamic Tools */}
        <div className="flex items-center gap-1 px-2">
           <div className="flex items-center gap-1 mr-4 border-r border-slate-100 pr-2">
             <ToolbarBtn 
                icon={Undo} 
                label="Undo" 
                onClick={() => execCmd('undo')} 
                disabled={currentPage?.type !== 'TEXT'} 
             />
             <ToolbarBtn 
                icon={Redo} 
                label="Redo" 
                onClick={() => execCmd('redo')} 
                disabled={currentPage?.type !== 'TEXT'} 
             />
           </div>
           
           {currentPage?.type === 'IMAGE' ? (
             <>
               <ToolbarBtn 
                  icon={Crop} 
                  label="Crop" 
                  onClick={() => setEditingImageId(currentPage?.id)} 
               />
               
               {/* Extract Text Action */}
               <div className="mx-2 relative">
                 <ToolbarBtn 
                    icon={ScanText} 
                    label="Extract Text" 
                    onClick={() => setShowExtractPopup(true)} 
                    loading={isExtracting}
                    active={showExtractPopup}
                    colorClass="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                 />
    
                 {/* Extraction Popup */}
                 {showExtractPopup && (
                   <>
                     <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowExtractPopup(false)}></div>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 p-5 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ScanText size={18} className="text-indigo-600" />
                            Convert to Page
                          </h3>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                           <CheckboxOption 
                              label="Extract text content" 
                              checked={true} 
                              disabled
                           />
                           <CheckboxOption 
                              label="Set text color to black" 
                              checked={extractConfig.forceBlack} 
                              onChange={(v) => setExtractConfig(prev => ({ ...prev, forceBlack: v }))} 
                           />
                           <CheckboxOption 
                              label="Formatted content" 
                              checked={extractConfig.formatted} 
                              onChange={(v) => setExtractConfig(prev => ({ ...prev, formatted: v }))} 
                           />
                        </div>
    
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setShowExtractPopup(false)}
                             className="flex-1 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={handleConfirmExtraction}
                             className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 transition-colors"
                           >
                             Extract & Add Page
                           </button>
                        </div>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                     </div>
                   </>
                 )}
               </div>
    
               <div className="h-8 w-px bg-slate-200 mx-2"></div>
               <ToolbarBtn icon={Type} label="Add Text" disabled />
             </>
           ) : (
             /* Text Formatting Tools */
             <div className="flex items-center gap-2 animate-in fade-in duration-300">
                {/* Font Controls */}
                <div className="flex flex-col gap-1 mr-2">
                   <select 
                      onChange={(e) => execCmd('fontName', e.target.value)} 
                      onMouseDown={(e) => e.stopPropagation()}
                      className="text-xs border border-slate-300 rounded p-1 w-28 outline-none focus:border-blue-500"
                      defaultValue="Arial"
                   >
                     <option value="Arial">Arial</option>
                     <option value="Times New Roman">Times New Roman</option>
                     <option value="Courier New">Courier New</option>
                     <option value="Verdana">Verdana</option>
                     <option value="Inter">Inter</option>
                   </select>
                   <select 
                      onChange={(e) => execCmd('fontSize', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="text-xs border border-slate-300 rounded p-1 w-28 outline-none focus:border-blue-500"
                      defaultValue="3"
                   >
                     <option value="1">10</option>
                     <option value="2">13</option>
                     <option value="3">16</option>
                     <option value="4">18</option>
                     <option value="5">24</option>
                     <option value="6">32</option>
                     <option value="7">48</option>
                   </select>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                {/* Style Toggles */}
                <ToolbarBtn icon={Bold} onClick={() => execCmd('bold')} active={formatState.bold} title="Bold" />
                <ToolbarBtn icon={Italic} onClick={() => execCmd('italic')} active={formatState.italic} title="Italic" />
                <ToolbarBtn icon={Underline} onClick={() => execCmd('underline')} active={formatState.underline} title="Underline" />

                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                
                 {/* List Toggles */}
                 <ToolbarBtn icon={List} onClick={() => execCmd('insertUnorderedList')} active={formatState.insertUnorderedList} title="Bullet List" />
                 <ToolbarBtn icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} active={formatState.insertOrderedList} title="Numbered List" />

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                {/* Alignment */}
                <ToolbarBtn icon={AlignLeft} onClick={() => execCmd('justifyLeft')} active={formatState.justifyLeft} title="Align Left" />
                <ToolbarBtn icon={AlignCenter} onClick={() => execCmd('justifyCenter')} active={formatState.justifyCenter} title="Align Center" />
                <ToolbarBtn icon={AlignRight} onClick={() => execCmd('justifyRight')} active={formatState.justifyRight} title="Align Right" />
                <ToolbarBtn icon={AlignJustify} onClick={() => execCmd('justifyFull')} active={formatState.justifyFull} title="Justify" />

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                 {/* Color */}
                <div className="relative group flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer h-[52px] min-w-[40px]">
                    <Palette size={18} className="text-slate-600 mb-1" />
                    <div className="w-full h-1 bg-black rounded-full" id="color-indicator"></div>
                    <input 
                      type="color" 
                      onChange={(e) => {
                          execCmd('foreColor', e.target.value);
                          const ind = document.getElementById('color-indicator');
                          if(ind) ind.style.backgroundColor = e.target.value;
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Text Color"
                    />
                </div>
             </div>
           )}
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
             {pages.map((p, idx) => (
               <div 
                 key={p.id} 
                 onClick={() => setCurrentPageIndex(idx)}
                 className={`relative cursor-pointer group p-2 rounded-lg border-2 transition-all ${currentPageIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'}`}
               >
                 <div className="aspect-[3/4] bg-white shadow-sm overflow-hidden rounded border border-slate-100 relative flex items-center justify-center">
                    {p.type === 'IMAGE' ? (
                       <img src={p.content} className="w-full h-full object-contain" alt={`Page ${idx + 1}`} />
                    ) : (
                       <div className="w-full h-full bg-slate-50 p-2 overflow-hidden flex flex-col items-center justify-center">
                          <FileText size={24} className="text-indigo-400 mb-2" />
                          <div className="w-full h-1 bg-slate-200 rounded mb-1"></div>
                          <div className="w-3/4 h-1 bg-slate-200 rounded mb-1"></div>
                          <div className="w-full h-1 bg-slate-200 rounded"></div>
                       </div>
                    )}
                    
                    {p.type === 'TEXT' && (
                       <div className="absolute top-1 right-1 bg-indigo-500 text-white p-0.5 rounded shadow">
                         <FileText size={10} />
                       </div>
                    )}
                 </div>
                 <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] px-1.5 rounded z-10">
                   {idx + 1}
                 </span>
                 
                 {/* Page Controls Overlay */}
                 <div className="absolute inset-x-0 bottom-0 top-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg flex flex-col justify-between p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    {/* Move Up */}
                    <div className="flex justify-center">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                            disabled={idx === 0}
                            className="p-1 bg-white rounded-full shadow-sm hover:bg-blue-50 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transform translate-y-2 group-hover:translate-y-0 transition-transform"
                            title="Move Up"
                        >
                            <ArrowUp size={12} />
                        </button>
                    </div>

                    {/* Delete Page Button */}
                    {currentPageIndex === idx && (
                        <div className="absolute top-1 right-1">
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePage(); }}
                                className="bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition-colors"
                                title="Delete Page"
                             >
                                <Check size={12} className="rotate-45" /> 
                             </button>
                        </div>
                    )}

                    {/* Move Down */}
                    <div className="flex justify-center pb-6">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                            disabled={idx === pages.length - 1}
                            className="p-1 bg-white rounded-full shadow-sm hover:bg-blue-50 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transform -translate-y-2 group-hover:translate-y-0 transition-transform"
                            title="Move Down"
                        >
                            <ArrowDown size={12} />
                        </button>
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-slate-100 overflow-auto p-8 relative flex flex-col items-center">
           
           {/* Navigation Arrows */}
           <button 
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
              className="absolute left-4 top-1/2 z-10 p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
           >
             <ChevronLeft />
           </button>
           
           <button 
              onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
              disabled={currentPageIndex === pages.length - 1}
              className="absolute right-4 top-1/2 z-10 p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
           >
             <ChevronRight />
           </button>

           {/* Content Wrapper */}
           <div className="flex flex-col items-center gap-6 min-h-full pb-20 w-full justify-center">
               
               {currentPage && (
                 <div className="flex flex-col items-center gap-2 animate-fade-in w-full max-w-fit">
                     <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                         {currentPage.type === 'IMAGE' ? (
                            <><ImageIcon size={14} /> Original Source</>
                         ) : (
                            <><FileText size={14} className="text-indigo-500" /> Editable Document</>
                         )}
                      </div>
                     
                     <div 
                       className="bg-white shadow-xl transition-all duration-300 ease-out group relative overflow-hidden ring-1 ring-slate-900/5 flex flex-col"
                       style={{ 
                         width: `${500 * (zoom/100)}px`, 
                         minHeight: `${700 * (zoom/100)}px`,
                         height: currentPage.type === 'IMAGE' ? `${700 * (zoom/100)}px` : 'auto',
                         transformOrigin: 'top center'
                       }}
                     >
                       {currentPage.type === 'IMAGE' ? (
                          <div className="w-full h-full p-8 flex items-center justify-center overflow-hidden relative">
                              <img 
                                src={currentPage.content} 
                                alt="Current Page" 
                                className="max-w-full max-h-full object-contain relative z-10"
                              />
                              
                              {!isExtracting && (
                                  <div 
                                      onClick={() => setEditingImageId(currentPage.id)}
                                      className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors flex items-center justify-center z-10 cursor-pointer"
                                      title="Click to crop"
                                  >
                                      <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur text-blue-600 px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all font-medium flex items-center gap-2">
                                          <Edit3 size={16} />
                                          Crop / Edit
                                      </div>
                                  </div>
                              )}

                               {isExtracting && (
                                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                                   <Loader2 size={32} className="animate-spin text-indigo-600" />
                                   <span className="text-sm font-semibold text-indigo-700 animate-pulse">
                                      Analyzing Layout...
                                   </span>
                                 </div>
                               )}
                          </div>
                       ) : (
                          <RichTextEditor 
                             key={currentPage.id} // Important: force new instance on page switch
                             html={currentPage.content}
                             onChange={handleTextChange}
                             // Removed [&_*]:text-black to ensure inline styles for color are respected
                             className={`flex-1 p-12 outline-none prose prose-slate max-w-none focus:bg-blue-50/10 transition-colors text-slate-800`}
                             style={editorStyle}
                          />
                       )}
                     </div>
                 </div>
               )}
           </div>
        </div>
      </div>

      {showDownloadModal && (
        <DownloadModal 
          pages={pages} 
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