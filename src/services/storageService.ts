import { AuditLogItem, CalculationResult, Development, PitchTemplate, SimulationInput, UserProfile } from '../types';
import { formatBRL, formatPercent } from '../utils/financialCalculations';

const STORAGE_KEYS = {
  AUDIT_LOGS: 'prosoluto_audit_logs',
  LAST_SIMULATION: 'prosoluto_last_sim',
  USER_PROFILE: 'prosoluto_user_profile',
  THEME_MODE: 'prosoluto_theme_mode',
  DEVELOPMENTS: 'prosoluto_developments',
};

export const INITIAL_DEVELOPMENTS: Development[] = [
  {
    id: 'dev-1',
    nome: 'Residencial Morar',
    cidade: 'Vitória - ES',
    status: 'ativo',
    createdAt: new Date().toISOString(),
    faixa1: { ateMeses: 36, taxaJurosPct: 1.5 },
    faixa2: { ateMeses: 60, taxaJurosPct: 2.2 },
  },
  {
    id: 'dev-2',
    nome: 'Morar Prime Residence',
    cidade: 'Vila Velha - ES',
    status: 'ativo',
    createdAt: new Date().toISOString(),
    faixa1: { ateMeses: 36, taxaJurosPct: 1.4 },
    faixa2: { ateMeses: 60, taxaJurosPct: 1.9 },
  },
  {
    id: 'dev-3',
    nome: 'Loteamento Alpha Morar',
    cidade: 'Serra - ES',
    status: 'ativo',
    createdAt: new Date().toISOString(),
    faixa1: { ateMeses: 36, taxaJurosPct: 1.6 },
    faixa2: { ateMeses: 60, taxaJurosPct: 2.4 },
  },
  {
    id: 'dev-4',
    nome: 'Eco Viana Residence',
    cidade: 'Viana - ES',
    status: 'pausado',
    createdAt: new Date().toISOString(),
    faixa1: { ateMeses: 36, taxaJurosPct: 1.5 },
    faixa2: { ateMeses: 60, taxaJurosPct: 2.0 },
  },
];

export function getStoredDevelopments(): Development[] {
  try {
    const data = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DEVELOPMENTS) : null;
    if (data && data.trim() !== '' && data !== '[]' && data !== 'null') {
      const parsed: Development[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((dev) => ({
          ...dev,
          faixa1: dev.faixa1 || { ateMeses: 36, taxaJurosPct: 1.5 },
          faixa2: dev.faixa2 || { ateMeses: 60, taxaJurosPct: 2.2 },
        }));
      }
    }
  } catch (e) {
    console.error('Failed to read developments from localStorage:', e);
  }

  // Seed default developments if empty or missing
  saveDevelopments(INITIAL_DEVELOPMENTS);
  return INITIAL_DEVELOPMENTS;
}

export function getTaxaForPrazo(dev: Development, prazoMeses: number): number {
  const f1 = dev.faixa1 || { ateMeses: 36, taxaJurosPct: 1.5 };
  const f2 = dev.faixa2 || { ateMeses: 60, taxaJurosPct: 2.2 };

  if (!prazoMeses || prazoMeses <= 0) return f1.taxaJurosPct;

  if (prazoMeses <= f1.ateMeses) {
    return f1.taxaJurosPct;
  }
  return f2.taxaJurosPct;
}

export function saveDevelopments(list: Development[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEVELOPMENTS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save developments', e);
  }
}

export const DEFAULT_USER: UserProfile = {
  id: 'usr_001',
  name: 'João da Silva',
  email: 'joao.silva@morar.com.br',
  role: 'gerente',
  status: 'Ativo',
  empreendimentoPadrao: 'Residencial Morar',
};export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-101',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    usuarioNome: 'João da Silva',
    usuarioRole: 'Gerente Banco Direto',
    acao: 'Simulação de Amortização',
    empreendimento: 'Residencial Morar',
    proSolutoValor: 150000,
    aporteValor: 35000,
    economiaEstimada: 18420.12,
  },
  {
    id: 'log-102',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 hours ago
    usuarioNome: 'Marina Lima',
    usuarioRole: 'Consultor Financeiro',
    acao: 'Gerou Pitch WhatsApp',
    empreendimento: 'Loteamento Alpha',
    proSolutoValor: 90000,
    aporteValor: 20000,
    economiaEstimada: 9850.40,
  },
  {
    id: 'log-103',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
    usuarioNome: 'Carlos Santos',
    usuarioRole: 'Corretor Morar',
    acao: 'Simulação de Amortização',
    empreendimento: 'Morar Prime Residence',
    proSolutoValor: 210000,
    aporteValor: 50000,
    economiaEstimada: 31200.00,
  },
];

