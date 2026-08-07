import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Search,
  Download,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Filter,
  CheckCircle2,
  Trash2,
  Calculator as CalcIcon,
  MessageSquare,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { AuditLogItem, SimulationInput, UserProfile } from '../types';
import { formatBRL } from '../utils/financialCalculations';
import { clearAllStoredAuditLogs, deleteStoredAuditLog, getStoredAuditLogs, getStoredUserProfile } from '../services/storageService';

interface AuditReportsTabProps {
  onLoadSimulation: (input: SimulationInput) => void;
  currentUser?: UserProfile;
}

export const AuditReportsTab: React.FC<AuditReportsTabProps> = ({ onLoadSimulation, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  const userProfile = currentUser || getStoredUserProfile();
  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'administrador' ||
    (userProfile as any)?.perfil === 'Administrador' ||
    (userProfile as any)?.perfil?.toLowerCase() === 'administrador' ||
    (userProfile as any)?.perfil?.toLowerCase() === 'admin' ||
    userProfile?.isMainAdmin === true ||
    userProfile?.email === 'carlos.admin@morar.com.br';

  // Sync and load logs from localStorage on mount and key checks
  const refreshLogs = () => {
    const loadedLogs = getStoredAuditLogs();
    setLogs(loadedLogs);
  };

  useEffect(() => {
    if (isAdmin) {
      refreshLogs();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center mb-5 text-amber-600 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Acesso Restrito</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
            Esta área de relatórios e auditoria é exclusiva para <strong>Administradores</strong> do sistema.
          </p>
          <button
            onClick={() => {
              window.location.hash = '#/calculator';
            }}
            aria-label="Voltar ao Painel Principal"
            className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Voltar ao Painel Principal
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteLog = (id: string) => {
    deleteStoredAuditLog(id);
    setLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const handleClearAllLogs = () => {
    if (logs.length === 0) return;
    if (window.confirm('Tem certeza que deseja apagar todo o histórico de simulações e registros?')) {
      clearAllStoredAuditLogs();
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const searchClean = searchTerm.trim().toLowerCase();
    const matchesSearch =
      searchClean === '' ||
      (log.empreendimento || '').toLowerCase().includes(searchClean) ||
      (log.usuarioNome || '').toLowerCase().includes(searchClean) ||
      (log.acao || '').toLowerCase().includes(searchClean);

    const roleClean = roleFilter.trim().toLowerCase();
    const matchesRole =
      roleClean === 'todos' ||
      roleClean === '' ||
      (log.usuarioRole || '').toLowerCase().includes(roleClean);

    return matchesSearch && matchesRole;
  });

  const renderActionPill = (acao: string) => {
    const acaoLower = (acao || '').toLowerCase();
    if (acaoLower.includes('calculou') || acaoLower.includes('simula')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200/80 shadow-2xs">
          <CalcIcon className="w-3 h-3 text-blue-600" />
          {acao}
        </span>
      );
    }
    if (acaoLower.includes('pitch') || acaoLower.includes('export')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs">
          <MessageSquare className="w-3 h-3 text-emerald-600" />
          {acao}
        </span>
      );
    }
    if (acaoLower.includes('login') || acaoLower.includes('autentic')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200/80 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
          {acao}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
        <ShieldCheck className="w-3 h-3 text-slate-600" />
        {acao}
      </span>
    );
  };

  const exportAuditCSV = () => {
    const headers = [
      'ID',
      'Data/Hora',
      'Usuário',
      'Cargo/Role',
      'Ação',
      'Empreendimento',
      'Valor Pró-Soluto (R$)',
      'Valor Aporte (R$)',
      'Economia Estimada (R$)',
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      new Date(log.timestamp).toLocaleString('pt-BR'),
      log.usuarioNome,
      log.usuarioRole,
      log.acao,
      log.empreendimento,
      log.proSolutoValor.toFixed(2),
      log.aporteValor.toFixed(2),
      log.economiaEstimada.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_auditoria_prosoluto_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col space-y-5 overflow-y-auto">
      {/* HEADER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Relatórios de Auditoria & Histórico de Simulações
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro completo de acessos, simulações calculadas e pitches exportados para conformidade corporativa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {logs.length > 0 && (
            <button
              onClick={handleClearAllLogs}
              className="px-3.5 py-2 bg-rose-100/40 hover:bg-rose-200/50 text-rose-600 border border-rose-200/50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs backdrop-blur-xs"
              title="Apagar todo o histórico"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Limpar Histórico</span>
            </button>
          )}

          <button
            onClick={exportAuditCSV}
            className="px-4 py-2 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all backdrop-blur-xs"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Exportar Relatório (CSV)</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por empreendimento, usuário ou tipo de ação..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Cargo:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1 outline-none font-semibold"
          >
            <option value="todos">Todos os Cargos</option>
            <option value="gerente">Gerente</option>
            <option value="consultor">Consultor</option>
            <option value="corretor">Corretor</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Data/Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação Realizada</th>
                <th className="py-3 px-4">Empreendimento</th>
                <th className="py-3 px-4 text-right">Pró-Soluto</th>
                <th className="py-3 px-4 text-right">Aporte</th>
                <th className="py-3 px-4 text-right">Economia Est.</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans text-xs">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors odd:bg-slate-50/40">
                    <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                      {new Date(log.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{log.usuarioNome}</div>
                      <div className="text-[9px] text-slate-500 uppercase">{log.usuarioRole}</div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {renderActionPill(log.acao)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-medium text-slate-900">{log.empreendimento}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800 font-medium">
                      {formatBRL(log.proSolutoValor)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                      {formatBRL(log.aporteValor)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                      {formatBRL(log.economiaEstimada)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {log.inputSnapshot && (
                          <button
                            onClick={() => onLoadSimulation(log.inputSnapshot!)}
                            className="px-2.5 py-1 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all backdrop-blur-xs shadow-2xs"
                            title="Recarregar esta simulação"
                          >
                            <RotateCcw className="w-3 h-3 text-blue-600" />
                            Recarregar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 bg-rose-100/40 hover:bg-rose-200/50 text-rose-600 border border-rose-200/50 rounded-xl transition-all backdrop-blur-xs shadow-2xs"
                          title="Excluir este registro do histórico"
                          aria-label="Excluir registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
