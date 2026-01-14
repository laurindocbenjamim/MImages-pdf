import React from 'react';
import { Rocket, ChevronDown, Menu, Plus } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  showNewProject?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onReset, showNewProject }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={onReset}>
            <div className="flex items-center gap-1 text-2xl font-bold text-slate-800">
              <div className="bg-blue-600 text-white p-1 rounded-lg">
                <Rocket size={20} fill="currentColor" />
              </div>
              <span>PDF</span>
              <span className="text-blue-600">Leader</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1">
              Tools <ChevronDown size={14} />
            </button>
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1">
              Forms <ChevronDown size={14} />
            </button>
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600">
              Contact Us
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
             {showNewProject && (
               <button 
                onClick={onReset}
                className="hidden sm:flex bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold py-2 px-4 rounded-lg items-center gap-2 transition-colors border border-blue-200"
               >
                 <Plus size={16} />
                 New Project
               </button>
             )}

            <button className="hidden sm:flex items-center gap-2 text-blue-600 font-semibold text-sm hover:opacity-80 transition-opacity ml-2">
              <Rocket size={16} />
              Explore Premium
            </button>
            <button className="w-9 h-9 bg-blue-700 text-white rounded-lg flex items-center justify-center font-bold shadow-md hover:bg-blue-800 transition-colors">
              R
            </button>
            <button className="md:hidden text-slate-600">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;