import { cn } from '@/lib/utils';

interface FramingGuideProps {
  testName: string;
  viewType?: string;
  className?: string;
}

// Guide configurations for different tests and views
const guideConfigs: Record<string, { instruction: string; guideType: 'full-body' | 'upper-body' | 'lower-body' | 'side-view' }> = {
  // Overhead Squat
  'overhead_squat_anterior': {
    instruction: 'Posicione a pessoa de frente, corpo inteiro visível',
    guideType: 'full-body',
  },
  'overhead_squat_lateral': {
    instruction: 'Posicione a pessoa de lado, corpo inteiro visível',
    guideType: 'side-view',
  },
  'overhead_squat_posterior': {
    instruction: 'Posicione a pessoa de costas, corpo inteiro visível',
    guideType: 'full-body',
  },
  // Single Leg Squat
  'single_leg_squat_left': {
    instruction: 'Posicione de frente, foco no joelho e quadril',
    guideType: 'full-body',
  },
  'single_leg_squat_right': {
    instruction: 'Posicione de frente, foco no joelho e quadril',
    guideType: 'full-body',
  },
  // Push-up
  'pushup_lateral': {
    instruction: 'Posicione de lado, corpo inteiro na horizontal',
    guideType: 'side-view',
  },
  'pushup_posterior': {
    instruction: 'Posicione de cima/trás, escápulas visíveis',
    guideType: 'upper-body',
  },
  // Default
  'default': {
    instruction: 'Posicione a pessoa inteira no enquadramento',
    guideType: 'full-body',
  },
};

function getGuideConfig(testName: string, viewType?: string) {
  const key = viewType ? `${testName}_${viewType}` : testName;
  return guideConfigs[key] || guideConfigs['default'];
}

export function FramingGuide({ testName, viewType, className }: FramingGuideProps) {
  const config = getGuideConfig(testName, viewType);

  return (
    <div className={cn('relative w-full aspect-[3/4] bg-background/95 rounded-xl overflow-hidden', className)}>
      {/* Guide overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {config.guideType === 'full-body' && <FullBodyGuide />}
        {config.guideType === 'side-view' && <SideViewGuide />}
        {config.guideType === 'upper-body' && <UpperBodyGuide />}
        {config.guideType === 'lower-body' && <LowerBodyGuide />}
      </div>

      {/* Instruction text */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-sm text-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          {config.instruction}
        </p>
      </div>

      {/* Corner guides */}
      <CornerGuides />
    </div>
  );
}

function CornerGuides() {
  return (
    <>
      {/* Top left */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/60 rounded-tl-lg" />
      {/* Top right */}
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/60 rounded-tr-lg" />
      {/* Bottom left */}
      <div className="absolute bottom-16 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/60 rounded-bl-lg" />
      {/* Bottom right */}
      <div className="absolute bottom-16 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/60 rounded-br-lg" />
    </>
  );
}

function FullBodyGuide() {
  return (
    <svg viewBox="0 0 100 160" className="h-4/5 opacity-30 animate-pulse">
      {/* Head */}
      <circle cx="50" cy="15" r="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Body */}
      <line x1="50" y1="25" x2="50" y2="70" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Arms */}
      <line x1="50" y1="35" x2="30" y2="55" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="50" y1="35" x2="70" y2="55" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Legs */}
      <line x1="50" y1="70" x2="35" y2="110" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="50" y1="70" x2="65" y2="110" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Feet */}
      <line x1="35" y1="110" x2="35" y2="120" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="65" y1="110" x2="65" y2="120" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Reference lines */}
      <line x1="20" y1="70" x2="80" y2="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-muted-foreground" />
      <line x1="50" y1="5" x2="50" y2="130" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-muted-foreground" />
    </svg>
  );
}

function SideViewGuide() {
  return (
    <svg viewBox="0 0 100 160" className="h-4/5 opacity-30 animate-pulse">
      {/* Head */}
      <circle cx="50" cy="15" r="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Body (slight forward lean) */}
      <line x1="50" y1="25" x2="52" y2="70" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Arm */}
      <line x1="51" y1="35" x2="55" y2="55" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Legs */}
      <line x1="52" y1="70" x2="48" y2="110" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Vertical reference line (plumb line) */}
      <line x1="50" y1="5" x2="50" y2="130" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" className="text-primary" />
      {/* Horizontal reference at hip */}
      <line x1="30" y1="70" x2="70" y2="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-muted-foreground" />
    </svg>
  );
}

function UpperBodyGuide() {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 opacity-30 animate-pulse">
      {/* Shoulders outline */}
      <ellipse cx="50" cy="30" rx="35" ry="15" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Spine line */}
      <line x1="50" y1="30" x2="50" y2="80" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Scapula indicators */}
      <ellipse cx="35" cy="45" rx="10" ry="15" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-primary" />
      <ellipse cx="65" cy="45" rx="10" ry="15" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-primary" />
    </svg>
  );
}

function LowerBodyGuide() {
  return (
    <svg viewBox="0 0 100 120" className="h-3/5 opacity-30 animate-pulse">
      {/* Hip */}
      <ellipse cx="50" cy="20" rx="25" ry="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Legs */}
      <line x1="40" y1="25" x2="35" y2="80" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="60" y1="25" x2="65" y2="80" stroke="currentColor" strokeWidth="1" className="text-primary" />
      {/* Knee reference */}
      <circle cx="37" cy="55" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-primary" />
      <circle cx="63" cy="55" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-primary" />
      {/* Feet */}
      <line x1="35" y1="80" x2="35" y2="95" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="65" y1="80" x2="65" y2="95" stroke="currentColor" strokeWidth="1" className="text-primary" />
    </svg>
  );
}
