import React, { useState } from 'react';
import {
  Building,
  Plus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Search,
  CheckCircle2,
  Pencil,
  Percent,
  XCircle,
  Save,
  Lock,
} from 'lucide-react';
import { Development } from '../types';

interface DevelopmentsTabProps {
  developments: Development[];
  setDevelopments: React.Dispatch<React.SetStateAction<Development[]>>;
  onSaveDevelopments: (list: Development[]) => void;
  userRole?: string;
}

export const DevelopmentsTab: React.FC<DevelopmentsTabProps> = ({
  developments,
  setDevelopments,
  onSaveDevelopments,
  userRole = 'corretor',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [status, setStatus] = useState<'ativo' | 'pausado'>('ativo');
  const [faixa1Ate, setFaixa1Ate] = useState<number>(36);
  const [faixa1Taxa, setFaixa1Taxa] = useState<number>(1.5);
  const [faixa2Ate, setFaixa2Ate] = useState<number>(60);
  const [faixa2Taxa, setFaixa2Taxa] = useState<number>(2.2);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [successText, setSuccessText] = useState('Empreendimento cadastrado com sucesso!');

  const canEditTaxa = userRole === 'admin' || userRole === 'gerente';

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setCidade('');
    setStatus('ativo');
    setFaixa1Ate(36);
    setFaixa1Taxa(1.5);
    setFaixa2Ate(60);
    setFaixa2Taxa(2.2);
  };

  const handleEditClick = (dev: Development) => {
    setEditingId(dev.id);
    setNome(dev.nome);
    setCidade(dev.cidade);
    setStatus(dev.status);
    setFaixa1Ate(dev.faixa1?.ateMeses ?? 36);
    setFaixa1Taxa(dev.faixa1?.taxaJurosPct ?? 1.5);
    setFaixa2Ate(dev.faixa2?.ateMeses ?? 60);
    setFaixa2Taxa(dev.faixa2?.taxaJurosPct ?? 2.2);
  };

  const handleSaveDevelopment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cidade.trim()) return;

    const faixa1Data = { ateMeses: Number(faixa1Ate) || 36, taxaJurosPct: Number(faixa1Taxa) || 0 };
    const faixa2Data = { ateMeses: Number(faixa2Ate) || 60, taxaJurosPct: Number(faixa2Taxa) || 0 };

    if (editingId) {
      const updated = developments.map((dev) =>
        dev.id === editingId
          ? {
              ...dev,
              nome: nome.trim(),
              cidade: cidade.trim(),
              status,
              faixa1: faixa1Data,
              faixa2: faixa2Data,
            }
          : dev
      );
      setDevelopments(updated);
      onSaveDevelopments(updated);
      setSuccessText('Empreendimento atualizado com sucesso!');
    } else {
      const newDev: Development = {
        id: `dev-${Date.now()}`,
        nome: nome.trim(),
        cidade: cidade.trim(),
        status,
        createdAt: new Date().toISOString(),
        faixa1: faixa1Data,
        faixa2: faixa2Data,
      };
      const updated = [newDev, ...developments];
      setDevelopments(updated);
      onSaveDevelopments(updated);
      setSuccessText('Empreendimento cadastrado com sucesso!');
    }

    resetForm();
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleToggleStatus = (id: string) => {
    const updated = developments.map((dev) =>
      dev.id === id ? { ...dev, status: dev.status === 'ativo' ? ('pausado' as const) : ('ativo' as const) } : dev
    );
    setDevelopments(updated);
    onSaveDevelopments(updated);
  };

  const handleDelete = (id: string) => {
    const updated = developments.filter((dev) => dev.id !== id);
    setDevelopments(updated);
    onSaveDevelopments(updated);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleUpdateInlineFaixas = (
    id: string,
    faixaKey: 'faixa1' | 'faixa2',
    field: 'ateMeses' | 'taxaJurosPct',
    value: number
  ) => {
    const updated = developments.map((dev) => {
      if (dev.id === id) {
        const currentFaixa =
          dev[faixaKey] ||
          (faixaKey === 'faixa1'
            ? { ateMeses: 36, taxaJurosPct: 1.5 }
            : { ateMeses: 60, taxaJurosPct: 2.2 });
        return {
          ...dev,
          [faixaKey]: {
            ...currentFaixa,
            [field]: value,
          },
        };
      }
      return dev;
    });
    setDevelopments(updated);
    onSaveDevelopments(updated);
  };

  const filteredDevelopments = developments.filter(
    (dev) =>
      dev.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
      {/* LEFT FORM: CADASTRAR/EDITAR EMPREENDIMENTO */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col space-y-4 shadow-sm h-fit">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              {editingId ? 'Editar Empreendimento' : 'Cadastrar Novo Empreendimento'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingId
                ? 'Altere os dados e as regras de juros do empreendimento.'
                : 'Adicione empreendimentos imobiliários com regras de juros por prazo.'}
            </p>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
              title="Cancelar edição"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSaveDevelopment} className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
              Nome do Empreendimento
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Condomínio Jardim das Palmeiras"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 outline-none shadow-xs font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
              Cidade / Estado
            </label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: Vitória - ES"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 outline-none shadow-xs font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ativo' | 'pausado')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 outline-none shadow-xs font-medium"
            >
              <option value="ativo">Ativo (Disponível na Calculadora)</option>
              <option value="pausado">Pausado (Oculto na Calculadora)</option>
            </select>
          </div>

          {/* FAIXAS DE JUROS - PARES LADO A LADO */}
          <div className="border-t border-slate-200 pt-3.5 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                Faixas de Regras de Juros
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure as taxas mensais de acordo com o prazo máximo em meses.
              </p>
            </div>

            {/* FAIXA 1 (Linha 1) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Faixa 1 de Juros
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
                    Até (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={faixa1Ate}
                    onChange={(e) => setFaixa1Ate(Number(e.target.value))}
                    placeholder="Ex: 36"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
                    Taxa de Juros (% a.m.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={faixa1Taxa}
                    onChange={(e) => setFaixa1Taxa(Number(e.target.value))}
                    placeholder="Ex: 1,5"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* FAIXA 2 (Linha 2) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Faixa 2 de Juros
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
                    Até (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={faixa2Ate}
                    onChange={(e) => setFaixa2Ate(Number(e.target.value))}
                    placeholder="Ex: 60"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 uppercase font-bold mb-1">
                    Taxa de Juros (% a.m.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={faixa2Taxa}
                    onChange={(e) => setFaixa2Taxa(Number(e.target.value))}
                    placeholder="Ex: 2,2"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-100/50 hover:bg-blue-200/60 text-blue-700 border border-blue-200/60 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all mt-2 backdrop-blur-xs"
          >
            {editingId ? <Save className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Empreendimento'}</span>
          </button>

          {showSuccessMsg && (
            <div className="p-3 bg-emerald-100/40 border border-emerald-200/50 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-bold backdrop-blur-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successText}</span>
            </div>
          )}
        </form>
      </div>

      {/* RIGHT LIST: EMPREENDIMENTOS CADASTRADOS */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col space-y-4 shadow-sm">
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Empreendimentos Cadastrados ({developments.length})
            </h3>
            <p className="text-xs text-slate-500">
              Gerencie os dados, status e faixas de juros dos empreendimentos.
            </p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empreendimento por nome ou cidade..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>

        {/* LIST TABLE / CARDS */}
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-1">
          {filteredDevelopments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
              Nenhum empreendimento encontrado.
            </div>
          ) : (
            filteredDevelopments.map((dev) => (
              <div
                key={dev.id}
                className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition-all ${
                  dev.status === 'ativo'
                    ? 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                {/* HEADER DA CARD: NOME, CIDADE, STATUS E AÇÕES */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{dev.nome}</h4>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-xs ${
                          dev.status === 'ativo'
                            ? 'bg-emerald-100/40 text-emerald-600 border border-emerald-200/50'
                            : 'bg-amber-100/40 text-amber-700 border border-amber-200/50'
                        }`}
                      >
                        {dev.status === 'ativo' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{dev.cidade}</p>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => handleEditClick(dev)}
                      className="px-2.5 py-1.5 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 rounded-xl text-xs font-bold flex items-center gap-1 transition-all backdrop-blur-xs shadow-2xs"
                      title="Editar Informações Básicas"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(dev.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all backdrop-blur-xs shadow-2xs ${
                        dev.status === 'ativo'
                          ? 'bg-amber-100/40 hover:bg-amber-200/50 text-amber-700 border border-amber-200/50'
                          : 'bg-emerald-100/40 hover:bg-emerald-200/50 text-emerald-600 border border-emerald-200/50'
                      }`}
                      title={dev.status === 'ativo' ? 'Pausar Empreendimento' : 'Ativar Empreendimento'}
                    >
                      {dev.status === 'ativo' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(dev.id)}
                      className="p-1.5 rounded-xl text-rose-600 bg-rose-100/40 hover:bg-rose-200/50 border border-rose-200/50 transition-all backdrop-blur-xs shadow-2xs"
                      title="Excluir Empreendimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* QUADROS DE FAIXAS DE PRAZO E TAXA DE JUROS EDITÁVEIS (AMPLIADOS & DINÂMICOS COM RBAC) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* FAIXA 1 */}
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex flex-col gap-2 backdrop-blur-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-blue-600" />
                        Faixa 1 de Juros
                      </span>
                      <div className="flex items-center gap-1">
                        {!canEditTaxa && (
                          <span
                            className="text-[9px] bg-amber-100/60 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200/50 flex items-center gap-1"
                            title="Apenas Administradores e Gerentes podem alterar prazos e taxas"
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            Bloqueado
                          </span>
                        )}
                        <span className="text-[10px] bg-blue-100/60 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/50">
                          Até {dev.faixa1?.ateMeses ?? 36} meses
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">
                          Prazo (Meses)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="360"
                          readOnly={!canEditTaxa}
                          disabled={!canEditTaxa}
                          value={dev.faixa1?.ateMeses ?? 36}
                          onChange={(e) =>
                            handleUpdateInlineFaixas(
                              dev.id,
                              'faixa1',
                              'ateMeses',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          title={!canEditTaxa ? "Apenas Administradores e Gerentes podem alterar a taxa de juros e prazos." : ""}
                          className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold outline-none transition-all ${
                            canEditTaxa
                              ? 'bg-white border border-blue-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900'
                              : 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">
                          Taxa (% a.m.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          readOnly={!canEditTaxa}
                          disabled={!canEditTaxa}
                          value={dev.faixa1?.taxaJurosPct ?? 1.5}
                          onChange={(e) =>
                            handleUpdateInlineFaixas(
                              dev.id,
                              'faixa1',
                              'taxaJurosPct',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          title={!canEditTaxa ? "Apenas Administradores e Gerentes podem alterar a taxa de juros e prazos." : ""}
                          className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold outline-none transition-all ${
                            canEditTaxa
                              ? 'bg-white border border-blue-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-blue-700'
                              : 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* FAIXA 2 */}
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col gap-2 backdrop-blur-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-indigo-600" />
                        Faixa 2 de Juros
                      </span>
                      <div className="flex items-center gap-1">
                        {!canEditTaxa && (
                          <span
                            className="text-[9px] bg-amber-100/60 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200/50 flex items-center gap-1"
                            title="Apenas Administradores e Gerentes podem alterar prazos e taxas"
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            Bloqueado
                          </span>
                        )}
                        <span className="text-[10px] bg-indigo-100/60 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/50">
                          Até {dev.faixa2?.ateMeses ?? 60} meses
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">
                          Prazo (Meses)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="360"
                          readOnly={!canEditTaxa}
                          disabled={!canEditTaxa}
                          value={dev.faixa2?.ateMeses ?? 60}
                          onChange={(e) =>
                            handleUpdateInlineFaixas(
                              dev.id,
                              'faixa2',
                              'ateMeses',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          title={!canEditTaxa ? "Apenas Administradores e Gerentes podem alterar a taxa de juros e prazos." : ""}
                          className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold outline-none transition-all ${
                            canEditTaxa
                              ? 'bg-white border border-indigo-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-900'
                              : 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">
                          Taxa (% a.m.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          readOnly={!canEditTaxa}
                          disabled={!canEditTaxa}
                          value={dev.faixa2?.taxaJurosPct ?? 2.2}
                          onChange={(e) =>
                            handleUpdateInlineFaixas(
                              dev.id,
                              'faixa2',
                              'taxaJurosPct',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          title={!canEditTaxa ? "Apenas Administradores e Gerentes podem alterar a taxa de juros e prazos." : ""}
                          className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold outline-none transition-all ${
                            canEditTaxa
                              ? 'bg-white border border-indigo-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-indigo-700'
                              : 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