export const DEFAULT_PITCH_TEMPLATES: PitchTemplate[] = [
  {
    id: 'tpl-consultivo',
    nome: 'Consultivo & Educacional',
    tom: 'consultivo',
    corpo: `Olá! Tudo bem?

Fiz uma análise detalhada da proposta no *{empreendimento}* e preparei um estudo exclusivo de *Amortização Extraordinária Pró-Soluto*.

💡 *Resumo do seu Pró-Soluto:*
• Valor da Dívida Pró-Soluto: *{pro_soluto}*
• Parcela Atual (Tabela Price): *{pmt_original}*

Ao realizar um aporte estratégico de *{aporte}* no *{mes_aporte}º mês*:

🔥 *Cenário A (Reduzir Parcela):*
• Nova parcela cai para: *{nova_pmt_cenario_a}*
• Prazo remanescente: *{prazo_remanescente_a} parcelas restantes*
• Redução imediata nos seus custos mensais!

🚀 *Cenário B (Manter Parcela & Reduzir Prazo):*
• Seu contrato é quitado *{meses_economizados} meses mais rápido*!
• Economia total de juros: *{economia_reais}* (*-{economia_pct}* de juros evitados).

Qual desses dois cenários faz mais sentido para o seu planejamento financeiro hoje?`,
  },
  {
    id: 'tpl-executivo',
    nome: 'Diretoria & Executivo',
    tom: 'executivo',
    corpo: `Prezado(a),

Segue a simulação oficial de quitação parcial Pró-Soluto referente ao *{empreendimento}*.

📊 *DEMONSTRATIVO FINANCEIRO:*
- Principal Pró-Soluto: {pro_soluto}
- Amortização Pretendida: {aporte} (no {mes_aporte}º mês)

📉 *IMPACTO NO CONTRATO:*
1. Manutenção do Prazo: Nova Parcela de {nova_pmt_cenario_a}
2. Manutenção da Parcela: Redução de {meses_economizados} parcelas no prazo total.
3. Economia Bruta de Juros: *{economia_reais}* ({economia_pct}% de juros não pagos ao banco).

Estou à disposição para formalizar o termo de amortização.`,
  },
  {
    id: 'tpl-persuasive',
    nome: 'Persuasivo & Oportunidade',
    tom: 'persuasivo',
    corpo: `🚨 *Excelente oportunidade financeira!*

Você sabia que colocando apenas *{aporte}* de aporte no *{mes_aporte}º mês* do seu Pró-Soluto no *{empreendimento}*, você economiza *{economia_reais}* puramente em juros?

É o equivalente a dar um desconto direto de *{economia_pct}%* na sua dívida!

Além disso:
- Ou você reduz sua parcela mensal para *{nova_pmt_cenario_a}*;
- Ou elimina *{meses_economizados} meses* de financiamento!

Vamos garantir essa economia hoje mesmo?`,
  },
];

export function getStoredAuditLogs(): AuditLogItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read audit logs', e);
  }
  return INITIAL_AUDIT_LOGS;
}

export function saveAuditLog(logData: Omit<AuditLogItem, 'id' | 'timestamp'>): AuditLogItem {
  const newLog: AuditLogItem = {
    ...logData,
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const logs = getStoredAuditLogs();
  const updated = [newLog, ...logs];
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save audit log', e);
  }
  return newLog;
}

export function deleteStoredAuditLog(id: string): void {
  try {
    const logs = getStoredAuditLogs();
    const updated = logs.filter((log) => log.id !== id);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete audit log', e);
  }
}

export function clearAllStoredAuditLogs(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear audit logs', e);
  }
}

export function getStoredUserProfile(): UserProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read user profile', e);
  }
  return DEFAULT_USER;
}

export function saveUserProfile(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

export function getStoredThemeMode(): 'dark' | 'light' {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    if (data === 'light' || data === 'dark') return data;
  } catch (e) {
    console.error('Failed to read theme mode', e);
  }
  return 'dark';
}

export function saveThemeMode(mode: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  } catch (e) {
    console.error('Failed to save theme mode', e);
  }
}

export function buildWhatsAppPitchMessage(
  templateText: string,
  input: SimulationInput,
  result: CalculationResult
): string {
  const proSolutoFormatted = formatBRL(input.proSolutoValor);
  const taxaDiretoFormatted = formatBRL(input.taxaDiretoValor || 0);
  const saldoDevedorTotalFormatted = formatBRL(
    result.saldoDevedorTotal || input.proSolutoValor + (input.taxaDiretoValor || 0)
  );
  const pmtOriginalFormatted = formatBRL(result.pmtOriginal);
  const aporteFormatted = formatBRL(input.valorAmortizacaoExtra);
  const novaPmtFormatted = formatBRL(result.cenarioA.novaParcela);
  const economiaReaisFormatted = formatBRL(result.maiorEconomiaReais);
  const economiaPctFormatted = formatPercent(
    result.melhorCenario === 'B'
      ? result.cenarioB.economiaJurosPercentual
      : result.cenarioA.economiaJurosPercentual
  );
  const mesesEconomizados = result.cenarioB.mesesEconomizados;
  const prazoRemanescenteA = result.cenarioA.prazoRemanescenteMeses;
  const mesAporteStr = String(input.mesAmortizacaoIndex || 1);

  return templateText
    .replace(/{empreendimento}/g, input.empreendimento || 'Empreendimento')
    .replace(/{pro_soluto}/g, proSolutoFormatted)
    .replace(/{taxa_direto}/g, taxaDiretoFormatted)
    .replace(/{saldo_devedor_total}/g, saldoDevedorTotalFormatted)
    .replace(/{pro_soluto_com_taxa}/g, saldoDevedorTotalFormatted)
    .replace(/{pmt_original}/g, pmtOriginalFormatted)
    .replace(/{aporte}/g, aporteFormatted)
    .replace(/{mes_aporte}/g, mesAporteStr)
    .replace(/{parcela_aporte}/g, mesAporteStr)
    .replace(/{nova_pmt_cenario_a}/g, novaPmtFormatted)
    .replace(/{prazo_remanescente_a}/g, String(prazoRemanescenteA))
    .replace(/{economia_reais}/g, economiaReaisFormatted)
    .replace(/{economia_pct}/g, economiaPctFormatted)
    .replace(/{meses_economizados}/g, String(mesesEconomizados));
}
