// FABRIK Priority Engine - Tabela F
// Cálculo de PriorityScore = finalWeight × SeverityModifier × ImpactModifier

import { 
  compensacaoCausas, 
  contextosAjuste, 
  identificarContextos,
  CausaProvavel 
} from '@/data/weightEngine';

// ============================================
// TABELA F - Modificadores de Severidade e Impacto
// ============================================

export type SeverityLevel = 'severe' | 'moderate' | 'mild';
export type ImpactLevel = 'high' | 'medium' | 'low';

export const severityModifiers: Record<SeverityLevel, number> = {
  severe: 1.5,    // Severo
  moderate: 1.0,  // Moderado
  mild: 0.7,      // Leve
};

export const impactModifiers: Record<ImpactLevel, number> = {
  high: 1.4,    // Alto impacto funcional
  medium: 1.0,  // Médio
  low: 0.8,     // Baixo
};

// ============================================
// Interfaces
// ============================================

export interface CompensacaoDetectada {
  id: string;
  testName: string;
  view?: string;
  side?: string;
  severity?: SeverityLevel;
}

export interface CausaPriorizada {
  id: string;
  label: string;
  categoria: 'HYPO' | 'HYPER' | 'MOB_L' | 'INSTAB' | 'CM' | 'TECH';
  baseWeight: number;
  contextAdjustment: number;
  finalWeight: number;
  severityModifier: number;
  impactModifier: number;
  priorityScore: number;
  fontes: string[]; // Quais compensações geraram esta causa
}

export interface Anamnese {
  painHistory?: Array<{ region: string; intensity: number }>;
  sports?: Array<{ name: string }>;
  activityTypes?: string[];
  sedentaryHoursPerDay?: number;
  sleepQuality?: number;
  objectives?: string;
}

export interface PriorityEngineResult {
  causasPriorizadas: CausaPriorizada[];
  primaryIssues: CausaPriorizada[]; // Top 3-5
  secondaryIssues: CausaPriorizada[]; // Next 3-5
  contextosAplicados: string[];
  totalCompensacoes: number;
}

// ============================================
// Funções Auxiliares
// ============================================

// Determina severidade baseado no número de compensações que geram a mesma causa
function calcularSeveridade(ocorrencias: number): SeverityLevel {
  if (ocorrencias >= 3) return 'severe';
  if (ocorrencias >= 2) return 'moderate';
  return 'mild';
}

// Determina impacto baseado na categoria da causa
function calcularImpacto(categoria: string, objetivos?: string): ImpactLevel {
  // Se o objetivo menciona performance/esporte, INSTAB e CM têm alto impacto
  if (objetivos?.toLowerCase().includes('performance') || 
      objetivos?.toLowerCase().includes('esport') ||
      objetivos?.toLowerCase().includes('compet')) {
    if (categoria === 'INSTAB' || categoria === 'CM') return 'high';
  }
  
  // MOB_L e HYPO geralmente têm alto impacto na função
  if (categoria === 'MOB_L' || categoria === 'HYPO') return 'high';
  
  // HYPER tem impacto médio
  if (categoria === 'HYPER') return 'medium';
  
  // INSTAB tem alto impacto
  if (categoria === 'INSTAB') return 'high';
  
  // CM (controle motor) tem alto impacto
  if (categoria === 'CM') return 'high';
  
  return 'medium';
}

// ============================================
// Engine Principal
// ============================================

