import React, { useState } from 'react';
import { Clock, FileText, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PunchClock from './PunchClock';
import TimeCard from './TimeCard';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'punch' | 'timecard'>('punch');
  const { user, logout } = useAuth();

  const tabs = [
    {
      id: 'punch' as const,
      name: 'Bater Ponto',
      icon: Clock,
      component: PunchClock
    },
    {
      id: 'timecard' as const,
      name: 'Cartão de Ponto',
      icon: FileText,
      component: TimeCard
    }
  ];

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component || PunchClock;
  const ActiveComponent = activeComponent;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Sistema de Ponto
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.nome || user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveComponent />
      </main>
    </div>
  );
};

export default Dashboard;