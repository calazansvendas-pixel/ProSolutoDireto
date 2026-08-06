export type NavigationTab = 'calculator' | 'pitch' | 'developments' | 'users' | 'audit' | 'auth';

export type UserRole = 'corretor' | 'gerente' | 'consultor' | 'admin';

export type UserStatus = 'Ativo' | 'Pendente' | 'Pausado';

export interface FaixaJuros {
  ateMeses: number;
  taxaJurosPct: number;
}

export interface Development {
  id: string;
  nome: string;
  cidade: string;
  status: 'ativo' | 'pausado';
  createdAt: string;
  faixa1?: FaixaJuros;
  faixa2?: FaixaJuros;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  avatarUrl?: string;
  empreendimentoPadrao?: string;
  isMainAdmin?: boolean;
}

export interface SimulationInput {
  empreendimento: string;
  proSolutoValor: number;
  aliquotaDiretoPct: number;
  taxaDiretoValor: number;
  isTaxaDiretoManual: boolean;
  prazoMeses: number; // n
  taxaJurosMensalPct: number; // i % a.m.
  isJurosManual?: boolean;
  dataInicio: string; // YYYY-MM
  dataAmortizacao: string; // YYYY-MM
  mesAmortizacaoIndex: number; // 1 to n
  valorAmortizacaoExtra: number;
}

export interface PriceMonthRow {
  mes: number;
  dataRotulo: string;
  prestacao: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
  isAmortizacaoMes?: boolean;
  aporteExtra?: number;
}

export interface ScenarioResult {
  nome: string;
  tipo: 'manter_prazo' | 'manter_parcela';
  novaParcela: number;
  novoPrazoMeses: number;
  prazoRemanescenteMeses: number;
  mesesEconomizados: number;
  totalPago: number;
  totalJurosPago: number;
  economiaJurosReais: number;
  economiaJurosPercentual: number;
  cronograma: PriceMonthRow[];
}

export interface CalculationResult {
  pmtOriginal: number;
  saldoDevedorTotal: number;
  saldoDevedorAntesAporte: number;
  saldoDevedorAposAporte: number;
  saldoDevedorNaAmortizacao: number;
  totalPagoOriginal: number;
  totalJurosOriginal: number;
  cronogramaOriginal: PriceMonthRow[];
  cenarioA: ScenarioResult; // Manter Prazo
  cenarioB: ScenarioResult; // Manter Parcela
  melhorCenario: 'A' | 'B';
  maiorEconomiaReais: number;
}

export interface PitchTemplate {
  id: string;
  nome: string;
  tom: 'consultivo' | 'executivo' | 'persuasivo' | 'urgencia';
  corpo: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  usuarioNome: string;
  usuarioRole: string;
  acao: string; // e.g., "Simulação Criada", "Pitch Exportado", "Login efetuado"
  empreendimento: string;
  proSolutoValor: number;
  aporteValor: number;
  economiaEstimada: number;
  inputSnapshot?: SimulationInput;
}
