import React from 'react';
import { Menu, X, RotateCcw, Play, LogOut } from 'lucide-react';
import { NavigationTab, UserProfile } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: UserProfile;
  onResetFields: () => void;
  onRunSimulation: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onResetFields,
  onRunSimulation,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onLogout,
  isAuthenticated = true,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'calculator':
        return 'Cálculo de Amortização Extraordinária (Tabela PRICE)';
      case 'pitch':
        return 'Gerador de Pitch & Mensagem para WhatsApp';
      case 'developments':
        return 'Gestão da Lista de Empreendimentos Imobiliários';
      case 'users':
        return 'Gestão de Usuários e Controle de Permissões';
      case 'audit':
        return 'Relatórios de Simulação e Histórico de Acessos (Auditoria)';
      case 'auth':
        return 'Painel de Autenticação e Perfil do Usuário';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0 z-20 shadow-xs">
      {/* Mobile menu button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-slate-400 text-xs sm:text-sm font-medium">CALAZANS IMOB /</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {getTabTitle()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeTab === 'calculator' && (
          <>
            <button
              onClick={onResetFields}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100/60 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-all shadow-xs backdrop-blur-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Campos</span>
            </button>

            <button
              onClick={onRunSimulation}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-100/50 hover:bg-blue-200/60 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-bold transition-all backdrop-blur-xs shadow-xs active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current text-blue-600" />
              <span>Simular Agora</span>
            </button>
          </>
        )}

        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ml-1"
            title="Encerrar Sessão / Sair"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};

