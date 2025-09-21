import React, { useState } from 'react';
import { Calendar, Download, Clock, FileText, Search, FileSpreadsheet } from 'lucide-react';
import { ApiService } from '../services/api';
import { TimeEntry } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TimeCard: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const result = await ApiService.getTimeEntries(startDate, endDate);
      if (result.success) {
        setEntries(result.entries || []);
        setHasSearched(true);
      } else {
        console.error('Error fetching entries:', result.error);
        setEntries([]);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDailyHours = (dayEntries: TimeEntry[]) => {
    const sortedEntries = dayEntries.sort((a, b) => a.time.localeCompare(b.time));
    
    if (sortedEntries.length === 0 || sortedEntries.length % 2 !== 0) {
      return { hours: 0, minutes: 0, formatted: 'ND' };
    }

    let totalMinutes = 0;

    // Processa as marcações em pares (entrada/saída)
    for (let i = 0; i < sortedEntries.length; i += 2) {
      const entryTime = new Date(`1970-01-01T${sortedEntries[i].time}`);
      const exitTime = new Date(`1970-01-01T${sortedEntries[i + 1].time}`);
      const diffMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60);
      totalMinutes += diffMinutes;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return {
      hours,
      minutes,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
  };

  const getDayOfWeek = (dateString: string) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return days[date.getDay()];
  };

  const generateReport = () => {
    if (entries.length === 0) return;

    // Group entries by date
    const groupedEntries = entries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    return { groupedEntries };
  };

  const generateExcelReport = () => {
    if (entries.length === 0) return;

    const { groupedEntries } = generateReport();
    let totalHours = 0;
    let totalMinutes = 0;

    const reportData = Object.keys(groupedEntries).sort().map(date => {
      const dayEntries = groupedEntries[date].sort((a, b) => a.time.localeCompare(b.time));
      const dayOfWeek = getDayOfWeek(date);
      const dailyHours = calculateDailyHours(dayEntries);
      
      // Add to total
      totalHours += dailyHours.hours;
      totalMinutes += dailyHours.minutes;
      
      // Format date as DD/MM/YYYY
      const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
      
      const row: any = {
        'Data': formattedDate,
        'Dia': dayOfWeek,
        'Total de Horas': dailyHours.formatted
      };
      
      // Add up to 6 time entries, fill with "-" if less than 6
      for (let i = 0; i < 6; i++) {
        if (i < dayEntries.length) {
          row[`Marcação ${i + 1}`] = dayEntries[i].time.split('.')[0];
        } else {
          row[`Marcação ${i + 1}`] = '-';
        }
      }
      
      return row;
    });
    
    // Calculate final total hours
    const finalHours = totalHours + Math.floor(totalMinutes / 60);
    const finalMinutes = totalMinutes % 60;
    const totalFormatted = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
    
    // Add total row
    reportData.push({
      'Data': '',
      'Dia': '',
      'Marcação 1': '',
      'Marcação 2': '',
      'Marcação 3': '',
      'Marcação 4': '',
      'Marcação 5': '',
      'Marcação 6': '',
      'Total de Horas': `Total: ${totalFormatted}`
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Cartão de Ponto');
    
    // Save file
    XLSX.writeFile(wb, `relatorio-ponto-${startDate}-${endDate}.xlsx`);
  };

  const generatePDFReport = () => {
    if (entries.length === 0) return;

    const { groupedEntries } = generateReport();
    let totalHours = 0;
    let totalMinutes = 0;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Relatório de Ponto', 14, 22);
    
    // User name
    doc.setFontSize(12);
    doc.text(`Funcionário: ${user?.nome || user?.email || 'N/A'}`, 14, 32);
    
    // Period
    const startFormatted = new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR');
    const endFormatted = new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR');
    doc.text(`Período: ${startFormatted} a ${endFormatted}`, 14, 42);

    // Prepare table data
    const tableData = Object.keys(groupedEntries).sort().map(date => {
      const dayEntries = groupedEntries[date].sort((a, b) => a.time.localeCompare(b.time));
      const dayOfWeek = getDayOfWeek(date);
      const dailyHours = calculateDailyHours(dayEntries);
      
      // Add to total
      totalHours += dailyHours.hours;
      totalMinutes += dailyHours.minutes;
      
      // Format date as DD/MM/YYYY
      const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
      
      const row = [formattedDate, dayOfWeek];
      
      // Add up to 6 time entries
      for (let i = 0; i < 6; i++) {
        if (i < dayEntries.length) {
          row.push(dayEntries[i].time.substring(0, 8));
        } else {
          row.push('-');
        }
      }
      
      row.push(dailyHours.formatted);
      return row;
    });

    // Calculate final total hours
    const finalHours = totalHours + Math.floor(totalMinutes / 60);
    const finalMinutes = totalMinutes % 60;
    const totalFormatted = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

    // Create table
    autoTable(doc, {
      head: [['Data', 'Dia', 'Marcação 1', 'Marcação 2', 'Marcação 3', 'Marcação 4', 'Marcação 5', 'Marcação 6', 'Total de Horas']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Add total
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.text(`Total de horas: ${totalFormatted}`, 14, finalY + 10);

    // Save PDF
    doc.save(`relatorio-ponto-${startDate}-${endDate}.pdf`);
  };

  const formatEntryType = (type: string) => {
    return type === 'entrada' ? 'Entrada' : 'Saída';
  };

  const getTotalHours = () => {
    const groupedEntries = entries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    let totalHours = 0;
    let totalMinutes = 0;

    Object.values(groupedEntries).forEach(dayEntries => {
      const dailyHours = calculateDailyHours(dayEntries);
      totalHours += dailyHours.hours;
      totalMinutes += dailyHours.minutes;
    });

    const finalHours = totalHours + Math.floor(totalMinutes / 60);
    const finalMinutes = totalMinutes % 60;
    return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Filtros de Pesquisa
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Data Inicial
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Data Final
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          {/* Header with Summary */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cartão de Ponto
                </h3>
                <p className="text-gray-600 mt-1">
                  {entries.length > 0 
                    ? `${entries.length} registros encontrados`
                    : 'Nenhum registro encontrado no período'
                  }
                </p>
              </div>
              
              {entries.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="bg-blue-50 px-4 py-2 rounded-lg text-center">
                    <div className="text-sm text-blue-600 font-medium">Total de Horas</div>
                    <div className="text-lg font-bold text-blue-800">{getTotalHours()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={generateExcelReport}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={generatePDFReport}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entries List */}
          <div className="p-6">
            {entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Data</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Dia</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 1</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 2</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 3</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 4</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 5</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marcação 6</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Total de Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      entries.reduce((acc, entry) => {
                        const date = entry.date;
                        if (!acc[date]) {
                          acc[date] = [];
                        }
                        acc[date].push(entry);
                        return acc;
                      }, {} as Record<string, TimeEntry[]>)
                    )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, dayEntries]) => {
                      const sortedEntries = dayEntries.sort((a, b) => a.time.localeCompare(b.time));
                      const dailyHours = calculateDailyHours(sortedEntries);
                      const dayOfWeek = getDayOfWeek(date);
                      const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
                      
                      return (
                        <tr key={date} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 font-medium">{formattedDate}</td>
                          <td className="border border-gray-300 px-4 py-3">{dayOfWeek}</td>
                          {Array.from({ length: 6 }, (_, index) => (
                            <td key={index} className="border border-gray-300 px-4 py-3 text-center font-mono">
                              {sortedEntries[index] ? sortedEntries[index].time.split('.')[0] : '-'}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-4 py-3 text-center font-mono font-semibold">
                            {dailyHours.formatted}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Total Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900">
                    Total de horas: {getTotalHours()} *
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum registro encontrado
                </h3>
                <p className="text-gray-600">
                  Não foram encontrados registros de ponto no período selecionado.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeCard;