import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Phone,
  FileText,
  Building,
  AlertTriangle,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { UserProfile } from '../types';
import { saveUserProfile, getStoredThemeMode, saveThemeMode } from '../services/storageService';
import {
  authenticateUserAsync,
  registerPublicUserAsync,
} from '../services/userService';

interface AuthTabProps {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  onLoginSuccess?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

type ScreenView = 'login' | 'register' | 'pending' | 'approved';

interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const AuthTab: React.FC<AuthTabProps> = ({
  currentUser,
  setCurrentUser,
  onLoginSuccess,
  onLogout,
  isAuthenticated = true,
}) => {
  // Screen state controller: 'login' | 'register' | 'pending' | 'approved'
  const [currentView, setCurrentView] = useState<ScreenView>('login');

  // Theme Mode State: 'dark' | 'light' (Default to light as requested)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return getStoredThemeMode() || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveThemeMode(nextTheme);
  };

  // Floating Toast notification state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'info',
    message: '',
  });

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // --- TELA 1: LOGIN STATE ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // --- TELA 2: CADASTRO DO CORRETOR STATE ---
  const [regName, setRegName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCreci, setRegCreci] = useState('');
  const [regImobiliaria, setRegImobiliaria] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isRegLoading, setIsRegLoading] = useState(false);

  // --- TELA 3 & 4: BROKER DATA FOR SUMMARY ---
  const [activeBrokerData, setActiveBrokerData] = useState<Partial<UserProfile> | null>(null);

  // Input Mask Helpers
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (raw.length > 6) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (raw.length > 3) {
      formatted = raw.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setRegCpf(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (raw.length > 6) {
      formatted = raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (raw.length > 2) {
      formatted = raw.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    setRegPhone(formatted);
  };

  // --- HANDLER: LOGIN SUBMISSION ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      showToast('Por favor, informe seu e-mail ou CPF.', 'warning');
      return;
    }

    setIsLoginLoading(true);

    try {
      // Authenticate via user service
      const result = await authenticateUserAsync(cleanEmail, loginPassword);
      setIsLoginLoading(false);

      // REGRA DE SEGURANÇA 1: USUÁRIO NÃO ENCONTRADO NA BASE DE DADOS
      if (result.userNotFound || !result.user) {
        showToast("E-mail não cadastrado no sistema. Por favor, clique em 'Cadastrar como Corretor' para solicitar seu acesso.", 'error');
        // PERMANECE RIGOROSAMENTE NA TELA DE LOGIN!
        return;
      }

      const userProfile = result.user;
      const statusLower = (userProfile.status || '').toLowerCase();

      // REGRA DE SEGURANÇA 2: CADASTRO PENDENTE / EM ANÁLISE
      if (result.statusBlocked || statusLower === 'pendente' || statusLower === 'pending') {
        setActiveBrokerData({
          name: userProfile.name || 'Corretor Solicitante',
          email: userProfile.email || cleanEmail,
          cpf: userProfile.cpf || 'Não informado',
          phone: userProfile.phone || 'Não informado',
          creci: userProfile.creci || 'Em validação',
          imobiliaria: userProfile.imobiliaria || 'Parceira Morar',
          status: 'Pendente',
        });
        setCurrentView('pending');
        showToast('Seu cadastro está em análise pelo Administrador.', 'warning');
        return;
      }

      // REGRA DE SEGURANÇA 3: USUÁRIO BLOQUEADO / PAUSADO
      if (statusLower === 'pausado' || statusLower === 'paused') {
        showToast('Seu cadastro está suspenso. Entre em contato com a gerência.', 'error');
        return;
      }

      // REGRA DE SUCESSO: USUÁRIO ATIVO / APROVADO OU ADMIN
      if (
        statusLower === 'ativo' ||
        statusLower === 'active' ||
        statusLower === 'approved' ||
        userProfile.role === 'admin'
      ) {
        setCurrentUser(userProfile);
        saveUserProfile(userProfile);
        setActiveBrokerData(userProfile);

        showToast(`Bem-vindo, ${userProfile.name}! Acesso autorizado.`, 'success');
        
        // Show Approved view
        setCurrentView('approved');
      } else {
        showToast("E-mail não cadastrado no sistema. Por favor, clique em 'Cadastrar como Corretor' para solicitar seu acesso.", 'error');
      }
    } catch (err) {
      setIsLoginLoading(false);
      showToast('Ocorreu uma falha na conexão com o servidor de autenticação.', 'error');
    }
  };

  // --- HANDLER: CADASTRO DE CORRETOR SUBMISSION ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName.trim() || !regEmail.trim()) {
      showToast('Preencha os campos obrigatórios (Nome Completo e E-mail).', 'warning');
      return;
    }

    setIsRegLoading(true);

    try {
      const newUser = await registerPublicUserAsync({
        name: regName,
        email: regEmail,
        password: regPassword || 'Morar@2026',
        cpf: regCpf,
        phone: regPhone,
        creci: regCreci,
        imobiliaria: regImobiliaria,
      });

      setIsRegLoading(false);

      // Save summary data and advance to Tela 3 (Pendente)
      setActiveBrokerData({
        name: newUser.name,
        email: newUser.email,
        cpf: regCpf || 'Não informado',
        phone: regPhone || 'Não informado',
        creci: regCreci || 'Pendente de validação',
        imobiliaria: regImobiliaria || 'Parceira Morar',
        status: 'Pendente',
      });

      showToast('Solicitação de cadastro enviada com sucesso para análise!', 'success');
      
      // Direct to Tela 3 (Pendente)
      setCurrentView('pending');
    } catch (err) {
      setIsRegLoading(false);
      showToast('Erro ao registrar o cadastro no banco de dados.', 'error');
    }
  };

  // --- HANDLER: ACESSAR DASHBOARD ---
  const handleEnterDashboard = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  // Dynamic theme class names
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex-1 min-h-full py-6 px-3 sm:px-4 flex flex-col items-center justify-center relative overflow-y-auto font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-900/95 text-white' : 'bg-[#F8FAFC] text-[#1C2B3E]'
      }`}
    >
      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all transform animate-bounce-short ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 ring-2 ring-rose-500/20'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 ring-2 ring-emerald-500/20'
              : toast.type === 'warning'
              ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 ring-2 ring-amber-500/20'
              : 'bg-slate-900/95 border-blue-500/50 text-blue-100'
          }`}
        >
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'warning' && <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

          <div className="flex-1 text-xs leading-relaxed font-medium">
            <p className="font-bold text-sm mb-0.5">
              {toast.type === 'error' && 'Atenção / Validação'}
              {toast.type === 'success' && 'Sucesso!'}
              {toast.type === 'warning' && 'Aviso de Acesso'}
              {toast.type === 'info' && 'Informação'}
            </p>
            <p>{toast.message}</p>
          </div>

          <button
            onClick={closeToast}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTAINER CARD WITH CONTROLLED MAX-HEIGHT AND INNER OVERFLOW SCROLL */}
      <div
        className={`w-full max-w-lg max-h-[85vh] sm:max-h-[88vh] flex flex-col rounded-3xl shadow-xl backdrop-blur-xl relative overflow-hidden my-auto border transition-colors duration-200 ${
          isDark
            ? 'bg-slate-800/95 border-slate-700/80 text-white'
            : 'bg-white border-[#E2E8F0] text-[#1C2B3E] shadow-slate-200/50'
        }`}
      >
        {/* THEME TOGGLE BUTTON AT TOP RIGHT */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isDark
                ? 'bg-slate-700/70 hover:bg-slate-700 text-amber-300 border border-slate-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
            title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span className="hidden sm:inline text-[11px]">Modo Escuro</span>
              </>
            )}
          </button>
        </div>

        {/* SCROLLABLE CARD BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar">
          
          {/* HEADER SECTION: ICON + TITLE + SUBTITLE */}
          <div className="text-center mb-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border transition-colors ${
                isDark
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0284C7]'
              }`}
            >
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>
              Amortização Financiamento Bancário
            </h1>
            <p className={`text-xs font-medium tracking-wider uppercase mt-1 ${isDark ? 'text-sky-400' : 'text-[#64748B]'}`}>
              CALAZANS IMOB - Soluções Imobiliárias
            </p>
          </div>

          {/* ========================================================================= */}
          {/* TELA 1: LOGIN */}
          {/* ========================================================================= */}
          {currentView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* FIELD: EMAIL OU CPF */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  E-mail Profissional ou CPF
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="corretor@imobiliaria.com.br"
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs font-normal outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* FIELD: SENHA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3.5 top-3.5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className={`w-full rounded-xl pl-10 pr-10 py-3 text-xs font-normal outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-3.5 transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={showPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ACTION BUTTON: ENTRAR NO SISTEMA */}
              <button
                type="submit"
                disabled={isLoginLoading}
                className={`w-full py-3.5 border font-semibold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2 ${
                  isDark
                    ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300'
                    : 'bg-[#E0F2FE] hover:bg-sky-200/80 active:bg-sky-300/80 border-[#BAE6FD] text-[#0284C7]'
                }`}
              >
                {isLoginLoading ? (
                  <span className="animate-pulse">Autenticando Acesso...</span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* DIVIDER */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDark ? 'border-slate-700' : 'border-[#E2E8F0]'}`} />
                </div>
                <span
                  className={`relative px-3 text-[10px] font-medium uppercase tracking-widest ${
                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-[#64748B]'
                  }`}
                >
                  Ainda não tem acesso?
                </span>
              </div>

              {/* ACTION BUTTON: CADASTRAR COMO CORRETOR */}
              <button
                type="button"
                onClick={() => setCurrentView('register')}
                className={`w-full py-3 font-medium text-xs uppercase tracking-wider rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600/80'
                    : 'bg-[#F8FAFC] hover:bg-slate-100 text-[#1C2B3E] border-[#E2E8F0]'
                }`}
              >
                <UserPlus className="w-4 h-4 text-[#0284C7]" />
                <span>Cadastrar como Corretor</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TELA 2: CADASTRO DO CORRETOR */}
          {/* ========================================================================= */}
          {currentView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className={`border-b pb-3 mb-3 ${isDark ? 'border-slate-700' : 'border-[#E2E8F0]'}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>
                  <UserPlus className="w-4 h-4 text-[#0284C7]" />
                  <span>Solicitação de Credenciamento</span>
                </h2>
                <p className={`text-xs font-normal mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>
                  Preencha seus dados profissionais para análise da equipe.
                </p>
              </div>

              {/* FIELD: NOME COMPLETO */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nome e Sobrenome"
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-normal outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* GRID: CPF E TELEFONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    CPF
                  </label>
                  <div className="relative">
                    <FileText className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                    <input
                      type="text"
                      value={regCpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono outline-none transition-all border ${
                        isDark
                          ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                    <input
                      type="text"
                      value={regPhone}
                      onChange={handlePhoneChange}
                      placeholder="(27) 99999-9999"
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono outline-none transition-all border ${
                        isDark
                          ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* FIELD: EMAIL PROFISSIONAL */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  E-mail Profissional *
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="corretor@imobiliaria.com.br"
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-normal outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* GRID: CRECI E IMOBILIÁRIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    Nº CRECI
                  </label>
                  <div className="relative">
                    <ShieldCheck className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                    <input
                      type="text"
                      value={regCreci}
                      onChange={(e) => setRegCreci(e.target.value)}
                      placeholder="12345-F"
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono uppercase outline-none transition-all border ${
                        isDark
                          ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    Imobiliária / Empresa
                  </label>
                  <div className="relative">
                    <Building className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                    <input
                      type="text"
                      value={regImobiliaria}
                      onChange={(e) => setRegImobiliaria(e.target.value)}
                      placeholder="Sua Imobiliária"
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs font-normal outline-none transition-all border ${
                        isDark
                          ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* FIELD: SENHA INICIAL */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3.5 top-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-[#0284C7]'}`} />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Crie uma senha de acesso"
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-normal outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E] placeholder-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isRegLoading}
                className={`w-full py-3.5 border font-semibold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2 ${
                  isDark
                    ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300'
                    : 'bg-[#E0F2FE] hover:bg-sky-200/80 active:bg-sky-300/80 border-[#BAE6FD] text-[#0284C7]'
                }`}
              >
                {isRegLoading ? (
                  <span className="animate-pulse">Enviando Dados...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Cadastro para Análise</span>
                  </>
                )}
              </button>

              {/* RETURN BUTTON */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentView('login')}
                  className={`text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-[#64748B] hover:text-[#1C2B3E]'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Voltar à Tela de Login</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TELA 3: CADASTRO PENDENTE / EM ANÁLISE */}
          {/* ========================================================================= */}
          {currentView === 'pending' && (
            <div className="space-y-4 text-center animate-fade-in">
              {/* STATUS BADGE */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border transition-colors ${
                  isDark
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-[#FEF3C7] border-amber-200 text-amber-600'
                }`}
              >
                <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
              </div>

              <div>
                <span
                  className={`inline-block px-3.5 py-1 font-medium text-[11px] uppercase tracking-wider rounded-full mb-2 border ${
                    isDark
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-[#FEF3C7] border-amber-200 text-amber-700'
                  }`}
                >
                  Análise em Andamento
                </span>
                <h2 className={`text-xl font-semibold uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>
                  Cadastro em Avaliação
                </h2>
                <p className={`text-xs sm:text-sm font-normal max-w-sm mx-auto mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  A solicitação de credenciamento do corretor foi recebida e está sob análise do Administrador.
                </p>
              </div>

              {/* SUMMARY CARD OF REGISTERED BROKER DATA */}
              {activeBrokerData && (
                <div
                  className={`rounded-2xl p-4 text-left space-y-2 text-xs border transition-all ${
                    isDark ? 'bg-slate-900/80 border-slate-700/90 text-slate-300' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1C2B3E]'
                  }`}
                >
                  <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-[#E2E8F0]'}`}>
                    <span className="text-xs font-semibold uppercase text-[#64748B]">Resumo da Solicitação</span>
                    <span className="text-xs font-mono text-amber-600 font-semibold">STATUS: PENDENTE</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">Nome Completo</p>
                      <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>{activeBrokerData.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">E-mail</p>
                      <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>{activeBrokerData.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">CPF</p>
                      <p className="font-mono text-slate-700">{activeBrokerData.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">Telefone</p>
                      <p className="font-mono text-slate-700">{activeBrokerData.phone || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">CRECI</p>
                      <p className="font-mono text-[#0284C7] font-semibold">{activeBrokerData.creci || 'Em validação'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#64748B]">Imobiliária</p>
                      <p className="font-medium text-slate-700">{activeBrokerData.imobiliaria || 'Parceira'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* GUIDANCE NOTE */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-800 text-left flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-normal">
                  <strong className="font-semibold">Importante:</strong> Assim que a gerência validar o seu CRECI e liberar o acesso, você receberá a permissão para criar e exportar simulações.
                </p>
              </div>

              {/* ACTION: VOLTAR AO LOGIN */}
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className={`w-full py-3 font-medium text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-[#F1F5F9] hover:bg-slate-200 text-[#1C2B3E] border-[#E2E8F0]'
                }`}
              >
                Voltar para a Tela de Login
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TELA 2: ACESSO AUTORIZADO */}
          {/* ========================================================================= */}
          {currentView === 'approved' && (
            <div className="space-y-4 text-center animate-fade-in">
              {/* CHECK ICON */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border transition-colors ${
                  isDark
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                    : 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0284C7]'
                }`}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <span
                  className={`inline-block px-3.5 py-1 font-medium text-[11px] uppercase tracking-wider rounded-full mb-2 border ${
                    isDark
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0369a1]'
                  }`}
                >
                  CRECI Validado & Ativo
                </span>
                <h2 className={`text-xl font-semibold uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>
                  ACESSO AUTORIZADO!
                </h2>
                <p className={`text-xs sm:text-sm font-normal max-w-sm mx-auto mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  Bem-vindo à CALAZANS IMOB - Soluções Imobiliárias. Seu perfil está totalmente habilitado para criar e exportar simulações.
                </p>
              </div>

              {/* USER CARD */}
              <div
                className={`rounded-2xl p-4 text-left border transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-500/30'
                    : 'bg-[#F0F9FF] border-[#E0F2FE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0284C7] rounded-full flex items-center justify-center font-medium text-white text-base shrink-0">
                    {(activeBrokerData?.name || currentUser?.name || 'Rafael Calazans').charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className={`font-semibold text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-[#1C2B3E]'}`}>
                      {activeBrokerData?.name || currentUser?.name || 'Rafael Calazans'}
                    </h3>
                    <p className="text-xs font-normal text-[#0369a1] truncate">
                      {activeBrokerData?.email || currentUser?.email || 'calazansvendas@gmail.com'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTION: ACESSAR PAINEL */}
              <button
                type="button"
                onClick={handleEnterDashboard}
                className={`w-full py-3.5 border font-semibold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                  isDark
                    ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300'
                    : 'bg-[#E0F2FE] hover:bg-sky-200/80 active:bg-sky-300/80 border-[#BAE6FD] text-[#0284C7]'
                }`}
              >
                <span>Acessar Painel Principal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
