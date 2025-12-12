// Matriz Esporte × Demanda Articular
// Baseada no documento de requisitos FABRIK
// A = Alta demanda (crítico para performance/lesão)
// M = Média demanda (relevante, mas não central)
// B = Baixa demanda (geralmente secundária para o esporte)

export type DemandLevel = 'high' | 'medium' | 'low';

export type JointDemand = 
  | 'ankle_dorsiflexion'      // Dorsiflexão Tornozelo
  | 'hip_extension'           // Extensão Quadril
  | 'hip_internal_rotation'   // Rot. Int. Quadril
  | 'hip_external_rotation'   // Rot. Ext. Quadril
  | 'knee_stability'          // Estabilidade Joelho
  | 'thoracic_extension'      // Extensão Torácica
  | 'shoulder_flexion'        // Flexão Ombro
  | 'shoulder_external_rot'   // Rot. Ext. Ombro
  | 'core_stability';         // Estabilidade Core

export type SportId = 
  | 'corrida'
  | 'natacao'
  | 'musculacao'
  | 'crossfit'
  | 'futebol'
  | 'basquete'
  | 'volei'
  | 'tenis'
  | 'jiu_jitsu'
  | 'ciclismo'
  | 'triathlon'
  | 'funcional'
  | 'pilates'
  | 'yoga'
  | 'danca';

// Matriz completa: esporte → articulação → demanda
export const sportDemandMatrix: Record<SportId, Record<JointDemand, DemandLevel>> = {
  corrida: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'medium',
    shoulder_flexion: 'low',
    shoulder_external_rot: 'low',
    core_stability: 'high',
  },
  natacao: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'medium',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'medium',
    knee_stability: 'low',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  musculacao: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'medium',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'medium',
    shoulder_external_rot: 'medium',
    core_stability: 'high',
  },
  crossfit: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  futebol: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'medium',
    shoulder_flexion: 'low',
    shoulder_external_rot: 'low',
    core_stability: 'high',
  },
  basquete: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'medium',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'medium',
    core_stability: 'high',
  },
  volei: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'medium',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  tenis: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'medium',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  jiu_jitsu: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'medium',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  ciclismo: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'medium',
    knee_stability: 'high',
    thoracic_extension: 'medium',
    shoulder_flexion: 'low',
    shoulder_external_rot: 'low',
    core_stability: 'high',
  },
  triathlon: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  funcional: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  pilates: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'high',
    hip_internal_rotation: 'medium',
    hip_external_rotation: 'medium',
    knee_stability: 'medium',
    thoracic_extension: 'high',
    shoulder_flexion: 'medium',
    shoulder_external_rot: 'medium',
    core_stability: 'high',
  },
  yoga: {
    ankle_dorsiflexion: 'medium',
    hip_extension: 'medium',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'medium',
    thoracic_extension: 'high',
    shoulder_flexion: 'high',
    shoulder_external_rot: 'high',
    core_stability: 'high',
  },
  danca: {
    ankle_dorsiflexion: 'high',
    hip_extension: 'high',
    hip_internal_rotation: 'high',
    hip_external_rotation: 'high',
    knee_stability: 'high',
    thoracic_extension: 'high',
    shoulder_flexion: 'medium',
    shoulder_external_rot: 'medium',
    core_stability: 'high',
  },
};

