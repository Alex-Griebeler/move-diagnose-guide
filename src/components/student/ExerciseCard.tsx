import { Check, Play, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  name: string;
  phase: string;
  sets: number;
  reps: string;
  instructions: string;
  video_url?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  isCompleted: boolean;
  onComplete: () => void;
}

export function ExerciseCard({ exercise, isCompleted, onComplete }: ExerciseCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200",
      isCompleted && "bg-success/5 border-success/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Complete Button */}
          <button
            onClick={onComplete}
            disabled={isCompleted}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
              isCompleted 
                ? "bg-success text-success-foreground" 
                : "border-2 border-border hover:border-primary hover:bg-primary/5"
            )}
          >
            {isCompleted ? (
              <Check className="w-5 h-5" />
            ) : (
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className={cn(
                  "font-medium",
                  isCompleted && "text-muted-foreground line-through"
                )}>
                  {exercise.name}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {exercise.sets} séries × {exercise.reps}
                </p>
              </div>
              {exercise.video_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => window.open(exercise.video_url, '_blank')}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Vídeo
                </Button>
              )}
            </div>
            {exercise.instructions && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {exercise.instructions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
