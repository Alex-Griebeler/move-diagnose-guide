// FABRIK Relevance Filter - Sistema de Categorização Contextual
// Aplica regras de rebaixamento e elevação baseadas em anamnese

import { 
  sportDemandMatrix, 
  compensationJointMapping, 
  normalizeSportName,
  type SportId,
  type JointDemand,
  type DemandLevel 
} from '@/data/sportDemandMatrix';
import { identificarContextos } from '@/data/weightEngine';

// Tipos
export type RelevanceLevel = 'critical' | 'monitor' | 'secondary';

export interface CategorizedCompensation {
  id: string;
  level: RelevanceLevel;
  reason: string;
  hasAlert?: boolean; // Para casos pós-cirúrgicos que requerem alerta especial
}

export interface AnamnesisContext {
  sports?: Array<{ name: string; level?: string; frequency?: string }>;
  activityTypes?: string[];
  objectives?: string;
  painHistory?: Array<{ region: string; intensity?: number }>;
  surgeries?: Array<{ procedure: string; date?: string; laterality?: string }>;
  sleepQuality?: number;
  sedentaryHoursPerDay?: number;
}

export interface CategorizedResult {
  critical: CategorizedCompensation[];
  monitor: CategorizedCompensation[];
  secondary: CategorizedCompensation[];
  alerts: CategorizedCompensation[]; // Compensações com alerta especial (pós-cirúrgicas)
}

// ============================================
// REGRAS DE REBAIXAMENTO (Seção 2)
// ============================================

interface DowngradeRule {
  condition: (comp: string, ctx: AnamnesisContext) => boolean;
  reason: string;
}

const SPORT_DOWNGRADE_RULES: DowngradeRule[] = [
  // Corrida - compensações de ombro são secundárias
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => normalizeSportName(s.name) === 'corrida') ||
        ctx.activityTypes?.some(a => normalizeSportName(a) === 'corrida');
      return hasSport && ['arms_fall_forward', 'shoulder_protraction', 'elbow_flare', 'scapular_winging'].includes(comp);
    },
    reason: 'Baixa demanda de ombro para corrida',
  },
  // Ciclismo - braços caindo é secundário
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => normalizeSportName(s.name) === 'ciclismo') ||
        ctx.activityTypes?.some(a => normalizeSportName(a) === 'ciclismo');
      return hasSport && comp === 'arms_fall_forward';
    },
    reason: 'Posição inclinada natural no ciclismo',
  },
  // Natação - knee_valgus leve é secundário (baixa carga axial)
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => normalizeSportName(s.name) === 'natacao') ||
        ctx.activityTypes?.some(a => normalizeSportName(a) === 'natacao');
      return hasSport && comp === 'knee_valgus';
    },
    reason: 'Baixa carga axial de joelho na natação',
  },
  // Pilates/Yoga - heels_rise é secundário em cargas baixas
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => 
        normalizeSportName(s.name) === 'pilates' || normalizeSportName(s.name) === 'yoga'
      ) || ctx.activityTypes?.some(a => 
        normalizeSportName(a) === 'pilates' || normalizeSportName(a) === 'yoga'
      );
      return hasSport && comp === 'heels_rise';
    },
    reason: 'Menor relevância em contexto de baixa carga',
  },
  // Jiu-Jitsu - arms_fall_forward é secundário
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => normalizeSportName(s.name) === 'jiu_jitsu');
      return hasSport && comp === 'arms_fall_forward';
    },
    reason: 'Foco em controle de quadril e core no jiu-jitsu',
  },
  // Dança - scapular_winging é secundário
  {
    condition: (comp, ctx) => {
      const hasSport = ctx.sports?.some(s => normalizeSportName(s.name) === 'danca');
      return hasSport && comp === 'scapular_winging';
    },
    reason: 'Prioridade para controle de MMII na dança',
  },
];

