import React from 'react';
import { Video, Calendar, PlusCircle, LayoutDashboard } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView }) => {
  const navItemClass = (view: ViewState) => `
    flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 font-medium
    ${currentView === view 
      ? 'bg-white text-jci-navy shadow-md' 
      : 'text-white hover:bg-white/10'
    }
  `;

  return (
    <header className="bg-gradient-to-r from-jci-navy to-jci-blue text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Area */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onChangeView(ViewState.DASHBOARD)}>
            <div className="bg-white p-2 rounded-lg">
              <Video className="w-6 h-6 text-jci-navy" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">JCI Connect</span>
              <span className="text-xs text-blue-100 uppercase tracking-wider">Zoom Manager</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-2">
            <button 
              onClick={() => onChangeView(ViewState.DASHBOARD)}
              className={navItemClass(ViewState.DASHBOARD)}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => onChangeView(ViewState.SCHEDULE)}
              className={navItemClass(ViewState.SCHEDULE)}
            >
              <Calendar size={18} />
              <span>Schedule</span>
            </button>
            <button 
              onClick={() => onChangeView(ViewState.BOOKING)}
              className={navItemClass(ViewState.BOOKING)}
            >
              <PlusCircle size={18} />
              <span>Book Meeting</span>
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
             <button onClick={() => onChangeView(ViewState.SCHEDULE)} className="p-2">
                <Calendar />
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;