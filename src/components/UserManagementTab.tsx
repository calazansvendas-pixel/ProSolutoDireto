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
    triggerNotice(`Status do usuário atualizado no Firestore para "${newStatus}".`);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const updated = await updateUserRoleAsync(userId, newRole);
    setUsers(updated);
    triggerNotice(`Perfil alterado no Firestore para "${getRoleLabel(newRole)}".`);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${userName}" do Firestore?`)) {
      const updated = await deleteUserAsync(userId);
      setUsers(updated);
      triggerNotice(`Usuário "${userName}" removido do Firestore.`);
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
    triggerNotice('Novo usuário cadastrado e sincronizado no Firestore com sucesso!');
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ativo
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
      case 'Pausado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
            <PauseCircle className="w-3 h-3 text-rose-600" />
            Pausado
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ACTION NOTICE TOAST */}
        {actionNotice && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                Gestão de Usuários
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Controle de acessos, aprovação de cadastros e atribuição de perfis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFirestoreUsers}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50"
              title="Atualizar dados do Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* SUMMARY STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase">Total Usuários</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase">Ativos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700">{activeCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold uppercase">Pendentes</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold uppercase">Pausados</span>
              <PauseCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700">{pausedCount}</p>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {/* STATUS FILTER TABS */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {['todos', 'pendente', 'ativo', 'pausado'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setSelectedStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  selectedStatusFilter === statusKey
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusKey === 'todos' ? 'Todos' : statusKey}
              </button>
            ))}
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Usuário</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Perfil / Nível</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      Nenhum usuário encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isMainAdminAccount = u.isMainAdmin || u.email === 'carlos.admin@morar.com.br';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* USER NAME */}
                        <td className="p-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-900">{u.name}</span>
                              {isMainAdminAccount && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 mt-0.5">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  Admin Principal (Protegido)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="p-4 text-slate-600 font-medium">{u.email}</td>

                        {/* ROLE SELECTOR */}
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
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
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* APPROVE BUTTON (If Pendente) */}
                            {u.status === 'Pendente' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'Ativo')}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                                title="Aprovar e Liberar Acesso"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>
                            )}

                            {/* PAUSE / REACTIVATE BUTTON */}
                            {u.status === 'Ativo' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'Pausado')}
                                disabled={isMainAdminAccount}
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all border ${
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
                                onClick={() => handleStatusChange(u.id, 'Ativo')}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                                title="Reativar Acesso"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reativar</span>
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            <button
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

      {/* CREATE USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase">
                  Novo Usuário (Admin)
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  E-mail do Usuário
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@morar.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Perfil / Nível
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="corretor">Corretor</option>
                    <option value="consultor">Consultor</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase rounded-xl shadow-xs"
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
