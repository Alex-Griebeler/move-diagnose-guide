// ============================================
// CLASSIFICATION_IDS - Constantes para classificações funcionais
// Sincronizado com FUNCTIONALCLASSIFICATION do Superprompt
// ============================================

// Categorias funcionais (alinhadas ao Superprompt)
export const FUNCTIONAL_CATEGORIES = {
  HYPO: 'hypoactivities',
  HYPER: 'hyperactivities',
  MOB_L: 'mobilityLimitations',
  INSTAB: 'instabilities',
  CM: 'motorControl',
} as const;

// Labels de classificação para uso em testClassificationMappings
export const CLASSIFICATION_LABELS = {
  // Músculos / Estruturas - Hipoativos
  GluteMed: 'GluteMed',
  GluteMin: 'GluteMin',
  GluteMax: 'GluteMax',
  TibPost: 'TibPost',
  FootIntrinsics: 'FootIntrinsics',
  Serratus: 'Serratus',
  TrapInf: 'TrapInf',
  TrapMid: 'TrapMid',
  Rhomboids: 'Rhomboids',
  DeepNeckFlexors: 'DeepNeckFlexors',
  CoreDeep: 'CoreDeep',
  CoreLateral: 'CoreLateral',
  LumbarErectors: 'LumbarErectors',
  ShoulderER: 'ShoulderER',
  VMO: 'VMO',

  // Músculos / Estruturas - Hiperativos/Encurtados
  TFL: 'TFL',
  ITBand: 'ITBand',
  Piriformis: 'Piriformis',
  Gastroc: 'Gastroc',
  Soleus: 'Soleus',
  Peroneals: 'Peroneals',
  HipFlexors: 'HipFlexors',
  Hamstrings: 'Hamstrings',
  Adductors: 'Adductors',
  QL: 'QL',
  Obliques: 'Obliques',
  Paravertebrals: 'Paravertebrals',
  TrapSup: 'TrapSup',
  SCM: 'SCM',
  PecMajor: 'PecMajor',
  PecMinor: 'PecMinor',
  Lats: 'Lats',

  // Limitações de Mobilidade
  Dorsiflexion: 'Dorsiflexion',
  TCJoint: 'TCJoint',
  HipER: 'HipER',
  HipFlexion: 'HipFlexion',
  TspineExtension: 'TspineExtension',
  ShoulderFlexion: 'ShoulderFlexion',

  // Instabilidades
  LateralPelvic: 'LateralPelvic',
  FrontalPlane: 'FrontalPlane',
  Ankle: 'Ankle',
  Core: 'Core',
  Scapula: 'Scapula',
  Arch: 'Arch',

  // Controle Motor
  LumbarControl: 'LumbarControl',
  RotationalControl: 'RotationalControl',
  QuadEccentric: 'QuadEccentric',
  ArchControl: 'ArchControl',
  FootActivation: 'FootActivation',
  GlobalMotorControl: 'GlobalMotorControl',
  Proprioception: 'Proprioception',
  ScapularRhythm: 'ScapularRhythm',
  FrontalControl: 'FrontalControl',
} as const;

export type FunctionalCategory = typeof FUNCTIONAL_CATEGORIES[keyof typeof FUNCTIONAL_CATEGORIES];
export type ClassificationLabel = typeof CLASSIFICATION_LABELS[keyof typeof CLASSIFICATION_LABELS];