export function calcularPrioridades(
  compensacoesDetectadas: CompensacaoDetectada[],
  anamnese: Anamnese
): PriorityEngineResult {
  // 1. Identificar contextos aplicáveis
  const contextosAplicados = identificarContextos(anamnese);
  
  // 2. Agregar causas de todas as compensações
  const causasAgregadas: Map<string, {
    causa: CausaProvavel;
    ocorrencias: number;
    fontes: string[];
  }> = new Map();

  compensacoesDetectadas.forEach(comp => {
    const causas = compensacaoCausas[comp.id] || [];
    
    causas.forEach(causa => {
      const existing = causasAgregadas.get(causa.id);
      const fonte = `${comp.testName}${comp.view ? ` (${comp.view})` : ''}${comp.side ? ` - ${comp.side}` : ''}`;
      
      if (existing) {
        existing.ocorrencias += 1;
        if (!existing.fontes.includes(fonte)) {
          existing.fontes.push(fonte);
        }
      } else {
        causasAgregadas.set(causa.id, {
          causa,
          ocorrencias: 1,
          fontes: [fonte],
        });
      }
    });
  });

  // 3. Calcular ajustes de contexto
  const ajustesContexto: Map<string, number> = new Map();
  
  contextosAplicados.forEach(contextoId => {
    const contexto = contextosAjuste.find(c => c.condicao === contextoId);
    if (contexto) {
      Object.entries(contexto.ajustes).forEach(([causaId, ajuste]) => {
        const currentAjuste = ajustesContexto.get(causaId) || 0;
        ajustesContexto.set(causaId, currentAjuste + ajuste);
      });
    }
  });

  // 4. Calcular PriorityScore para cada causa
  const causasPriorizadas: CausaPriorizada[] = [];

  causasAgregadas.forEach(({ causa, ocorrencias, fontes }) => {
    const baseWeight = causa.baseWeight;
    const contextAdjustment = ajustesContexto.get(causa.id) || 0;
    const finalWeight = baseWeight + contextAdjustment;
    
    const severity = calcularSeveridade(ocorrencias);
    const impact = calcularImpacto(causa.categoria, anamnese.objectives);
    
    const severityMod = severityModifiers[severity];
    const impactMod = impactModifiers[impact];
    
    // FÓRMULA TABELA F:
    // PriorityScore = finalWeight × SeverityModifier × ImpactModifier
    const priorityScore = finalWeight * severityMod * impactMod;

    causasPriorizadas.push({
      id: causa.id,
      label: causa.label,
      categoria: causa.categoria,
      baseWeight,
      contextAdjustment,
      finalWeight,
      severityModifier: severityMod,
      impactModifier: impactMod,
      priorityScore: Math.round(priorityScore * 100) / 100,
      fontes,
    });
  });

  // 5. Ordenar por priorityScore decrescente
  causasPriorizadas.sort((a, b) => b.priorityScore - a.priorityScore);

  // 6. Selecionar primary (3-5) e secondary (3-5) issues
  const primaryIssues = causasPriorizadas.slice(0, 5);
  const secondaryIssues = causasPriorizadas.slice(5, 10);

  return {
    causasPriorizadas,
    primaryIssues,
    secondaryIssues,
    contextosAplicados,
    totalCompensacoes: compensacoesDetectadas.length,
  };
}

// ============================================
// Função para formatar resultado para IA
// ============================================

export function formatarParaIA(result: PriorityEngineResult): string {
  let output = '## ANÁLISE DE PRIORIDADES (Engine FABRIK)\n\n';
  
  output += `### Contextos Identificados:\n`;
  if (result.contextosAplicados.length > 0) {
    result.contextosAplicados.forEach(c => {
      const ctx = contextosAjuste.find(x => x.condicao === c);
      output += `- ${ctx?.label || c}\n`;
    });
  } else {
    output += '- Nenhum contexto específico identificado\n';
  }
  
  output += `\n### Issues Primárias (Top Prioridade):\n`;
  result.primaryIssues.forEach((issue, i) => {
    output += `${i + 1}. **${issue.label}** [${issue.categoria}]\n`;
    output += `   - PriorityScore: ${issue.priorityScore}\n`;
    output += `   - Peso Base: ${issue.baseWeight} + Ajuste Contexto: ${issue.contextAdjustment} = Peso Final: ${issue.finalWeight}\n`;
    output += `   - Fontes: ${issue.fontes.join(', ')}\n`;
  });
  
  if (result.secondaryIssues.length > 0) {
    output += `\n### Issues Secundárias:\n`;
    result.secondaryIssues.forEach((issue, i) => {
      output += `${i + 1}. **${issue.label}** [${issue.categoria}] - Score: ${issue.priorityScore}\n`;
    });
  }
  
  return output;
}

// ============================================
// Categorizar exercícios por fase FABRIK
// ============================================

export function mapearFaseFABRIK(categoria: 'HYPO' | 'HYPER' | 'MOB_L' | 'INSTAB' | 'CM' | 'TECH'): string[] {
  switch (categoria) {
    case 'MOB_L':
      return ['mobility'];
    case 'HYPER':
      return ['inhibition', 'mobility'];
    case 'HYPO':
      return ['activation', 'strength'];
    case 'INSTAB':
      return ['stability'];
    case 'CM':
      return ['stability', 'integration'];
    case 'TECH':
      return ['integration'];
    default:
      return ['activation'];
  }
}