const OBJECTIVE_DOWNGRADE_RULES: DowngradeRule[] = [
  // Emagrecimento - arms_fall_forward é secundário
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      return obj.includes('emagrecimento') && comp === 'arms_fall_forward';
    },
    reason: 'Foco em gasto calórico, não técnica fina',
  },
  // Condicionamento geral - feet_abduction leve é secundário
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      return (obj.includes('condicionamento') || obj.includes('saúde')) && comp === 'feet_abduction';
    },
    reason: 'Variação anatômica aceitável para condicionamento',
  },
];

// ============================================
// REGRAS DE ELEVAÇÃO (Seção 3)
// ============================================

interface UpgradeRule {
  condition: (comp: string, ctx: AnamnesisContext) => boolean;
  reason: string;
  alert?: boolean; // Se deve gerar alerta especial
}

// 3.1 Por Dor Atual
const PAIN_UPGRADE_RULES: UpgradeRule[] = [
  // Dor no joelho
  {
    condition: (comp, ctx) => {
      const hasKneePain = ctx.painHistory?.some(p => 
        p.region.toLowerCase().includes('joelho')
      );
      return hasKneePain && ['knee_valgus', 'knee_varus', 'hip_drop', 'foot_collapse', 'feet_eversion', 'asymmetric_shift'].includes(comp);
    },
    reason: 'Aumenta carga articular em joelho com dor',
  },
  // Dor lombar
  {
    condition: (comp, ctx) => {
      const hasLowBackPain = ctx.painHistory?.some(p => 
        p.region.toLowerCase().includes('lombar') || 
        p.region.toLowerCase().includes('costas') ||
        p.region.toLowerCase().includes('coluna')
      );
      return hasLowBackPain && ['butt_wink', 'spine_flexion', 'lumbar_hyperextension', 'trunk_forward_lean', 'trunk_rotation'].includes(comp);
    },
    reason: 'Altera carga compressiva/cisalhante na lombar',
  },
  // Dor no quadril
  {
    condition: (comp, ctx) => {
      const hasHipPain = ctx.painHistory?.some(p => 
        p.region.toLowerCase().includes('quadril')
      );
      return hasHipPain && ['hip_drop', 'hip_hike', 'knee_valgus', 'trunk_rotation_medial', 'trunk_rotation_lateral'].includes(comp);
    },
    reason: 'Instabilidade pélvica em região com dor',
  },
  // Dor no ombro
  {
    condition: (comp, ctx) => {
      const hasShoulderPain = ctx.painHistory?.some(p => 
        p.region.toLowerCase().includes('ombro')
      );
      return hasShoulderPain && ['scapular_winging', 'arms_fall_forward', 'shoulder_protraction', 'shoulder_retraction_insufficient', 'elbow_flare'].includes(comp);
    },
    reason: 'Mecânica escapuloumeral comprometida',
  },
];

