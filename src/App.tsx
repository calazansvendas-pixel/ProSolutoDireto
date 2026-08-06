import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CalculatorTab } from './components/CalculatorTab';
import { PitchGeneratorTab } from './components/PitchGeneratorTab';
import { DevelopmentsTab } from './components/DevelopmentsTab';
import { AuditReportsTab } from './components/AuditReportsTab';
import { AuthTab } from './components/AuthTab';
import { UserManagementTab } from './components/UserManagementTab';
import { Development, NavigationTab, SimulationInput, UserProfile } from './types';
import { calculateTaxaDiretoAmount, runFinancialSimulation } from './utils/financialCalculations';
import { getStoredDevelopments, getStoredThemeMode, getStoredUserProfile, saveAuditLog, saveDevelopments, saveThemeMode } from './services/storageService';

const DEFAULT_INITIAL_INPUT: SimulationInput = {
  empreendimento: '',
  proSolutoValor: 0,
  aliquotaDiretoPct: 0.2,
  taxaDiretoValor: 0,
  isTaxaDiretoManual: false,
  prazoMeses: 0,
  taxaJurosMensalPct: 0,
  isJurosManual: false,
  dataInicio: '',
  dataAmortizacao: '',
  mesAmortizacaoIndex: 0,
  valorAmortizacaoExtra: 0,
};

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('motor_prosoluto_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('calculator');

  // Hash routing for static hosting (GitHub Pages)
  useEffect(() => {
    const getTabFromHash = (): NavigationTab => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validTabs: NavigationTab[] = ['calculator', 'developments', 'audit', 'pitch', 'users', 'auth'];
      return validTabs.includes(hash as NavigationTab) ? (hash as NavigationTab) : 'calculator';
    };

    setActiveTab(getTabFromHash());

    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    setIsInitializing(false);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabSelect = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getStoredUserProfile);
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INITIAL_INPUT);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [developments, setDevelopments] = useState<Development[]>(getStoredDevelopments);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleLoginSuccess = () => {
    try {
      localStorage.setItem('motor_prosoluto_authenticated', 'true');
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
    setIsAuthenticated(true);
    handleTabSelect('calculator');
  };

  const handleLogout = () => {
    try {
      localStorage.setItem('motor_prosoluto_authenticated', 'false');
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
    setIsAuthenticated(false);
    handleTabSelect('auth');
  };

  // Memoized financial simulation calculation
  const simulationResult = useMemo(() => {
    return runFinancialSimulation(input);
  }, [input]);

  const handleResetFields = () => {
    setInput(DEFAULT_INITIAL_INPUT);
    setHasCalculated(false);
  };

  const handleRunSimulation = () => {
    if (!input.proSolutoValor || !input.prazoMeses) {
      return;
    }
    setHasCalculated(true);
    // Log simulation run to audit log
    saveAuditLog({
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Simulação Executada',
      empreendimento: input.empreendimento || 'Geral',
      proSolutoValor: input.proSolutoValor,
      aporteValor: input.valorAmortizacaoExtra,
      economiaEstimada: simulationResult.maiorEconomiaReais,
      inputSnapshot: input,
    });
  };

  const handleLoadSimulation = (simInput: SimulationInput) => {
    setInput(simInput);
    if (simInput.mesAmortizacaoIndex > 0 && simInput.valorAmortizacaoExtra > 0) {
      setHasCalculated(true);
    } else {
      setHasCalculated(false);
    }
    handleTabSelect('calculator');
  };

  // INITIAL LOADING FALLBACK SCREEN TO PREVENT BLANK SCREENS ON STATIC HOSTING
  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans p-6">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-wider text-emerald-400">Motor Pró-Soluto</h1>
            <p className="text-xs text-slate-400 mt-1">Carregando aplicação...</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. AUTHGUARD UNAUTHENTICATED VIEW (LOGIN IS DEFAULT INITIAL VIEW)
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden">
        <div className="flex h-full w-full max-w-6xl mx-auto bg-slate-50 border-x border-slate-200/60 shadow-xl overflow-hidden relative flex-col">
          {/* TOP BAR BRANDING */}
          <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-2xs shrink-0 z-10">
            <div className="flex items-center gap-2.5">
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider block">
                  MOTOR PRÓ-SOLUTO
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block -mt-0.5">
                  Simulador de Amortização Financeira
                </span>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
              Acesso Restrito
            </span>
          </header>

          {/* LOGIN SCREEN BODY */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-50">
            <AuthTab
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              isAuthenticated={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED DASHBOARD VIEW
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans bg-slate-200/60 text-slate-900">
      <div className="flex h-full w-full lg:w-[85%] mx-auto bg-slate-50 border-x border-slate-200/80 shadow-2xl overflow-hidden relative">
        {/* SIDEBAR NAVIGATION */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabSelect}
          currentUser={currentUser}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onLogout={handleLogout}
          isAuthenticated={isAuthenticated}
        />

        {/* MAIN APPLICATION CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* TOP HEADER */}
          <Header
            activeTab={activeTab}
            setActiveTab={handleTabSelect}
            currentUser={currentUser}
            onResetFields={handleResetFields}
            onRunSimulation={handleRunSimulation}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            onLogout={handleLogout}
            isAuthenticated={isAuthenticated}
          />

          {/* TAB CONTENT VIEWS */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'calculator' && (
              <CalculatorTab
                input={input}
                setInput={setInput}
                result={simulationResult}
                hasCalculated={hasCalculated}
                developments={developments}
                userRole={currentUser.role}
                onRunSimulation={handleRunSimulation}
                onNavigateToPitch={() => handleTabSelect('pitch')}
                onLoadSimulation={handleLoadSimulation}
              />
            )}

            {activeTab === 'pitch' && (
              <PitchGeneratorTab
                input={input}
                result={simulationResult}
                onNavigateToCalc={() => handleTabSelect('calculator')}
              />
            )}

            {activeTab === 'developments' && (
              <DevelopmentsTab
                developments={developments}
                setDevelopments={setDevelopments}
                onSaveDevelopments={saveDevelopments}
                userRole={currentUser.role}
              />
            )}

            {activeTab === 'users' && (
              currentUser.role === 'admin' ||
              currentUser.role === 'administrador' ||
              (currentUser as any).perfil?.toLowerCase() === 'administrador' ||
              (currentUser as any).perfil?.toLowerCase() === 'admin' ||
              currentUser.isMainAdmin === true ||
              currentUser.email === 'carlos.admin@morar.com.br'
            ) && (
              <UserManagementTab currentUser={currentUser} />
            )}

            {activeTab === 'audit' && (
              <AuditReportsTab onLoadSimulation={handleLoadSimulation} />
            )}

            {activeTab === 'auth' && (
              currentUser.role === 'admin' ||
              currentUser.role === 'administrador' ||
              (currentUser as any).perfil === 'Administrador' ||
              (currentUser as any).perfil?.toLowerCase() === 'administrador' ||
              (currentUser as any).perfil?.toLowerCase() === 'admin' ||
              currentUser.isMainAdmin === true ||
              currentUser.email === 'carlos.admin@morar.com.br'
            ) && (
              <AuthTab
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onLogout={handleLogout}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
