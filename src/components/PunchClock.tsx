import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiService } from '../services/api';
import { TimeEntry } from '../types/auth';

const PunchClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load last entry from localStorage on component mount
  useEffect(() => {
    const savedEntry = localStorage.getItem('lastTimeEntry');
    if (savedEntry) {
      try {
        setLastEntry(JSON.parse(savedEntry));
      } catch (error) {
        console.error('Error parsing saved entry:', error);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handlePunchTime = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await ApiService.punchTime();
      
      if (result.success && result.entry) {
        setLastEntry(result.entry);
        // Save to localStorage for persistence
        localStorage.setItem('lastTimeEntry', JSON.stringify(result.entry));
        setMessage({
          type: 'success',
          text: `${result.entry.type === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso às ${result.entry.time.split('.')[0]}!`
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao registrar ponto. Tente novamente.'
        });
      }
    } catch (error) {
      console.error('Punch time error:', error);
      setMessage({
        type: 'error',
        text: 'Erro de conexão. Verifique sua internet e tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-4xl font-bold mb-2 font-mono tracking-wide">
          {formatTime(currentTime)}
        </h2>
        <p className="text-blue-100 text-lg capitalize">
          {formatDate(currentTime)}
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Punch Button */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Registrar Ponto
          </h3>
          <p className="text-gray-600 mb-6">
            Clique no botão abaixo para registrar sua entrada ou saída
          </p>
          
          <button
            onClick={handlePunchTime}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registrando...
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                Registrar Ponto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PunchClock;