// 3.2 Por Cirurgia Prévia
const SURGERY_UPGRADE_RULES: UpgradeRule[] = [
  // LCA / reconstrução ligamentar joelho
  {
    condition: (comp, ctx) => {
      const hasKneeSurgery = ctx.surgeries?.some(s => 
        s.procedure.toLowerCase().includes('lca') ||
        s.procedure.toLowerCase().includes('ligament') ||
        s.procedure.toLowerCase().includes('joelho')
      );
      return hasKneeSurgery && ['knee_valgus', 'balance_loss'].includes(comp);
    },
    reason: 'Risco aumentado de re-lesão pós-LCA',
    alert: true,
  },
  // Menisco
  {
    condition: (comp, ctx) => {
      const hasMeniscusSurgery = ctx.surgeries?.some(s => 
        s.procedure.toLowerCase().includes('menisco')
      );
      return hasMeniscusSurgery && ['knee_valgus', 'knee_varus', 'asymmetric_shift'].includes(comp);
    },
    reason: 'Altera distribuição de carga tibiofemoral',
    alert: true,
  },
  // Manguito rotador / labral ombro
  {
    condition: (comp, ctx) => {
      const hasShoulderSurgery = ctx.surgeries?.some(s => 
        s.procedure.toLowerCase().includes('manguito') ||
        s.procedure.toLowerCase().includes('rotador') ||
        s.procedure.toLowerCase().includes('labral') ||
        s.procedure.toLowerCase().includes('ombro')
      );
      return hasShoulderSurgery && ['scapular_winging', 'arms_fall_forward', 'shoulder_protraction', 'shoulder_retraction_insufficient'].includes(comp);
    },
    reason: 'Estabilidade escapuloumeral pós-cirúrgica',
    alert: true,
  },
  // Hérnia discal / cirurgia coluna lombar
  {
    condition: (comp, ctx) => {
      const hasSpineSurgery = ctx.surgeries?.some(s => 
        s.procedure.toLowerCase().includes('hérnia') ||
        s.procedure.toLowerCase().includes('hernia') ||
        s.procedure.toLowerCase().includes('discal') ||
        s.procedure.toLowerCase().includes('coluna') ||
        s.procedure.toLowerCase().includes('lombar')
      );
      return hasSpineSurgery && ['butt_wink', 'spine_flexion', 'lumbar_hyperextension', 'trunk_forward_lean'].includes(comp);
    },
    reason: 'Risco de recidiva em coluna operada',
    alert: true,
  },
];

// 3.3 Por Objetivo
const OBJECTIVE_UPGRADE_RULES: UpgradeRule[] = [
  // Performance esportiva - verificar matriz esporte × demanda
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      if (!obj.includes('performance') && !obj.includes('desempenho')) return false;
      
      // Verificar se compensação afeta articulação crítica para algum esporte praticado
      const sports = [
        ...(ctx.sports?.map(s => s.name) || []),
        ...(ctx.activityTypes || []),
      ];
      
      const affectedJoints = compensationJointMapping[comp] || [];
      
      return sports.some(sport => {
        const sportId = normalizeSportName(sport);
        if (!sportId) return false;
        const demands = sportDemandMatrix[sportId];
        return affectedJoints.some(joint => demands[joint] === 'high');
      });
    },
    reason: 'Afeta articulação crítica para performance',
  },
  // Reabilitação
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      if (!obj.includes('reabilitação') && !obj.includes('reabilitacao') && !obj.includes('recupera')) return false;
      
      // Se há dor, compensações na mesma região são críticas
      const painRegions = ctx.painHistory?.map(p => p.region.toLowerCase()) || [];
      
      // Mapear compensação para região
      const compRegion = getCompensationRegion(comp);
      return painRegions.some(r => compRegion.includes(r) || r.includes(compRegion));
    },
    reason: 'Controle de movimento é pilar da reabilitação',
  },
  // Hipertrofia MMII
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      const isHypertrophyLower = (obj.includes('hipertrofia') || obj.includes('massa')) && 
        (obj.includes('perna') || obj.includes('mmii') || obj.includes('inferior'));
      return isHypertrophyLower && ['butt_wink', 'spine_flexion', 'knee_valgus', 'heels_rise', 'asymmetric_shift'].includes(comp);
    },
    reason: 'Limita progressão segura de carga em MMII',
  },
  // Hipertrofia MMSS
  {
    condition: (comp, ctx) => {
      const obj = ctx.objectives?.toLowerCase() || '';
      const isHypertrophyUpper = (obj.includes('hipertrofia') || obj.includes('massa')) && 
        (obj.includes('braço') || obj.includes('mmss') || obj.includes('superior') || obj.includes('peito'));
      return isHypertrophyUpper && ['scapular_winging', 'shoulder_protraction', 'elbow_flare'].includes(comp);
    },
    reason: 'Compromete segurança em movimentos de empurrar/puxar',
  },
];

