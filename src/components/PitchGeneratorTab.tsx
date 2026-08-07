import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  ExternalLink,
  Sparkles,
  CheckCircle,
  Smartphone,
  Send,
  RefreshCw,
} from 'lucide-react';
import { CalculationResult, PitchTemplate, SimulationInput } from '../types';
import { buildWhatsAppPitchMessage, DEFAULT_PITCH_TEMPLATES, getStoredUserProfile, saveAuditLog } from '../services/storageService';

interface PitchGeneratorTabProps {
  input: SimulationInput;
  result: CalculationResult;
  onNavigateToCalc: () => void;
}

export const PitchGeneratorTab: React.FC<PitchGeneratorTabProps> = ({
  input,
  result,
  onNavigateToCalc,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-consultivo');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const found = DEFAULT_PITCH_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (found) {
      setTemplateContent(found.corpo);
    }
  }, [selectedTemplateId]);

  const compiledMessage = buildWhatsAppPitchMessage(templateContent, input, result);

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    const currentUser = getStoredUserProfile();
    // Save audit log for WhatsApp pitch export
    saveAuditLog({
      usuarioNome: currentUser?.name || 'Usuário Atual',
      usuarioRole: currentUser?.role || 'Corretor',
      acao: 'Pitch Exportado',
      empreendimento: input.empreendimento || 'Morar Imóveis',
      proSolutoValor: input.proSolutoValor || 0,
      aporteValor: input.valorAmortizacaoExtra || 0,
      economiaEstimada: result.maiorEconomiaReais || 0,
      inputSnapshot: input,
    });
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(compiledMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');

    const currentUser = getStoredUserProfile();
    saveAuditLog({
      usuarioNome: currentUser?.name || 'Usuário Atual',
      usuarioRole: currentUser?.role || 'Corretor',
      acao: 'Pitch Exportado',
      empreendimento: input.empreendimento || 'Morar Imóveis',
      proSolutoValor: input.proSolutoValor || 0,
      aporteValor: input.valorAmortizacaoExtra || 0,
      economiaEstimada: result.maiorEconomiaReais || 0,
      inputSnapshot: input,
    });
  };

  return (
    <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
      {/* LEFT TEMPLATE CONTROLS */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Gerador de Pitch de Vendas
          </h2>
          <button
            onClick={onNavigateToCalc}
            className="px-2.5 py-1 bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50 font-bold rounded-lg text-[11px] transition-all backdrop-blur-xs shadow-2xs"
          >
            Ajustar Valores
          </button>
        </div>

        {/* TONE SELECTION */}
        <div className="space-y-2">
          <label className="block text-[10px] text-slate-600 uppercase font-bold">
            Selecione o Tom da Abordagem
          </label>
          <div className="grid grid-cols-1 gap-2">
            {DEFAULT_PITCH_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between backdrop-blur-xs ${
                  selectedTemplateId === tpl.id
                    ? 'bg-emerald-100/40 text-emerald-600 border-emerald-200/60 font-bold shadow-2xs'
                    : 'bg-slate-100/40 border-slate-200/50 text-slate-700 hover:bg-emerald-100/30 hover:border-emerald-200/40'
                }`}
              >
                <div>
                  <div className="text-xs">{tpl.nome}</div>
                  <div className="text-[10px] text-slate-500 capitalize">Tom {tpl.tom}</div>
                </div>
                {selectedTemplateId === tpl.id && <CheckCircle className="w-4 h-4 text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* TEMPLATE EDITOR */}
        <div className="space-y-2 flex-1 flex flex-col">
          <label className="block text-[10px] text-slate-600 uppercase font-bold">
            Editar Modelo de Mensagem
          </label>
          <textarea
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={10}
            className="w-full flex-1 bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-mono focus:border-blue-600 outline-none resize-none shadow-xs"
          />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Variáveis suportadas:{' '}
            <code className="text-emerald-700 font-mono">&#123;empreendimento&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;pro_soluto&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;pmt_original&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;aporte&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;mes_aporte&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;nova_pmt_cenario_a&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;prazo_remanescente_a&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;economia_reais&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;economia_pct&#125;</code>,{' '}
            <code className="text-emerald-700 font-mono">&#123;meses_economizados&#125;</code>
          </p>
        </div>
      </div>

      {/* RIGHT LIVE PREVIEW */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              Pré-visualização do WhatsApp
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-100/40 text-emerald-600 border border-emerald-200/50 px-2.5 py-1 rounded-full font-mono font-bold backdrop-blur-xs">
            Pronto para Enviar
          </span>
        </div>

        {/* MOCK PHONE CONTAINER */}
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-inner relative overflow-hidden">
          {/* WhatsApp Chat Bubble Header */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {input.empreendimento ? input.empreendimento[0] : 'S'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {input.empreendimento || 'Simulação Pró-Soluto'}
              </p>
              <span className="inline-block text-[9px] bg-emerald-100/40 text-emerald-600 border border-emerald-200/50 px-2 py-0.5 rounded-full font-bold backdrop-blur-xs">
                Online
              </span>
            </div>
          </div>

          {/* Chat Bubble Body */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[380px] select-text shadow-xs">
            {compiledMessage}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all backdrop-blur-xs shadow-xs ${
                copied
                  ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-blue-100/40 hover:bg-blue-200/50 text-blue-600 border border-blue-200/50'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
              <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Texto da Mensagem'}</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="py-3 px-5 bg-emerald-100/40 hover:bg-emerald-200/50 text-emerald-600 border border-emerald-200/50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all backdrop-blur-xs"
            >
              <Send className="w-4 h-4 fill-current text-emerald-600" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