// Mapeamento compensação → articulação(ões) afetada(s)
// Derivado das categorias MOB_L e relações clínicas em weightEngine.ts
export const compensationJointMapping: Record<string, JointDemand[]> = {
  // Tornozelo
  heels_rise: ['ankle_dorsiflexion'],
  heels_rise_posterior: ['ankle_dorsiflexion'],
  foot_collapse: ['ankle_dorsiflexion', 'knee_stability'],
  feet_eversion: ['ankle_dorsiflexion'],
  feet_eversion_posterior: ['ankle_dorsiflexion'],
  foot_pronation: ['ankle_dorsiflexion'],
  
  // Joelho
  knee_valgus: ['knee_stability', 'hip_external_rotation'],
  knee_varus: ['knee_stability'],
  instability: ['knee_stability', 'ankle_dorsiflexion'],
  tremor: ['knee_stability', 'core_stability'],
  balance_loss: ['ankle_dorsiflexion', 'knee_stability', 'core_stability'],
  knee_flexion_insufficient: ['knee_stability', 'hip_extension'],
  
  // Quadril
  hip_drop: ['hip_extension', 'hip_external_rotation', 'core_stability'],
  hip_hike: ['hip_extension', 'core_stability'],
  spine_flexion: ['hip_extension', 'core_stability'],
  butt_wink: ['hip_extension', 'core_stability'],
  trunk_forward_lean: ['hip_extension', 'thoracic_extension', 'core_stability'],
  trunk_forward_lean_sls: ['hip_extension', 'core_stability'],
  lumbar_hyperextension: ['hip_extension', 'core_stability'],
  trunk_rotation: ['hip_internal_rotation', 'hip_external_rotation', 'core_stability'],
  trunk_rotation_medial: ['hip_internal_rotation', 'core_stability'],
  trunk_rotation_lateral: ['hip_external_rotation', 'core_stability'],
  asymmetric_shift: ['hip_extension', 'core_stability'],
  
  // Coluna Torácica
  arms_fall_forward: ['thoracic_extension', 'shoulder_flexion'],
  arms_fall: ['thoracic_extension', 'shoulder_flexion'],
  
  // Ombro
  scapular_winging: ['shoulder_flexion', 'shoulder_external_rot'],
  elbow_flare: ['shoulder_external_rot'],
  shoulder_protraction: ['thoracic_extension', 'shoulder_flexion'],
  shoulder_retraction_insufficient: ['thoracic_extension'],
  
  // Pés
  feet_abduction: ['hip_external_rotation', 'ankle_dorsiflexion'],
};

// Helper: normalizar nome do esporte para SportId
export function normalizeSportName(sport: string): SportId | null {
  const normalized = sport.toLowerCase().trim();
  
  const mappings: Record<string, SportId> = {
    // Corrida
    'corrida': 'corrida',
    'correr': 'corrida',
    'running': 'corrida',
    'run': 'corrida',
    'maratona': 'corrida',
    
    // Natação
    'natação': 'natacao',
    'natacao': 'natacao',
    'swim': 'natacao',
    'swimming': 'natacao',
    
    // Musculação
    'musculação': 'musculacao',
    'musculacao': 'musculacao',
    'academia': 'musculacao',
    'gym': 'musculacao',
    'weightlifting': 'musculacao',
    'força': 'musculacao',
    'forca': 'musculacao',
    'strength': 'musculacao',
    'hipertrofia': 'musculacao',
    
    // CrossFit
    'crossfit': 'crossfit',
    'cross fit': 'crossfit',
    'cf': 'crossfit',
    
    // Futebol
    'futebol': 'futebol',
    'soccer': 'futebol',
    'futsal': 'futebol',
    'football': 'futebol',
    
    // Basquete
    'basquete': 'basquete',
    'basketball': 'basquete',
    
    // Vôlei
    'vôlei': 'volei',
    'volei': 'volei',
    'vólei': 'volei',
    'volleyball': 'volei',
    
    // Tênis
    'tênis': 'tenis',
    'tenis': 'tenis',
    'tennis': 'tenis',
    
    // Jiu-Jitsu
    'jiu-jitsu': 'jiu_jitsu',
    'jiu jitsu': 'jiu_jitsu',
    'jiujitsu': 'jiu_jitsu',
    'bjj': 'jiu_jitsu',
    
    // Ciclismo
    'ciclismo': 'ciclismo',
    'bike': 'ciclismo',
    'cycling': 'ciclismo',
    'bicicleta': 'ciclismo',
    'pedalar': 'ciclismo',
    
    // Triathlon
    'triathlon': 'triathlon',
    'triatlo': 'triathlon',
    
    // Funcional
    'funcional': 'funcional',
    'treinamento funcional': 'funcional',
    'functional': 'funcional',
    
    // Pilates
    'pilates': 'pilates',
    
    // Yoga
    'yoga': 'yoga',
    'ioga': 'yoga',
    
    // Dança
    'dança': 'danca',
    'danca': 'danca',
    'dance': 'danca',
    'ballet': 'danca',
    'balé': 'danca',
  };
  
  return mappings[normalized] || null;
}

// Helper: obter demandas para um esporte
export function getSportDemands(sportName: string): Record<JointDemand, DemandLevel> | null {
  const sportId = normalizeSportName(sportName);
  if (!sportId) return null;
  return sportDemandMatrix[sportId];
}

// Helper: verificar se articulação é crítica para esporte
export function isJointCriticalForSport(sportName: string, joint: JointDemand): boolean {
  const demands = getSportDemands(sportName);
  if (!demands) return false;
  return demands[joint] === 'high';
}