// Helper: mapear compensação para região corporal
function getCompensationRegion(comp: string): string {
  const regionMap: Record<string, string> = {
    knee_valgus: 'joelho',
    knee_varus: 'joelho',
    knee_flexion_insufficient: 'joelho',
    hip_drop: 'quadril',
    hip_hike: 'quadril',
    trunk_forward_lean: 'lombar',
    trunk_forward_lean_sls: 'lombar',
    lumbar_hyperextension: 'lombar',
    spine_flexion: 'lombar',
    butt_wink: 'lombar',
    trunk_rotation: 'lombar',
    asymmetric_shift: 'lombar',
    scapular_winging: 'ombro',
    arms_fall_forward: 'ombro',
    shoulder_protraction: 'ombro',
    shoulder_retraction_insufficient: 'ombro',
    elbow_flare: 'ombro',
    heels_rise: 'tornozelo',
    foot_collapse: 'tornozelo',
    feet_eversion: 'tornozelo',
    balance_loss: 'tornozelo',
  };
  return regionMap[comp] || '';
}

// ============================================
// FUNÇÃO PRINCIPAL DE CATEGORIZAÇÃO
// ============================================

export function categorizeCompensations(
  compensations: string[],
  anamnesis: AnamnesisContext
): CategorizedResult {
  const result: CategorizedResult = {
    critical: [],
    monitor: [],
    secondary: [],
    alerts: [],
  };
  
  for (const comp of compensations) {
    let level: RelevanceLevel = 'monitor'; // Default
    let reason = 'Compensação detectada';
    let hasAlert = false;
    
    // 1. Verificar regras de ELEVAÇÃO primeiro (têm precedência)
    let upgraded = false;
    
    // Verificar dor
    for (const rule of PAIN_UPGRADE_RULES) {
      if (rule.condition(comp, anamnesis)) {
        level = 'critical';
        reason = rule.reason;
        upgraded = true;
        break;
      }
    }
    
    // Verificar cirurgias (pode adicionar alerta)
    if (!upgraded) {
      for (const rule of SURGERY_UPGRADE_RULES) {
        if (rule.condition(comp, anamnesis)) {
          level = 'critical';
          reason = rule.reason;
          hasAlert = rule.alert || false;
          upgraded = true;
          break;
        }
      }
    }
    
    // Verificar objetivos
    if (!upgraded) {
      for (const rule of OBJECTIVE_UPGRADE_RULES) {
        if (rule.condition(comp, anamnesis)) {
          level = 'critical';
          reason = rule.reason;
          upgraded = true;
          break;
        }
      }
    }
    
    // 2. Se não foi elevada, verificar REBAIXAMENTO
    if (!upgraded) {
      // Verificar regras por esporte
      for (const rule of SPORT_DOWNGRADE_RULES) {
        if (rule.condition(comp, anamnesis)) {
          level = 'secondary';
          reason = rule.reason;
          break;
        }
      }
      
      // Verificar regras por objetivo (se ainda não rebaixou)
      if (level !== 'secondary') {
        for (const rule of OBJECTIVE_DOWNGRADE_RULES) {
          if (rule.condition(comp, anamnesis)) {
            level = 'secondary';
            reason = rule.reason;
            break;
          }
        }
      }
    }
    
    // 3. Adicionar ao resultado
    const categorized: CategorizedCompensation = { id: comp, level, reason, hasAlert };
    
    switch (level) {
      case 'critical':
        result.critical.push(categorized);
        if (hasAlert) {
          result.alerts.push(categorized);
        }
        break;
      case 'secondary':
        result.secondary.push(categorized);
        break;
      default:
        result.monitor.push(categorized);
    }
  }
  
  return result;
}

// ============================================
// HELPERS PARA UI
// ============================================

export function getRelevanceLevelLabel(level: RelevanceLevel): string {
  const labels: Record<RelevanceLevel, string> = {
    critical: 'Crítica',
    monitor: 'Monitorar',
    secondary: 'Secundária',
  };
  return labels[level];
}

export function getRelevanceLevelColor(level: RelevanceLevel): string {
  const colors: Record<RelevanceLevel, string> = {
    critical: 'destructive',
    monitor: 'warning',
    secondary: 'muted',
  };
  return colors[level];
}
