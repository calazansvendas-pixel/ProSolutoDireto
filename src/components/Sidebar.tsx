import React, { useState, useEffect } from 'react';
import { Calculator, MessageSquare, Building, BarChart3, ShieldCheck, ChevronLeft, ChevronRight, LogOut, Users } from 'lucide-react';
import { NavigationTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: UserProfile;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'motor_prosoluto_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onLogout,
  isAuthenticated = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.error('Failed to save sidebar state', e);
      }
      return next;
    });
  };

  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'administrador' ||
    (currentUser as any).perfil === 'Administrador' ||
    (currentUser as any).perfil?.toLowerCase() === 'administrador' ||
    (currentUser as any).perfil?.toLowerCase() === 'admin' ||
    currentUser.isMainAdmin === true ||
    currentUser.email === 'carlos.admin@morar.com.br';

  const navItems = [
    {
      id: 'calculator' as NavigationTab,
      label: 'Calculadora Price',
      icon: Calculator,
      description: 'Simulação de Amortização',
    },
    {
      id: 'pitch' as NavigationTab,
      label: 'Gerador de Pitch',
      icon: MessageSquare,
      description: 'Mensagens para WhatsApp',
    },
  ];

  if (isAdmin) {
    navItems.splice(1, 0, {
      id: 'developments' as NavigationTab,
      label: 'Empreendimentos',
      icon: Building,
      description: 'Gestão da Lista de Imóveis',
    });
    navItems.push(
      {
        id: 'audit' as NavigationTab,
        label: 'Relatórios / Auditoria',
        icon: BarChart3,
        description: 'Histórico & Logs de Acesso',
      },
      {
        id: 'users' as NavigationTab,
        label: 'Gestão de Usuários',
        icon: Users,
        description: 'Controle de Acessos & Perfis',
      },
      {
        id: 'auth' as NavigationTab,
        label: 'Painel de Login',
        icon: ShieldCheck,
        description: 'Autenticação & Perfil',
      }
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleNavClick = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      {/* Sidebar container */}
      <aside
        className={`fixed md:static top-0 left-0 h-full bg-slate-50 border-r border-slate-200 flex flex-col z-40 transition-all duration-300 ease-in-out shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* BRAND HEADER & TOGGLE BUTTON */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between min-h-[65px]">
          {!isCollapsed ? (
            <div className="overflow-hidden transition-opacity duration-200 whitespace-nowrap">
              <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase truncate">
                CALAZANS IMOB
              </h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                Soluções Imobiliárias
              </p>
            </div>
          ) : (
            <div className="hidden md:block text-xs font-black tracking-widest text-blue-600 uppercase">
              CIMOB
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors shrink-0"
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCollapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-blue-100/50 text-blue-700 border border-blue-200/60 font-bold backdrop-blur-xs shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/50 hover:text-blue-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} />
                  {!isCollapsed && (
                    <div className="overflow-hidden transition-opacity duration-200 whitespace-nowrap">
                      <div className="text-sm leading-none">{item.label}</div>
                      <div className={`text-[10px] mt-1 ${isActive ? 'text-blue-600/80 font-medium' : 'text-slate-400'}`}>{item.description}</div>
                    </div>
                  )}
                </button>

                {/* HOVER TOOLTIP IN COLLAPSED MODE */}
                {isCollapsed && (
                  <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-800">
                    <div>{item.label}</div>
                    <div className="text-[10px] font-normal text-slate-300">{item.description}</div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* USER PROFILE FOOTER */}
        <div className="relative group border-t border-slate-200 bg-slate-100/70 p-3 flex items-center justify-between gap-2">
          <div
            onClick={() => {
              if (isAdmin) {
                handleNavClick('auth');
              }
            }}
            className={`flex items-center flex-1 min-w-0 ${
              isAdmin ? 'cursor-pointer' : 'cursor-default'
            } ${isCollapsed ? 'justify-center' : 'gap-3'}`}
          >
            <div className="w-9 h-9 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {getInitials(currentUser.name)}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden whitespace-nowrap min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-700 uppercase tracking-wide truncate font-medium">
                  {currentUser.role === 'admin'
                    ? 'Administrador'
                    : currentUser.role === 'gerente'
                    ? 'Gerente'
                    : currentUser.role === 'consultor'
                    ? 'Consultor'
                    : 'Corretor'}
                </p>
              </div>
            )}
          </div>

          {isAuthenticated && onLogout && !isCollapsed && (
            <button
              onClick={onLogout}
              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Encerrar Sessão / Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* HOVER TOOLTIP FOR USER IN COLLAPSED MODE */}
          {isCollapsed && (
            <div className="hidden md:block absolute left-full bottom-3 ml-3 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-800">
              <div>{currentUser.name}</div>
              <div className="text-[10px] font-normal text-emerald-400">
                {currentUser.role === 'admin'
                  ? 'Administrador'
                  : currentUser.role === 'gerente'
                  ? 'Gerente'
                  : currentUser.role === 'consultor'
                  ? 'Consultor'
                  : 'Corretor'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

