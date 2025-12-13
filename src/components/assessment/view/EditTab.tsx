import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Activity, Target, FileText, Edit2 } from 'lucide-react';

type EditMode = 'view' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface EditTabProps {
  onSetEditMode: (mode: EditMode) => void;
}

export function EditTab({ onSetEditMode }: EditTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Editar Avaliação</CardTitle>
        <CardDescription>
          Selecione qual parte da avaliação deseja editar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onSetEditMode('anamnesis')}
        >
          <ClipboardList className="w-4 h-4 mr-3" />
          Editar Anamnese
          <Edit2 className="w-4 h-4 ml-auto" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onSetEditMode('global-tests')}
        >
          <Activity className="w-4 h-4 mr-3" />
          Editar Testes Globais
          <Edit2 className="w-4 h-4 ml-auto" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onSetEditMode('segmental-tests')}
        >
          <Target className="w-4 h-4 mr-3" />
          Editar Testes Segmentais
          <Edit2 className="w-4 h-4 ml-auto" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onSetEditMode('protocol')}
        >
          <FileText className="w-4 h-4 mr-3" />
          Regenerar Protocolo
          <Edit2 className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
