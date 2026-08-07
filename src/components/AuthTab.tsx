import React, { useState } from 'react';
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
} from 'lucide-react';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/storageService';
import {
  authenticateUserAsync,
  registerPublicUserAsync,
  getStoredUsers,
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

      // REGRA DE SEGURANÇA 1: USUÁRIO NÃO ENCONTRADO
      if (result.userNotFound || (!result.user && !result.statusBlocked)) {
        showToast('E-mail não cadastrado. Por favor, solicite seu cadastro primeiro.', 'error');
        return; // PERMANECE NA TELA DE LOGIN!
      }

      const userProfile = result.user;

      // REGRA DE SEGURANÇA 2: CADASTRO PENDENTE OU EM ANÁLISE
      if (result.statusBlocked || userProfile?.status === 'Pendente') {
        setActiveBrokerData({
          name: userProfile?.name || 'Corretor Solicitante',
          email: userProfile?.email || cleanEmail,
          cpf: userProfile?.cpf || 'Não informado',
          phone: userProfile?.phone || 'Não informado',
          creci: userProfile?.creci || 'Em validação',
          imobiliaria: userProfile?.imobiliaria || 'Parceira Morar',
          status: 'Pendente',
        });
        setCurrentView('pending');
        showToast('Seu cadastro está em análise pelo Administrador.', 'warning');
        return;
      }

      // REGRA DE SEGURANÇA 3: USUÁRIO BLOQUEADO / PAUSADO
      if (userProfile?.status === 'Pausado') {
        showToast('Seu cadastro está suspenso. Entre em contato com a gerência.', 'error');
        return;
      }

      // REGRA DE SUCESSO: USUÁRIO ATIVO / APROVADO
      if (userProfile && userProfile.status === 'Ativo') {
        setCurrentUser(userProfile);
        saveUserProfile(userProfile);
        setActiveBrokerData(userProfile);

        showToast(`Bem-vindo, ${userProfile.name}! Acesso autorizado.`, 'success');
        
        // Show Approved view or launch directly
        setCurrentView('approved');
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

  return (
    <div className="flex-1 bg-slate-900/95 min-h-full py-8 px-4 flex flex-col items-center justify-center relative overflow-y-auto font-sans">
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

      {/* MAIN CONTAINER CARD */}
      <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden my-auto">
        
        {/* HEADER SECION: ICON + TITLE + SUBTITLE */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Portal do Corretor
          </h1>
          <p className="text-xs font-semibold text-emerald-400/90 tracking-widest uppercase mt-1">
            Rede Exclusiva de Imóveis
          </p>
        </div>

        {/* ========================================================================= */}
        {/* TELA 1: LOGIN */}
        {/* ========================================================================= */}
        {currentView === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* FIELD: EMAIL OU CPF */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail Profissional ou CPF
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="corretor@imobiliaria.com.br"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white font-medium placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* FIELD: SENHA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-11 py-3 text-sm text-white font-medium placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* ACTION BUTTON: ENTRAR NO SISTEMA */}
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <span className="relative px-3 bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Ainda não tem acesso?
              </span>
            </div>

            {/* ACTION BUTTON: CADASTRAR COMO CORRETOR */}
            <button
              type="button"
              onClick={() => setCurrentView('register')}
              className="w-full py-3 bg-slate-700/60 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-600/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar como Corretor</span>
            </button>

            {/* ADMIN QUICK TEST ACCORDION */}
            <div className="pt-4 border-t border-slate-700/60 text-center">
              <p className="text-[11px] text-slate-400">
                Acesso de demonstração rápida:{' '}
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('carlos.admin@morar.com.br');
                    setLoginPassword('admin123');
                  }}
                  className="text-emerald-400 font-bold hover:underline ml-1 cursor-pointer"
                >
                  Usar dados do Administrador
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TELA 2: CADASTRO DO CORRETOR */}
        {/* ========================================================================= */}
        {currentView === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="border-b border-slate-700 pb-3 mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Solicitação de Credenciamento
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Preencha seus dados profissionais para análise da equipe.
              </p>
            </div>

            {/* FIELD: NOME COMPLETO */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* GRID: CPF E TELEFONE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  CPF
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regCpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={handlePhoneChange}
                    placeholder="(27) 99999-9999"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* FIELD: EMAIL PROFISSIONAL */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                E-mail Profissional *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="corretor@imobiliaria.com.br"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* GRID: CRECI E IMOBILIÁRIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nº CRECI
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regCreci}
                    onChange={(e) => setRegCreci(e.target.value)}
                    placeholder="12345-F"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Imobiliária / Empresa
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regImobiliaria}
                    onChange={(e) => setRegImobiliaria(e.target.value)}
                    placeholder="Sua Imobiliária"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* FIELD: SENHA INICIAL */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Senha de Acesso (Opcional - Padrão: Morar@2026)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Crie uma senha"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isRegLoading}
              className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                className="text-xs text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voltar à Tela de Login</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TELA 3: CADASTRO PENDENTE / EM ANÁLISE */}
        {/* ========================================================================= */}
        {currentView === 'pending' && (
          <div className="space-y-5 text-center animate-fade-in">
            {/* STATUS BADGE */}
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase tracking-widest rounded-full mb-2">
                Análise em Andamento
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Cadastro em Avaliação
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
                A solicitação de credenciamento do corretor foi recebida e está sob análise do administrador.
              </p>
            </div>

            {/* SUMMARY CARD OF REGISTERED BROKER DATA */}
            {activeBrokerData && (
              <div className="bg-slate-900/80 border border-slate-700/90 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Resumo da Solicitação</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">STATUS: PENDENTE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Nome Completo</p>
                    <p className="font-semibold text-white truncate">{activeBrokerData.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">E-mail</p>
                    <p className="font-semibold text-white truncate">{activeBrokerData.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">CPF</p>
                    <p className="font-mono text-slate-200">{activeBrokerData.cpf || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Telefone</p>
                    <p className="font-mono text-slate-200">{activeBrokerData.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">CRECI</p>
                    <p className="font-mono text-emerald-400 font-bold">{activeBrokerData.creci || 'Em validação'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Imobiliária</p>
                    <p className="font-semibold text-slate-200">{activeBrokerData.imobiliaria || 'Parceira'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* GUIDANCE NOTE */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200/90 text-left flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Importante:</strong> Assim que a gerência validar o seu CRECI e liberar o acesso, você receberá o direito de uso completo de todas as calculadoras e simulações Pro-Soluto Direto.
              </p>
            </div>

            {/* ACTION: VOLTAR AO LOGIN */}
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Voltar para a Tela de Login
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 4: CADASTRO APROVADO */}
        {/* ========================================================================= */}
        {currentView === 'approved' && (
          <div className="space-y-5 text-center animate-fade-in">
            {/* CHECK ICON */}
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] uppercase tracking-widest rounded-full mb-2">
                CRECI Validado & Ativo
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Acesso Autorizado!
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
                Bem-vindo ao Portal do Corretor. Seu perfil está totalmente habilitado para criar e exportar simulações Pro-Soluto.
              </p>
            </div>

            {/* PROFILE CARD */}
            {activeBrokerData && (
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-black text-white text-base">
                    {activeBrokerData.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{activeBrokerData.name}</h3>
                    <p className="text-[11px] text-emerald-400 font-semibold">{activeBrokerData.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION: ACESSAR PAINEL */}
            <button
              type="button"
              onClick={handleEnterDashboard}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Acessar Painel Principal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
