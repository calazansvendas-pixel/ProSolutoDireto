import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  PauseCircle,
  Trash2,
  ShieldCheck,
  Search,
  Filter,
  X,
  Check,
  AlertTriangle,
  User,
  Plus,
  ShieldAlert,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  Building,
  FileText,
  Calendar,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '../types';
import {
  getStoredUsers,
  fetchUsersFromFirestore,
  updateUserStatusAsync,
  updateUserRoleAsync,
  createUserByAdminAsync,
  deleteUserAsync,
} from '../services/userService';

interface UserManagementTabProps {
  currentUser: UserProfile;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New user form state for Admin manual addition
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('corretor');
  const [newStatus, setNewStatus] = useState<UserStatus>('Ativo');
  const [formError, setFormError] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    // Initial sync from Firestore
    setUsers(getStoredUsers());
    loadFirestoreUsers();
  }, []);

  const loadFirestoreUsers = async () => {
    setIsRefreshing(true);
    const fsUsers = await fetchUsersFromFirestore();
    setUsers(fsUsers);
    setIsRefreshing(false);
  };

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    const updated = await updateUserStatusAsync(userId, newStatus);
    setUsers(updated);
    triggerNotice(`Status do usuário atualizado para "${newStatus}".`);

    // Keep selected user modal in sync
    if (selectedUserForDetails && (selectedUserForDetails.id === userId || selectedUserForDetails.uid === userId)) {
      setSelectedUserForDetails({
        ...selectedUserForDetails,
        status: newStatus,
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const updated = await updateUserRoleAsync(userId, newRole);
    setUsers(updated);
    triggerNotice(`Perfil alterado para "${getRoleLabel(newRole)}".`);

    // Keep selected user modal in sync
    if (selectedUserForDetails && (selectedUserForDetails.id === userId || selectedUserForDetails.uid === userId)) {
      setSelectedUserForDetails({
        ...selectedUserForDetails,
        role: newRole,
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      const updated = await deleteUserAsync(userId);
      setUsers(updated);
      if (selectedUserForDetails && (selectedUserForDetails.id === userId || selectedUserForDetails.uid === userId)) {
        setSelectedUserForDetails(null);
      }
      triggerNotice(`Usuário "${userName}" removido com sucesso.`);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Por favor, preencha o nome e o e-mail do usuário.');
      return;
    }

    const updated = await createUserByAdminAsync({
      name: newName,
      email: newEmail,
      role: newRole,
      status: newStatus,
    });

    setUsers(updated);
    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewRole('corretor');
    setNewStatus('Ativo');
    setFormError('');
    triggerNotice('Novo usuário cadastrado e sincronizado com sucesso!');
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cpf && u.cpf.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.creci && u.creci.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatusFilter === 'todos' ||
      u.status.toLowerCase() === selectedStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === 'Ativo').length;
  const pendingCount = users.filter((u) => u.status === 'Pendente').length;
  const pausedCount = users.filter((u) => u.status === 'Pausado').length;

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      case 'consultor':
        return 'Consultor';
      case 'corretor':
        return 'Corretor';
      default:
        return role;
    }
  }

  function getStatusBadge(status: UserStatus) {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#E0F2FE] text-[#0369a1] border border-[#BAE6FD] px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-[#0284C7]" />
            Ativo
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#FEF3C7] text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
      case 'Pausado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
            <PauseCircle className="w-3 h-3 text-rose-600" />
            Pausado
          </span>
        );
      default:
        return null;
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return 'Data não informada';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  function getWhatsAppUrl(phoneStr?: string) {
    if (!phoneStr) return null;
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length < 10) return null;
    const fullDigits = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${fullDigits}`;
  }

  return (
    <div className="flex-1 bg-[#F8FAFC] p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ACTION NOTICE TOAST */}
        {actionNotice && (
          <div className="bg-[#0284C7] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-semibold animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-200" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#0284C7]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1C2B3E] uppercase tracking-wide">
                Gestão de Usuários
              </h1>
              <p className="text-xs text-[#64748B] font-normal">
                Controle de acessos, aprovação de cadastros e ficha técnica detalhada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFirestoreUsers}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1C2B3E] text-xs font-semibold rounded-2xl transition-all cursor-pointer disabled:opacity-50 border border-[#E2E8F0]"
              title="Atualizar dados do Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0284C7]' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-xs font-semibold uppercase tracking-wider rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* SUMMARY STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Usuários</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#1C2B3E]">{totalCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#BAE6FD] shadow-2xs">
            <div className="flex items-center justify-between text-[#0369a1] mb-1">
              <span className="text-[11px] font-semibold uppercase">Ativos</span>
              <CheckCircle2 className="w-4 h-4 text-[#0284C7]" />
            </div>
            <p className="text-2xl font-bold text-[#0284C7]">{activeCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase">Pendentes</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-semibold uppercase">Pausados</span>
              <PauseCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-700">{pausedCount}</p>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail, CRECI ou CPF..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-xs font-normal text-[#1C2B3E] placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          {/* STATUS FILTER TABS */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {['todos', 'pendente', 'ativo', 'pausado'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setSelectedStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  selectedStatusFilter === statusKey
                    ? 'bg-[#0284C7] text-white shadow-2xs'
                    : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                }`}
              >
                {statusKey === 'todos' ? 'Todos' : statusKey}
              </button>
            ))}
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Usuário</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Perfil / Nível</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#64748B] font-normal">
                      Nenhum usuário encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isMainAdminAccount = u.isMainAdmin || u.email === 'carlos.admin@morar.com.br';

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUserForDetails(u)}
                        className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                      >
                        {/* USER NAME */}
                        <td className="p-4 font-semibold text-[#1C2B3E]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-[#1C2B3E] group-hover:text-[#0284C7] transition-colors">
                                {u.name}
                              </span>
                              {isMainAdminAccount && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#0369a1] bg-[#E0F2FE] px-1.5 py-0.5 rounded border border-[#BAE6FD] mt-0.5">
                                  <ShieldAlert className="w-2.5 h-2.5 text-[#0284C7]" />
                                  Admin Principal (Protegido)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="p-4 text-[#64748B] font-normal">{u.email}</td>

                        {/* ROLE SELECTOR */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#1C2B3E] text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#0284C7] cursor-pointer"
                          >
                            <option value="corretor">Corretor</option>
                            <option value="consultor">Consultor</option>
                            <option value="gerente">Gerente</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>

                        {/* STATUS BADGE */}
                        <td className="p-4">{getStatusBadge(u.status)}</td>

                        {/* ACTIONS */}
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* VIEW DETAILS EYE BUTTON */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDetails(u)}
                              className="p-1.5 rounded-xl text-[#0284C7] hover:bg-[#E0F2FE] transition-all cursor-pointer"
                              title="Visualizar Ficha do Usuário"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* APPROVE BUTTON (If Pendente) */}
                            {u.status === 'Pendente' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(u.id, 'Ativo')}
                                className="inline-flex items-center gap-1 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                                title="Aprovar e Liberar Acesso"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>
                            )}

                            {/* PAUSE / REACTIVATE BUTTON */}
                            {u.status === 'Ativo' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(u.id, 'Pausado')}
                                disabled={isMainAdminAccount}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-all border ${
                                  isMainAdminAccount
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer'
                                }`}
                                title={
                                  isMainAdminAccount
                                    ? 'A conta do Administrador Principal não pode ser pausada'
                                    : 'Pausar Acesso do Usuário'
                                }
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Pausar</span>
                              </button>
                            )}

                            {u.status === 'Pausado' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(u.id, 'Ativo')}
                                className="inline-flex items-center gap-1 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                                title="Reativar Acesso"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0284C7]" />
                                <span>Reativar</span>
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={isMainAdminAccount}
                              className={`p-1.5 rounded-xl transition-all ${
                                isMainAdminAccount
                                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                                  : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                isMainAdminAccount
                                  ? 'A conta do Administrador Principal não pode ser excluída'
                                  : 'Excluir Usuário'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: FICHA CADASTRAL COMPLETA DO USUÁRIO */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E8F0] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-[#0284C7]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C2B3E] uppercase tracking-wide">
                    Ficha Cadastral do Usuário
                  </h3>
                  <p className="text-xs text-[#64748B] font-normal">
                    Detalhes profissionais e credenciamento de corretor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-[#1C2B3E] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* USER CARD SUMMARY */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                  {selectedUserForDetails.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-[#1C2B3E] truncate">
                    {selectedUserForDetails.name}
                  </h4>
                  <p className="text-xs text-[#0369a1] font-normal truncate">
                    {selectedUserForDetails.email}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {getStatusBadge(selectedUserForDetails.status)}
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                  {getRoleLabel(selectedUserForDetails.role)}
                </span>
              </div>
            </div>

            {/* DETAILED FIELDS GRID */}
            <div className="space-y-3.5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* NOME COMPLETO */}
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    Nome Completo
                  </span>
                  <p className="font-semibold text-[#1C2B3E]">{selectedUserForDetails.name}</p>
                </div>

                {/* E-MAIL PROFISSIONAL */}
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] relative group">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    E-mail Profissional
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-[#1C2B3E] truncate">{selectedUserForDetails.email}</p>
                    <a
                      href={`mailto:${selectedUserForDetails.email}`}
                      className="text-[#0284C7] hover:text-[#0369a1] p-1 shrink-0"
                      title="Enviar e-mail"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* CPF */}
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    CPF
                  </span>
                  <p className="font-mono text-[#1C2B3E]">{selectedUserForDetails.cpf || 'Não informado'}</p>
                </div>

                {/* TELEFONE / WHATSAPP */}
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    Telefone / WhatsApp
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-mono text-[#1C2B3E]">
                      {selectedUserForDetails.phone || 'Não informado'}
                    </p>
                    {getWhatsAppUrl(selectedUserForDetails.phone) && (
                      <a
                        href={getWhatsAppUrl(selectedUserForDetails.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#E0F2FE] hover:bg-sky-200 text-[#0284C7] px-2 py-0.5 rounded-lg transition-colors shrink-0"
                        title="Abrir WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Whats</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* CRECI */}
                <div className="bg-white p-3 rounded-xl border border-[#BAE6FD]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    Nº do CRECI
                  </span>
                  <p className="font-mono font-bold text-[#0284C7] text-sm">
                    {selectedUserForDetails.creci || 'Em validação'}
                  </p>
                </div>

                {/* IMOBILIÁRIA */}
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-0.5">
                    Imobiliária / Empresa
                  </span>
                  <p className="font-semibold text-[#1C2B3E]">
                    {selectedUserForDetails.imobiliaria || 'Parceira'}
                  </p>
                </div>
              </div>

              {/* DATA E HORA DE CADASTRO */}
              <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase">
                  Data e Hora de Cadastro
                </span>
                <span className="font-mono text-[#1C2B3E] font-medium">
                  {formatDate(selectedUserForDetails.createdAt)}
                </span>
              </div>
            </div>

            {/* MODAL ACTIONS BAR */}
            <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* APPROVE BUTTON */}
                {selectedUserForDetails.status === 'Pendente' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedUserForDetails.id, 'Ativo')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar Cadastro</span>
                  </button>
                )}

                {/* PAUSE BUTTON */}
                {selectedUserForDetails.status === 'Ativo' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedUserForDetails.id, 'Pausado')}
                    disabled={
                      selectedUserForDetails.isMainAdmin ||
                      selectedUserForDetails.email === 'carlos.admin@morar.com.br'
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all border ${
                      selectedUserForDetails.isMainAdmin ||
                      selectedUserForDetails.email === 'carlos.admin@morar.com.br'
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer'
                    }`}
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>Pausar Acesso</span>
                  </button>
                )}

                {/* REACTIVATE BUTTON */}
                {selectedUserForDetails.status === 'Pausado' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedUserForDetails.id, 'Ativo')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#0284C7]" />
                    <span>Reativar Acesso</span>
                  </button>
                )}

                {/* DELETE BUTTON */}
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteUser(selectedUserForDetails.id, selectedUserForDetails.name)
                  }
                  disabled={
                    selectedUserForDetails.isMainAdmin ||
                    selectedUserForDetails.email === 'carlos.admin@morar.com.br'
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all border ${
                    selectedUserForDetails.isMainAdmin ||
                    selectedUserForDetails.email === 'carlos.admin@morar.com.br'
                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-40'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                  }`}
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              </div>

              {/* CLOSE BUTTON */}
              <button
                type="button"
                onClick={() => setSelectedUserForDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#1C2B3E] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR NOVO USUÁRIO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E2E8F0] shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#0284C7]" />
                </div>
                <h3 className="text-base font-bold text-[#1C2B3E] uppercase">
                  Novo Usuário (Admin)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2B3E] outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                  E-mail do Usuário
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@morar.com.br"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2B3E] outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                    Perfil / Nível
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2B3E] outline-none focus:border-[#0284C7] focus:bg-white cursor-pointer"
                  >
                    <option value="corretor">Corretor</option>
                    <option value="consultor">Consultor</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2B3E] outline-none focus:border-[#0284C7] focus:bg-white cursor-pointer"
                  >
                    <option value="Ativo">Ativo (Liberado)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Pausado">Pausado</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#1C2B3E] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E0F2FE] hover:bg-sky-200/80 text-[#0284C7] border border-[#BAE6FD] text-xs font-semibold uppercase rounded-xl shadow-xs cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

