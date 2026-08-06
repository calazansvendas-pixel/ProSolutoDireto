import { CalculationResult, PriceMonthRow, ScenarioResult, SimulationInput } from '../types';

/**
 * Helper function to enforce strict 2-decimal financial rounding
 */
export function round2(num: number): number {
  if (isNaN(num) || num === null || num === undefined) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates Taxa Direto Amount based on Pro-Soluto and Aliquot %
 * Formula: [Pró-Soluto / (1 - (Alíquota / 100))] - Pró-Soluto
 */
export function calculateTaxaDiretoAmount(proSoluto: number, aliquotaPct: number): number {
  if (proSoluto <= 0 || aliquotaPct < 0 || aliquotaPct >= 100) return 0;
  const aliquotaDecimal = aliquotaPct / 100;
  const totalComTaxa = proSoluto / (1 - aliquotaDecimal);
  return round2(totalComTaxa - proSoluto);
}

/**
 * Calculates Price Table PMT (Monthly Payment)
 * PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
 */
export function calculatePMT(pv: number, iPct: number, n: number): number {
  if (pv <= 0 || n <= 0) return 0;
  const i = iPct / 100;
  if (i === 0) return round2(pv / n);
  
  const factor = Math.pow(1 + i, n);
  const rawPmt = (pv * (i * factor)) / (factor - 1);
  return round2(rawPmt);
}

/**
 * Helper to generate monthly labels e.g., "Outubr 2024", "Nov 2024"
 */
export function getMonthYearLabel(startDateStr: string, monthIndex: number): string {
  if (!startDateStr) return `Mês ${monthIndex}`;
  const [yearStr, monthStr] = startDateStr.split('-');
  const startYear = parseInt(yearStr, 10) || new Date().getFullYear();
  const startMonth = parseInt(monthStr, 10) ? parseInt(monthStr, 10) - 1 : 0; // 0-indexed

  const date = new Date(startYear, startMonth + monthIndex - 1, 1);
  const monthName = date.toLocaleString('pt-BR', { month: 'short' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  return `${capitalizedMonth}/${date.getFullYear()}`;
}

/**
 * Executes full financial simulation for Price table with extra amortization
 */
export function runFinancialSimulation(input: SimulationInput): CalculationResult {
  const {
    proSolutoValor,
    taxaDiretoValor = 0,
    prazoMeses,
    taxaJurosMensalPct,
    dataInicio,
    mesAmortizacaoIndex,
    valorAmortizacaoExtra,
  } = input;

  const taxaValor = round2(taxaDiretoValor || 0);
  const saldoDevedorTotal = round2(proSolutoValor + taxaValor);

  if (!saldoDevedorTotal || saldoDevedorTotal <= 0 || !prazoMeses || prazoMeses <= 0) {
    return {
      pmtOriginal: 0,
      saldoDevedorTotal: 0,
      saldoDevedorAntesAporte: 0,
      saldoDevedorAposAporte: 0,
      saldoDevedorNaAmortizacao: 0,
      totalPagoOriginal: 0,
      totalJurosOriginal: 0,
      cronogramaOriginal: [],
      cenarioA: {
        nome: 'Cenário A: Manter Prazo',
        tipo: 'manter_prazo',
        novaParcela: 0,
        novoPrazoMeses: 0,
        prazoRemanescenteMeses: 0,
        mesesEconomizados: 0,
        totalPago: 0,
        totalJurosPago: 0,
        economiaJurosReais: 0,
        economiaJurosPercentual: 0,
        cronograma: [],
      },
      cenarioB: {
        nome: 'Cenário B: Manter Parcela',
        tipo: 'manter_parcela',
        novaParcela: 0,
        novoPrazoMeses: 0,
        prazoRemanescenteMeses: 0,
        mesesEconomizados: 0,
        totalPago: 0,
        totalJurosPago: 0,
        economiaJurosReais: 0,
        economiaJurosPercentual: 0,
        cronograma: [],
      },
      maiorEconomiaReais: 0,
      melhorCenario: 'A',
    };
  }

  const i = taxaJurosMensalPct / 100;

  // 1. Original Price Schedule
  const pmtOriginal = calculatePMT(saldoDevedorTotal, taxaJurosMensalPct, prazoMeses);
  const cronogramaOriginal: PriceMonthRow[] = [];
  
  let saldoOriginal = round2(saldoDevedorTotal);
  let totalJurosOriginal = 0;

  for (let m = 1; m <= prazoMeses; m++) {
    const juros = round2(saldoOriginal * i);
    const amort = round2(Math.min(round2(pmtOriginal - juros), saldoOriginal));
    const novoSaldo = round2(Math.max(0, saldoOriginal - amort));
    totalJurosOriginal = round2(totalJurosOriginal + juros);

    cronogramaOriginal.push({
      mes: m,
      dataRotulo: getMonthYearLabel(dataInicio, m),
      prestacao: pmtOriginal,
      juros,
      amortizacao: amort,
      saldoDevedor: novoSaldo,
    });

    saldoOriginal = novoSaldo;
  }
  const totalPagoOriginal = round2(saldoDevedorTotal + totalJurosOriginal);

  // 2. Evolution until amortization month
  const actualAmortMonth = Math.min(Math.max(1, mesAmortizacaoIndex), prazoMeses);
  let saldoNaAmortizacao = round2(saldoDevedorTotal);
  let jurosAcumuladosAteAmort = 0;
  const cronogramaPreAmort: PriceMonthRow[] = [];

  for (let m = 1; m <= actualAmortMonth; m++) {
    const juros = round2(saldoNaAmortizacao * i);
    const amort = round2(Math.min(round2(pmtOriginal - juros), saldoNaAmortizacao));
    let novoSaldo = round2(Math.max(0, saldoNaAmortizacao - amort));
    jurosAcumuladosAteAmort = round2(jurosAcumuladosAteAmort + juros);

    const isAmortMonth = m === actualAmortMonth;
    let aporteAplicado = 0;

    if (isAmortMonth && valorAmortizacaoExtra > 0) {
      aporteAplicado = round2(Math.min(valorAmortizacaoExtra, novoSaldo));
      novoSaldo = round2(Math.max(0, novoSaldo - aporteAplicado));
    }

    cronogramaPreAmort.push({
      mes: m,
      dataRotulo: getMonthYearLabel(dataInicio, m),
      prestacao: pmtOriginal,
      juros,
      amortizacao: amort,
      saldoDevedor: novoSaldo,
      isAmortizacaoMes: isAmortMonth,
      aporteExtra: aporteAplicado,
    });

    saldoNaAmortizacao = novoSaldo;
  }

  const saldoDevedorNaData = cronogramaPreAmort[actualAmortMonth - 1]?.saldoDevedor || 0;
  const mesesRestantesOriginais = prazoMeses - actualAmortMonth;

  // 3. Scenario A: Maintain Duration (Recalculate PMT)
  const cronogramaA: PriceMonthRow[] = [...cronogramaPreAmort];
  let novaPMTA = 0;
  let totalJurosA = jurosAcumuladosAteAmort;

  if (mesesRestantesOriginais > 0 && saldoDevedorNaData > 0) {
    novaPMTA = calculatePMT(saldoDevedorNaData, taxaJurosMensalPct, mesesRestantesOriginais);
    let saldoA = saldoDevedorNaData;

    for (let m = actualAmortMonth + 1; m <= prazoMeses; m++) {
      const juros = round2(saldoA * i);
      const amort = round2(Math.min(round2(novaPMTA - juros), saldoA));
      const novoSaldo = round2(Math.max(0, saldoA - amort));
      totalJurosA = round2(totalJurosA + juros);

      cronogramaA.push({
        mes: m,
        dataRotulo: getMonthYearLabel(dataInicio, m),
        prestacao: novaPMTA,
        juros,
        amortizacao: amort,
        saldoDevedor: novoSaldo,
      });

      saldoA = novoSaldo;
    }
  }

  const totalPagoA = round2(saldoDevedorTotal + valorAmortizacaoExtra + totalJurosA);
  const economiaJurosReaisA = round2(Math.max(0, totalJurosOriginal - totalJurosA));
  const economiaJurosPctA = totalJurosOriginal > 0 ? round2((economiaJurosReaisA / totalJurosOriginal) * 100) : 0;

  const cenarioA: ScenarioResult = {
    nome: 'Cenário A: Manter Prazo',
    tipo: 'manter_prazo',
    novaParcela: novaPMTA || pmtOriginal,
    novoPrazoMeses: prazoMeses,
    prazoRemanescenteMeses: Math.max(0, prazoMeses - actualAmortMonth),
    mesesEconomizados: 0,
    totalPago: totalPagoA,
    totalJurosPago: totalJurosA,
    economiaJurosReais: economiaJurosReaisA,
    economiaJurosPercentual: economiaJurosPctA,
    cronograma: cronogramaA,
  };

  // 4. Scenario B: Maintain Payment Amount (Recalculate Term)
  const cronogramaB: PriceMonthRow[] = [...cronogramaPreAmort];
  let totalJurosB = jurosAcumuladosAteAmort;
  let novoPrazoB = actualAmortMonth;

  if (saldoDevedorNaData > 0 && pmtOriginal > round2(saldoDevedorNaData * i)) {
    let saldoB = saldoDevedorNaData;
    let mesIdx = actualAmortMonth + 1;

    // Safety guard max 600 months
    while (saldoB > 0.01 && mesIdx <= 600) {
      const juros = round2(saldoB * i);
      let amort = round2(pmtOriginal - juros);
      let pmtMes = pmtOriginal;

      if (amort >= saldoB) {
        amort = round2(saldoB);
        pmtMes = round2(amort + juros);
        saldoB = 0;
      } else {
        saldoB = round2(saldoB - amort);
      }

      totalJurosB = round2(totalJurosB + juros);

      cronogramaB.push({
        mes: mesIdx,
        dataRotulo: getMonthYearLabel(dataInicio, mesIdx),
        prestacao: pmtMes,
        juros,
        amortizacao: amort,
        saldoDevedor: saldoB,
      });

      novoPrazoB = mesIdx;
      mesIdx++;
    }
  }

  const mesesEconomizadosB = Math.max(0, prazoMeses - novoPrazoB);
  const totalPagoB = round2(saldoDevedorTotal + valorAmortizacaoExtra + totalJurosB);
  const economiaJurosReaisB = round2(Math.max(0, totalJurosOriginal - totalJurosB));
  const economiaJurosPctB = totalJurosOriginal > 0 ? round2((economiaJurosReaisB / totalJurosOriginal) * 100) : 0;
  const prazoRemanescenteB = Math.max(0, novoPrazoB - actualAmortMonth);

  const cenarioB: ScenarioResult = {
    nome: 'Cenário B: Manter Parcela',
    tipo: 'manter_parcela',
    novaParcela: pmtOriginal,
    novoPrazoMeses: novoPrazoB,
    prazoRemanescenteMeses: prazoRemanescenteB,
    mesesEconomizados: mesesEconomizadosB,
    totalPago: totalPagoB,
    totalJurosPago: totalJurosB,
    economiaJurosReais: economiaJurosReaisB,
    economiaJurosPercentual: economiaJurosPctB,
    cronograma: cronogramaB,
  };

  const melhorCenario = economiaJurosReaisB >= economiaJurosReaisA ? 'B' : 'A';
  const maiorEconomiaReais = round2(Math.max(economiaJurosReaisA, economiaJurosReaisB));

  const saldoDevedorAntesAporte = cronogramaOriginal[actualAmortMonth - 1]?.saldoDevedor || 0;
  const saldoDevedorAposAporte = cronogramaPreAmort[actualAmortMonth - 1]?.saldoDevedor || 0;

  return {
    pmtOriginal,
    saldoDevedorTotal,
    saldoDevedorAntesAporte,
    saldoDevedorAposAporte,
    saldoDevedorNaAmortizacao: saldoDevedorAposAporte,
    totalPagoOriginal,
    totalJurosOriginal,
    cronogramaOriginal,
    cenarioA,
    cenarioB,
    melhorCenario,
    maiorEconomiaReais,
  };
}

/**
 * Digit-by-digit currency input mask for BRL (cents driven, e.g. typing 5-7-3-8-7-6-5 -> 57387.65)
 * Also handles capping at a specified maximum value (e.g. 1.000.000,00).
 */
export function parseBRLDigitMask(
  inputVal: string,
  maxVal: number = 1000000
): { value: number; isCapped: boolean; isExceeded: boolean } {
  if (!inputVal) return { value: 0, isCapped: false, isExceeded: false };

  const digitsOnly = inputVal.replace(/\D/g, '');
  if (!digitsOnly) return { value: 0, isCapped: false, isExceeded: false };

  const rawNumeric = round2(parseInt(digitsOnly, 10) / 100);

  if (rawNumeric > maxVal) {
    return { value: maxVal, isCapped: true, isExceeded: true };
  }

  if (rawNumeric < 0) {
    return { value: 0, isCapped: true, isExceeded: false };
  }

  return { value: rawNumeric, isCapped: false, isExceeded: false };
}

/**
 * Format BRL Currency strictly as R$ XX.XXX,XX
 */
export function formatBRL(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  const rounded = round2(value);
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);
  const formatted = absVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}R$ ${formatted}`;
}

/**
 * Format Percentage (0,20%)
 */
export function formatPercent(value: number, decimals = 2): string {
  if (isNaN(value) || value === null || value === undefined) return '0,00%';
  const rounded = round2(value);
  return `${rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Parses user numeric input strings like "R$ 150.000,00", "150.000,00" or "150000" to Float
 */
export function parseBRLInput(inputVal: string | number): number {
  if (typeof inputVal === 'number') return isNaN(inputVal) ? 0 : round2(inputVal);
  if (!inputVal) return 0;

  let clean = inputVal.toString().replace(/R\$\s?/g, '').trim();

  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (clean.match(/\./g) || []).length;
    if (dotCount > 1 || (dotCount === 1 && clean.indexOf('.') <= clean.length - 4)) {
      clean = clean.replace(/\./g, '');
    }
  }

  clean = clean.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : round2(num);
}

/**
 * CPF / CNPJ Masking helper
 */
export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0001-00
    return digits
      .substring(0, 14)
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}
