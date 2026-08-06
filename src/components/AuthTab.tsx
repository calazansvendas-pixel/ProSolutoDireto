import React, { useState } from 'react';
import {
  Fingerprint,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/storageService';
import { authenticateUserAsync, registerPublicUserAsync, authenticateUser } from '../services/userService';

interface AuthTabProps {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  onLoginSuccess?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthTab: React.FC<AuthTabProps> = ({
  currentUser,
  setCurrentUser,
  onLoginSuccess,
  onLogout,
  isAuthenticated = true,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Register form state (Full Name, Email, Password, Confirm Password)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regNotice, setRegNotice] = useState<string | null>(null);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError(null);

    if (!loginIdentifier.trim()) {
      setBlockError('Por favor, informe seu e-mail ou usuário.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUserAsync(loginIdentifier, loginPassword);
      setIsLoading(false);

      if (result.statusBlocked) {
        setBlockError(
          result.message ||
            'Seu cadastro continua pendente de aprovação pelo administrador. Por favor, aguarde a liberação para acessar o app.'
        );
        return;
      }

      if (result.success && result.user) {
        setCurrentUser(result.user);
        saveUserProfile(result.user);
        setLoginSuccess(true);

        if (onLoginSuccess) {
          onLoginSuccess();
        }

        setTimeout(() => setLoginSuccess(false), 3000);
      }
    } catch (err: any) {
      setIsLoading(false);
      setBlockError('Falha na autenticação. Verifique suas credenciais e tente novamente.');
    }
  };

  // Quick social login trigger
  const handleQuickSocialLogin = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateUserAsync('joao.silva@morar.com.br');
      setIsLoading(false);
      if (result.statusBlocked) {
        setBlockError(
          result.message ||
            'Seu cadastro continua pendente de aprovação pelo administrador. Por favor, aguarde a liberação para acessar o app.'
        );
        return;
      }
      if (result.user) {
        setCurrentUser(result.user);
        saveUserProfile(result.user);
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      setIsLoading(false);
    }
  };

  // Handle Register submission (Public flow: Role "Corretor", Status "Pendente")
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegNotice(null);

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Por favor, preencha o Nome Completo e o E-mail.');
      return;
    }

    if (regPassword && regConfirmPassword && regPassword !== regConfirmPassword) {
      setRegError('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      // Auto-registers user with role "corretor" and status "Pendente" in Firebase Auth + Firestore
      const newUser = await registerPublicUserAsync({
        name: regName,
        email: regEmail,
        password: regPassword,
      });

      setIsLoading(false);

      setRegNotice(
        `Cadastro enviado com sucesso para "${newUser.email}"! Seu perfil foi registrado como Corretor (Pendente). Por favor, aguarde a liberação do Administrador.`
      );

      setLoginIdentifier(newUser.email);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAuthMode('login');
    } catch (err: any) {
      setIsLoading(false);
      setRegError('Erro ao cadastrar usuário no servidor. Tente novamente.');
    }
  };

  // Handle Forgot password submission
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setForgotSent(true);
    }, 600);
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 flex flex-col items-center justify-center min-h-full overflow-y-auto">
      {/* LOGIN CARD */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl relative overflow-hidden transition-all">
        {/* TOP BRAND ICON & TITLE */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Fingerprint className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">
            {authMode === 'login' && 'BEM-VINDO'}
            {authMode === 'register' && 'CRIAR CONTA'}
            {authMode === 'forgot' && 'RECUPERAR SENHA'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {authMode === 'login' && 'Acesse sua conta para continuar'}
            {authMode === 'register' && 'Preencha os dados abaixo para solicitar cadastro'}
            {authMode === 'forgot' && 'Informe seu e-mail para receber as instruções'}
          </p>
        </div>

        {/* REGISTRATION SUCCESS NOTICE */}
        {regNotice && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-2.5 font-semibold leading-relaxed shadow-xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Aguardando Aprovação!</p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">{regNotice}</p>
            </div>
          </div>
        )}

        {/* PENDING / PAUSED STATUS BLOCK WARNING */}
        {blockError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-2xl flex items-start gap-2.5 font-semibold leading-relaxed shadow-xs animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Acesso Bloqueado</p>
              <p className="text-[11px] text-rose-800 font-medium mt-0.5">{blockError}</p>
            </div>
          </div>
        )}

        {/* FEEDBACK SUCCESS TOAST */}
        {loginSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sessão autenticada com sucesso! Redirecionando...</span>
          </div>
        )}

        {/* VIEW 1: LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* FIELD 1: EMAIL OR USERNAME */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                E-MAIL OU USUÁRIO
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setBlockError(null);
                  }}
                  placeholder="seu@email.com ou usuario"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* FIELD 2: PASSWORD + FORGOT LINK */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  SENHA
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setBlockError(null);
                  }}
                  placeholder="Sua senha"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* CHECKBOX: REMEMBER ME */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <span>Lembrar-me</span>
              </label>
            </div>

            {/* MAIN LOGIN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm tracking-wider uppercase rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <span className="animate-pulse">Validando Acesso...</span>
              ) : (
                <span>ENTRAR</span>
              )}
            </button>

            {/* VISUAL DIVIDER */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                OU CONTINUE COM
              </span>
            </div>

            {/* SOCIAL BUTTON */}
            <div>
              <button
                type="button"
                onClick={handleQuickSocialLogin}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </div>

            {/* FOOTER: REGISTER LINK */}
            <div className="pt-4 text-center">
              <p className="text-xs text-slate-600 font-medium">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setBlockError(null);
                  }}
                  className="text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          </form>
        )}

        {/* VIEW 2: REGISTER FORM (NOME COMPLETO, EMAIL, SENHA, CONFIRMAR SENHA) */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                NOME COMPLETO
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                E-MAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                SENHA
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 font-medium outline-none focus:border-emerald-600 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                CONFIRMAR SENHA
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 font-medium outline-none focus:border-emerald-600 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              ℹ️ Seus dados serão cadastrados com perfil <strong className="text-slate-800">Corretor</strong> e status <strong className="text-amber-700 font-bold">Pendente</strong> aguardando aprovação pelo Administrador.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? <span>Enviando Cadastro...</span> : <span>SOLICITAR CADASTRAR</span>}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Voltar ao Login</span>
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: FORGOT PASSWORD */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            {forgotSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-900">E-mail Enviado!</p>
                <p className="text-xs text-emerald-700">
                  Enviamos as instruções de redefinição de senha para <strong className="font-mono">{forgotEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    setAuthMode('login');
                  }}
                  className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                >
                  Ir para Login
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                    INFORME SEU E-MAIL
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-emerald-600 outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>ENVIAR INSTRUÇÕES</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Voltar para Login</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
