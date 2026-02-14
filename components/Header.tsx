import React from 'react';
import { Video, Calendar, LayoutDashboard } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView }) => {
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

          {/* Toggle: Dashboard | Schedule */}
          <div className="flex bg-white/20 rounded-lg p-1">
            <button
              onClick={() => onChangeView(ViewState.DASHBOARD)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                currentView === ViewState.DASHBOARD ? 'bg-white text-jci-navy shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => onChangeView(ViewState.SCHEDULE)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                currentView === ViewState.SCHEDULE ? 'bg-white text-jci-navy shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;