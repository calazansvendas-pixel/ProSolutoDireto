import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Percent,
  Calendar,
  Sparkles,
  TrendingDown,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  ChevronRight,
  Calculator as CalcIcon,
  Play,
  Lock,
} from 'lucide-react';
import { CalculationResult, Development, NavigationTab, SimulationInput } from '../types';
import {
  calculatePMT,
  calculateTaxaDiretoAmount,
  formatBRL,
  formatPercent,
  parseBRLDigitMask,
  parseBRLInput,
  runFinancialSimulation,
} from '../utils/financialCalculations';
import { getStoredAuditLogs, getStoredUserProfile, getTaxaForPrazo, INITIAL_DEVELOPMENTS, saveSimulation } from '../services/storageService';

interface CalculatorTabProps {
  input: SimulationInput;
  setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
  result: CalculationResult;
  hasCalculated?: boolean;
  developments?: Development[];
  userRole?: string;
  onRunSimulation: () => void;
  onNavigateToPitch: () => void;
  onLoadSimulation: (sim: SimulationInput) => void;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  input,
  setInput,
  result,
  hasCalculated = false,
  developments = [],
  userRole = 'corretor',
  onRunSimulation,
  onNavigateToPitch,
  onLoadSimulation,
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleScenario, setScheduleScenario] = useState<'A' | 'B' | 'original'>('A');
  const [proSolutoWarning, setProSolutoWarning] = useState<string | null>(null);
  const [prazoWarning, setPrazoWarning] = useState<string | null>(null);
  const [calculatedMonthlyPmt, setCalculatedMonthlyPmt] = useState<number | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const recentLogs = getStoredAuditLogs().slice(0, 3);

  const canEditTaxa = userRole === 'admin' || userRole === 'gerente';

  const availableDevelopments = developments && developments.length > 0 ? developments : INITIAL_DEVELOPMENTS;
  const activeDevelopments = availableDevelopments.filter((d) => d.status === 'ativo');

  const selectedDev = availableDevelopments.find((d) => d.nome === input.empreendimento);

  const getMaxPrazoForDev = (dev?: Development): number => {
    if (!dev) return 360;
    const f1 = dev.faixa1?.ateMeses || 0;
    const f2 = dev.faixa2?.ateMeses || 0;
    const max = Math.max(f1, f2);
    return max > 0 ? max : 360;
  };

  const currentMaxPrazo = getMaxPrazoForDev(selectedDev);

  // Reset Parcela Mensal whenever any simulation parameter changes
  useEffect(() => {
    setCalculatedMonthlyPmt(null);
  }, [
    input.empreendimento,
    input.proSolutoValor,
    input.aliquotaDiretoPct,
    input.taxaDiretoValor,
    input.prazoMeses,
    input.taxaJurosMensalPct,
  ]);

  // Auto-calculate Taxa Direto when proSoluto or aliquota changes, if not manual
  useEffect(() => {
    if (!input.isTaxaDiretoManual) {
      const autoTaxa = calculateTaxaDiretoAmount(input.proSolutoValor, input.aliquotaDiretoPct);
      setInput((prev) => ({ ...prev, taxaDiretoValor: autoTaxa }));
    }
  }, [input.proSolutoValor, input.aliquotaDiretoPct, input.isTaxaDiretoManual, setInput]);

  const handleProSolutoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { value, isExceeded } = parseBRLDigitMask(rawVal, 1000000);

    if (isExceeded) {
      setProSolutoWarning('O valor máximo permitido para a operação de Pró-Soluto é de R$ 1.000.000,00.');
    } else {
      setProSolutoWarning(null);
    }

    setInput((prev) => ({ ...prev, proSolutoValor: value }));
  };

  const handleAporteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { value } = parseBRLDigitMask(rawVal, 10000000);
    setInput((prev) => ({ ...prev, valorAmortizacaoExtra: value }));
  };

  const handleTaxaDiretoManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const numeric = parseBRLInput(rawVal);
    setInput((prev) => ({ ...prev, taxaDiretoValor: numeric }));
  };

  const handleEmpreendimentoSelect = (nome: string) => {
    const newSelectedDev = developments.find((d) => d.nome === nome);
    const devMaxPrazo = getMaxPrazoForDev(newSelectedDev);

    let newPrazo = input.prazoMeses;
    if (devMaxPrazo > 0 && newPrazo > devMaxPrazo) {
      newPrazo = devMaxPrazo;
      setPrazoWarning(`O prazo foi ajustado para o limite máximo de ${devMaxPrazo} meses do empreendimento ${nome}.`);
    } else {
      setPrazoWarning(null);
    }

    let updatedTaxa = input.taxaJurosMensalPct;
    if (newSelectedDev && !input.isJurosManual) {
      updatedTaxa = getTaxaForPrazo(newSelectedDev, newPrazo);
    }

    setInput((prev) => ({
      ...prev,
      empreendimento: nome,
      prazoMeses: newPrazo,
      taxaJurosMensalPct: updatedTaxa,
    }));
  };

  const handlePrazoMesesChange = (mesesInput: number) => {
    const devMaxPrazo = getMaxPrazoForDev(selectedDev);

    let finalMeses = mesesInput;
    if (devMaxPrazo > 0 && mesesInput > devMaxPrazo) {
      finalMeses = devMaxPrazo;
      setPrazoWarning(
        `Prazo máximo de ${devMaxPrazo} meses atingido para ${
          selectedDev ? selectedDev.nome : 'este empreendimento'
        }.`
      );
    } else {
      setPrazoWarning(null);
    }

    let updatedTaxa = input.taxaJurosMensalPct;
    if (selectedDev && !input.isJurosManual) {
      updatedTaxa = getTaxaForPrazo(selectedDev, finalMeses);
    }

    setInput((prev) => ({
      ...prev,
      prazoMeses: finalMeses,
      taxaJurosMensalPct: updatedTaxa,
    }));
  };

  const handleToggleJurosManual = () => {
    if (input.isJurosManual) {
      const defaultTaxa = selectedDev ? getTaxaForPrazo(selectedDev, input.prazoMeses) : input.taxaJurosMensalPct;
      setInput((prev) => ({
        ...prev,
        isJurosManual: false,
        taxaJurosMensalPct: defaultTaxa,
      }));
    } else {
      setInput((prev) => ({
        ...prev,
        isJurosManual: true,
      }));
    }
  };

  const handleCalculateMonthlyPmt = () => {
    const pv = (input.proSolutoValor || 0) + (input.taxaDiretoValor || 0);
    const pmt = calculatePMT(pv, input.taxaJurosMensalPct || 0, input.prazoMeses || 0);
    setCalculatedMonthlyPmt(pmt);

    // Save audit log / simulation history for initial PMT calculation
    const currentUser = getStoredUserProfile();
    saveSimulation({
      usuarioNome: currentUser?.name || 'Usuário Atual',
      usuarioRole: currentUser?.role || userRole || 'Corretor',
      empreendimento: input.empreendimento || 'Morar Imóveis',
      proSolutoValor: input.proSolutoValor || 0,
      aporteValor: 0,
      economiaEstimada: 0,
      inputSnapshot: input,
      acao: 'Simulação Executada',
    });
  };

  const displayPmt = calculatedMonthlyPmt !== null ? calculatedMonthlyPmt : 0;

  // Quick preset loader for testing
  const loadExample70k = () => {
    const example: SimulationInput = {
      empreendimento: 'ARVOREDO (SERRA / ES)',
      proSolutoValor: 70000,
      aliquotaDiretoPct: 0.2,
      taxaDiretoValor: calculateTaxaDiretoAmount(70000, 0.2),
      isTaxaDiretoManual: false,
      prazoMeses: 60,
      taxaJurosMensalPct: 1.9,
      dataInicio: '2024-01',
      dataAmortizacao: '2024-10',
      mesAmortizacaoIndex: 0,
      valorAmortizacaoExtra: 0,
    };
    onLoadSimulation(example);
    setCalculatedMonthlyPmt(null);
    setSimulationError(null);
  };

  const handleSimularAgora = () => {
    const prazoMax = input.prazoMeses || 60;
    const isMesValid = input.mesAmortizacaoIndex >= 1 && input.mesAmortizacaoIndex <= prazoMax;
    const isValorValid = input.valorAmortizacaoExtra > 0;

    if (!isMesValid || !isValorValid) {
      const errors: string[] = [];
      if (!isMesValid) {
        errors.push(`• "Mês do Aporte" deve ser preenchido (entre 1 e ${prazoMax} meses).`);
      }
      if (!isValorValid) {
        errors.push('• "Valor do Aporte Extra" deve ser preenchido (maior que R$ 0,00).');
      }
      setSimulationError(errors.join('\n'));
      return;
    }

    setSimulationError(null);
    onRunSimulation();

    // Auto-save simulation into audit logs / simulations history
    const computedResult = runFinancialSimulation(input);
    const currentUser = getStoredUserProfile();
    saveSimulation({
      usuarioNome: currentUser?.name || 'Usuário Atual',
      usuarioRole: currentUser?.role || userRole || 'Corretor',
      empreendimento: input.empreendimento || 'Morar Imóveis',
      proSolutoValor: input.proSolutoValor,
      aporteValor: input.valorAmortizacaoExtra,
      economiaEstimada: computedResult.maiorEconomiaReais,
      inputSnapshot: input,
      acao: 'Calculou Amortização',
    });
  };

  const activeCronograma =
    scheduleScenario === 'A'
      ? result.cenarioA.cronograma
      : scheduleScenario === 'B'
      ? result.cenarioB.cronograma
      : result.cronogramaOriginal;

  const exportScheduleCSV = () => {
    const headers = ['Mês', 'Data', 'Prestação (R$)', 'Juros (R$)', 'Amortização (R$)', 'Saldo Devedor (R$)'];
    const rows = activeCronograma.map((r) => [
      r.mes,
      r.dataRotulo,
      r.prestacao.toFixed(2),
      r.juros.toFixed(2),
      r.amortizacao.toFixed(2),
      r.saldoDevedor.toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cronograma_price_${scheduleScenario}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
      {/* LEFT FORM COLUMN */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Dados da Operação Pró-Soluto
          </h2>
          <button
            onClick={loadExample70k}
            className="px-2.5 py-1 bg-emerald-100/40 hover:bg-emerald-200/50 text-emerald-700 border border-emerald-200/50 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all backdrop-blur-xs shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Carregar Exemplo (R$ 70k)
          </button>
        </div>

        {/* SECTION 1: EMPREENDIMENTO / PROJETO (FULL WIDTH) */}
        <div className="space-y-2">
          <label className="block text-[10px] text-slate-600 uppercase font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            Empreendimento / Projeto
          </label>
          <select
            value={input.empreendimento}
            onChange={(e) => handleEmpreendimentoSelect(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-medium"
          >
            <option value="">Selecione o Empreendimento...</option>
            {activeDevelopments.length > 0 ? (
              activeDevelopments.map((dev) => (
                <option key={dev.id} value={dev.nome}>
                  {dev.nome} ({dev.cidade})
                </option>
              ))
            ) : (
              <>
                <option value="Residencial Morar">Residencial Morar</option>
                <option value="Morar Prime Residence">Morar Prime Residence</option>
                <option value="Loteamento Alpha Morar">Loteamento Alpha Morar</option>
              </>
            )}
          </select>
        </div>

        {/* SUBSEÇÃO: CONDIÇÕES DO PRÓ-SOLUTO */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            Condições do Pró-Soluto
          </p>

          {/* VALOR DO PRÓ-SOLUTO (FULL WIDTH) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-slate-600 uppercase font-bold">
                Valor do Pró-Soluto (R$)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Permitido: R$ 0,00 a R$ 1.000.000,00</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={input.proSolutoValor > 0 ? formatBRL(input.proSolutoValor) : ''}
                onChange={handleProSolutoChange}
                placeholder="R$ 0,00"
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm font-mono font-bold outline-none transition-all ${
                  proSolutoWarning
                    ? 'border-amber-500 text-amber-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    : 'border-blue-500/60 text-blue-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
            </div>
            {proSolutoWarning && (
              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{proSolutoWarning}</span>
              </div>
            )}
          </div>

          {/* LINHA COM 2 COLUNAS: ALÍQUOTA DIRETO (%) E TAXA DIRETO (R$) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 min-h-[24px] mb-1">
                <label className="block text-[10px] text-slate-600 uppercase font-bold">
                  Alíquota Direto (%)
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0,00"
                  value={input.aliquotaDiretoPct || ''}
                  onChange={(e) =>
                    setInput({ ...input, aliquotaDiretoPct: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-blue-600 outline-none transition-all font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 min-h-[24px] mb-1">
                <label className="block text-[10px] text-slate-600 uppercase font-bold">
                  Taxa Direto (R$)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setInput((prev) => ({ ...prev, isTaxaDiretoManual: !prev.isTaxaDiretoManual }))
                  }
                  className="whitespace-nowrap shrink-0 text-[9px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                >
                  {input.isTaxaDiretoManual ? 'Auto' : 'Editar Manual'}
                </button>
              </div>
              <input
                type="text"
                readOnly={!input.isTaxaDiretoManual}
                value={input.taxaDiretoValor > 0 ? formatBRL(input.taxaDiretoValor) : ''}
                onChange={handleTaxaDiretoManualChange}
                placeholder="R$ 0,00"
                className={`w-full rounded-lg px-3 py-2 text-sm font-mono ${
                  input.isTaxaDiretoManual
                    ? 'bg-blue-50 border border-blue-300 text-blue-950 font-bold'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
          </div>

          {/* BASE CALCULADA DA DÍVIDA PRÓ-SOLUTO */}
          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CalcIcon className="w-3.5 h-3.5 text-blue-600" />
                Saldo Devedor Base (Pró-Soluto + Taxa)
              </span>
              <span className="font-mono font-bold text-blue-900 text-sm">
                {formatBRL((input.proSolutoValor || 0) + (input.taxaDiretoValor || 0))}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Base PV considerada para o cálculo das parcelas (PMT) na Tabela Price.
            </p>
          </div>
        </div>

        {/* SEÇÃO 2: PRAZO E JUROS (2 COLUNAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <div>
            <div className="flex items-center justify-between gap-2 min-h-[24px] mb-1">
              <label className="block text-[10px] text-slate-600 uppercase font-bold">
                Prazo Inicial (Meses)
              </label>
              {selectedDev && (
                <span className="whitespace-nowrap shrink-0 text-[10px] text-blue-700 bg-blue-100/50 border border-blue-200/60 px-2 py-0.5 rounded-full font-bold backdrop-blur-xs font-mono">
                  Máx: {currentMaxPrazo}m
                </span>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={currentMaxPrazo}
              placeholder="0"
              value={input.prazoMeses || ''}
              onChange={(e) => handlePrazoMesesChange(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold font-mono focus:border-blue-600 outline-none transition-all"
            />
            {prazoWarning && (
              <p className="text-[10px] text-amber-700 bg-amber-100/40 border border-amber-200/50 px-2.5 py-1 rounded-lg font-bold mt-1.5 flex items-center gap-1.5 backdrop-blur-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{prazoWarning}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 min-h-[24px] mb-1">
              <label className="block text-[10px] text-slate-600 uppercase font-bold">
                Juros Mensais (% a.m.)
              </label>
              {canEditTaxa ? (
                <button
                  type="button"
                  onClick={handleToggleJurosManual}
                  className="whitespace-nowrap shrink-0 text-[9px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                >
                  {input.isJurosManual ? 'Restaurar Padrão' : 'Editar Manual'}
                </button>
              ) : (
                <span
                  className="whitespace-nowrap shrink-0 flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100/50 border border-amber-200/60 px-2 py-0.5 rounded-full font-bold backdrop-blur-xs"
                  title="Apenas Administradores e Gerentes podem alterar a taxa de juros"
                >
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Bloqueado</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                readOnly={!canEditTaxa || !input.isJurosManual}
                disabled={!canEditTaxa || !input.isJurosManual}
                placeholder="0,00"
                value={input.taxaJurosMensalPct || ''}
                onChange={(e) =>
                  setInput({ ...input, taxaJurosMensalPct: parseFloat(e.target.value) || 0 })
                }
                title={
                  !canEditTaxa
                    ? 'Apenas Administradores e Gerentes podem alterar a taxa de juros'
                    : !input.isJurosManual
                    ? 'Clique em Editar Manual para alterar a taxa de juros'
                    : ''
                }
                className={`w-full rounded-lg px-3 py-2 text-sm font-mono transition-all ${
                  canEditTaxa && input.isJurosManual
                    ? 'bg-blue-50 border border-blue-300 text-blue-950 font-bold focus:border-blue-600'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed pr-8'
                }`}
              />
              {!canEditTaxa && (
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              )}
              {canEditTaxa && (
                <span className={`absolute right-3 top-2.5 text-xs font-mono pointer-events-none ${input.isJurosManual ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                  %
                </span>
              )}
            </div>
            {!canEditTaxa && (
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0 text-amber-600" />
                <span>Apenas Administradores e Gerentes podem alterar.</span>
              </p>
            )}
          </div>
        </div>

        {/* ETAPA 1: CÁLCULO DA PARCELA MENSAL (2 COLUNAS) */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
            <CalcIcon className="w-3.5 h-3.5 text-blue-600" />
            Etapa 1: Parcela Mensal Inicial
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <button
                type="button"
                onClick={handleCalculateMonthlyPmt}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <CalcIcon className="w-4 h-4 text-white" />
                <span>Calcular Parcela</span>
              </button>
            </div>
            <div className="bg-white border border-blue-300 rounded-lg p-2.5 flex flex-col justify-center shadow-2xs">
              <span className="block text-[9px] font-bold uppercase text-slate-500">
                Valor da Parcela Mensal
              </span>
              <span className="block text-base font-mono font-bold text-blue-950">
                {displayPmt > 0 ? formatBRL(displayPmt) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* ETAPA 2: AMORTIZAÇÃO EXTRAORDINÁRIA (BLOCO VERDE DESTACADO) */}
        <div className={`p-4 bg-emerald-50/90 border rounded-xl space-y-3 transition-all ${
          simulationError ? 'border-amber-400 ring-2 ring-amber-200' : 'border-emerald-200/90'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              Etapa 2: Amortização Extraordinária
            </h3>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
              Abatimento de Saldo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-700 uppercase mb-1 font-semibold">
                Mês do Aporte {input.prazoMeses > 0 ? `(1 a ${input.prazoMeses})` : ''}
              </label>
              <input
                type="number"
                min="1"
                max={input.prazoMeses || 360}
                placeholder="Ex: 10"
                value={input.mesAmortizacaoIndex || ''}
                onChange={(e) => {
                  setSimulationError(null);
                  setInput({
                    ...input,
                    mesAmortizacaoIndex: Math.max(0, parseInt(e.target.value, 10) || 0),
                  });
                }}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-slate-900 outline-none font-mono font-bold transition-all ${
                  simulationError && (!input.mesAmortizacaoIndex || input.mesAmortizacaoIndex < 1 || input.mesAmortizacaoIndex > (input.prazoMeses || 60))
                    ? 'border-red-500 ring-1 ring-red-300'
                    : 'border-slate-300 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-700 uppercase mb-1 font-semibold">
                Valor do Aporte Extra (R$)
              </label>
              <input
                type="text"
                value={input.valorAmortizacaoExtra > 0 ? formatBRL(input.valorAmortizacaoExtra) : ''}
                onChange={(e) => {
                  setSimulationError(null);
                  handleAporteChange(e);
                }}
                placeholder="R$ 0,00"
                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono outline-none font-bold transition-all ${
                  simulationError && input.valorAmortizacaoExtra <= 0
                    ? 'border-red-500 ring-1 ring-red-300 text-red-900'
                    : 'border-emerald-400 text-emerald-800 focus:border-emerald-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* ALERTA / AVISO DE VALIDAÇÃO DE AMORTIZAÇÃO EXTRAORDINÁRIA */}
        {simulationError && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium space-y-1 animate-fade-in flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">Preenchimento Obrigatório para Simular:</p>
              <p className="text-[11px] text-amber-800 whitespace-pre-line leading-relaxed font-mono">{simulationError}</p>
            </div>
          </div>
        )}

        {/* BOTÃO FINAL DE AÇÃO: SIMULAR AGORA */}
        <button
          onClick={handleSimularAgora}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current text-white" />
          <span>Simular Agora</span>
        </button>
      </div>

      {/* RIGHT RESULTS COLUMN */}
      <div className="lg:col-span-7 flex flex-col space-y-6">
        {hasCalculated && result.pmtOriginal > 0 ? (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* CARD 1: DÍVIDA BASE INICIAL */}
              <div className="bg-blue-50/90 border border-blue-200/80 p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider mb-1">
                  Dívida Pró-Soluto Base
                </p>
                <p className="text-lg font-mono font-bold text-blue-950">
                  {formatBRL(result.saldoDevedorTotal)}
                </p>
                <p className="text-[10px] text-blue-700 font-medium mt-1">
                  Inclui Pró-Soluto + Taxa Direto
                </p>
              </div>

              {/* CARD 2: PMT ORIGINAL */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  PMT Original (Price)
                </p>
                <p className="text-lg font-mono font-bold text-slate-900">
                  {formatBRL(result.pmtOriginal)}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">{input.prazoMeses} parcelas fixas</p>
              </div>

              {/* CARD 3: SALDO DEVEDOR (ANTES DO APORTE) */}
              <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider mb-1">
                  Saldo Devedor (Antes)
                </p>
                <p className="text-lg font-mono font-bold text-amber-900">
                  {formatBRL(result.saldoDevedorAntesAporte)}
                </p>
                <p className="text-[10px] text-amber-700/80 font-medium mt-1">
                  No {input.mesAmortizacaoIndex}º mês de aporte
                </p>
              </div>

              {/* CARD 4: SALDO DEVEDOR RESTANTE (APÓS APORTE) */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1">
                  Saldo Devedor (Após)
                </p>
                <p className="text-lg font-mono font-bold text-emerald-800">
                  {formatBRL(result.saldoDevedorAposAporte)}
                </p>
                <p className="text-[10px] text-emerald-700/80 font-medium mt-1">
                  Após aporte de {formatBRL(input.valorAmortizacaoExtra)}
                </p>
              </div>

              {/* CARD 5: ECONOMIA ESTIMADA */}
              <div className="bg-emerald-100/50 border border-emerald-200 p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1">
                  Economia de Juros
                </p>
                <p className="text-lg font-mono font-bold text-emerald-700">
                  {formatBRL(result.maiorEconomiaReais)}
                </p>
                <p className="text-[10px] text-emerald-800 font-semibold mt-1">
                  Cenário {result.melhorCenario} mais vantajoso
                </p>
              </div>
            </div>

        {/* COMPARATIVO DE CENÁRIOS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              Comparativo de Cenários de Amortização
            </h3>
            <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 uppercase tracking-wider font-semibold">
              Anuidade Constante (PRICE)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SCENARIO A */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 flex flex-col justify-between relative hover:border-blue-300 transition-all">
              <div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                  <p className="text-xs font-bold text-slate-900">Cenário A: Manter Prazo</p>
                  <span className="text-[9px] bg-blue-100/40 text-blue-600 border border-blue-200/50 font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    Reduz Parcela
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nova Parcela Mensal:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {formatBRL(result.cenarioA.novaParcela)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prazo Remanescente:</span>
                    <span className="font-mono text-slate-900 font-medium">
                      {result.cenarioA.prazoRemanescenteMeses} meses
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Desconto Parcela:</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      -{formatBRL(result.pmtOriginal - result.cenarioA.novaParcela)}/mês
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                  Economia de Juros
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-mono font-bold text-emerald-600">
                    {formatBRL(result.cenarioA.economiaJurosReais)}
                  </span>
                  <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-100/40 border border-emerald-200/50 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                    -{formatPercent(result.cenarioA.economiaJurosPercentual)}
                  </span>
                </div>
              </div>
            </div>

            {/* SCENARIO B */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 flex flex-col justify-between relative hover:border-emerald-300 transition-all">
              <div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                  <p className="text-xs font-bold text-slate-900">Cenário B: Manter Parcela</p>
                  <span className="text-[9px] bg-emerald-100/40 text-emerald-600 border border-emerald-200/50 font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    Reduz Prazo
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parcela Mantida:</span>
                    <span className="font-mono text-slate-900 font-medium">{formatBRL(result.pmtOriginal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prazo Remanescente:</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {result.cenarioB.prazoRemanescenteMeses} meses
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Meses Eliminados:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      -{result.cenarioB.mesesEconomizados} parcelas
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                  Economia de Juros
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-mono font-bold text-emerald-600">
                    {formatBRL(result.cenarioB.economiaJurosReais)}
                  </span>
                  <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-100/40 border border-emerald-200/50 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                    -{formatPercent(result.cenarioB.economiaJurosPercentual)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: WHATSAPP PITCH & SCHEDULE VIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={onNavigateToPitch}
              className="py-3 px-4 bg-emerald-100/40 hover:bg-emerald-200/50 text-emerald-600 border border-emerald-200/50 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all backdrop-blur-xs"
            >
              <MessageSquare className="w-4 h-4 fill-current text-emerald-600" />
              <span>Gerar Mensagem para WhatsApp</span>
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              className="py-3 px-4 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-xs backdrop-blur-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Ver Tabela Completa de Evolução</span>
            </button>
          </div>
        </div>

        {/* AUDITORIA RECENTE WIDGET */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Auditoria Recente de Simulações
            </span>
            <span className="text-[10px] text-blue-600 hover:underline cursor-pointer font-medium">
              Ver Histórico Completo
            </span>
          </div>

          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => log.inputSnapshot && onLoadSimulation(log.inputSnapshot)}
                className="flex items-center justify-between text-xs border-b border-slate-100 pb-2 pt-1 hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="font-medium text-slate-800">
                    {log.empreendimento} <span className="text-slate-500">({log.usuarioNome})</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-600 text-[11px] font-semibold">
                    +{formatBRL(log.economiaEstimada)} economizados
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 min-h-[420px] shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <CalcIcon className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Aguardando Preenchimento dos Dados
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Os quadros de resultado, comparativos de cenários e tabelas de amortização serão calculados e exibidos assim que você preencher os parâmetros da operação (Pró-Soluto, Prazo, Juros e Aporte Extra) no formulário.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={loadExample70k}
                className="px-5 py-2.5 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all backdrop-blur-xs"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Carregar Exemplo de Simulação (R$ 70k)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Cronograma de Evolução - Tabela PRICE
                </h3>
                <p className="text-xs text-slate-500">
                  {input.clienteNome ? `Cliente: ${input.clienteNome} | ` : ''}
                  Pró-Soluto: {formatBRL(input.proSolutoValor)} | Taxa: {input.taxaJurosMensalPct}% a.m.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportScheduleCSV}
                  className="px-3.5 py-1.5 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs backdrop-blur-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scenario Selector Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 px-5 pt-3 gap-2">
              <button
                onClick={() => setScheduleScenario('A')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                  scheduleScenario === 'A'
                    ? 'bg-blue-100/40 text-blue-600 border-t border-x border-blue-200/50 shadow-xs backdrop-blur-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cenário A (Manter Prazo)
              </button>
              <button
                onClick={() => setScheduleScenario('B')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                  scheduleScenario === 'B'
                    ? 'bg-emerald-100/40 text-emerald-600 border-t border-x border-emerald-200/50 shadow-xs backdrop-blur-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cenário B (Manter Parcela)
              </button>
              <button
                onClick={() => setScheduleScenario('original')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                  scheduleScenario === 'original'
                    ? 'bg-white text-slate-800 border-t border-x border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Original (Sem Aporte)
              </button>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mês</th>
                    <th className="py-2.5 px-3">Período</th>
                    <th className="py-2.5 px-3 text-right">Prestação (R$)</th>
                    <th className="py-2.5 px-3 text-right">Juros (R$)</th>
                    <th className="py-2.5 px-3 text-right">Amortização (R$)</th>
                    <th className="py-2.5 px-3 text-right">Saldo Devedor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {activeCronograma.map((row) => (
                    <tr
                      key={row.mes}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        row.isAmortizacaoMes ? 'bg-emerald-50 text-emerald-900 font-bold border-y border-emerald-200' : 'bg-white odd:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-700">{row.mes}º</td>
                      <td className="py-2 px-3 text-slate-500">{row.dataRotulo}</td>
                      <td className="py-2 px-3 text-right text-slate-900">
                        {formatBRL(row.prestacao)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-700">
                        {formatBRL(row.juros)}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-700">
                        {formatBRL(row.amortizacao)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                        {formatBRL(row.saldoDevedor)}
                        {row.isAmortizacaoMes && row.aporteExtra && row.aporteExtra > 0 && (
                          <span className="block text-[9px] text-emerald-600 font-semibold">
                            (Após aporte Extra: -{formatBRL(row.aporteExtra)})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
