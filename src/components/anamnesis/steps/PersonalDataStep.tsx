import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PersonalDataStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

export function PersonalDataStep({ data, updateData }: PersonalDataStepProps) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(data.birthDate || new Date(1990, 0, 1));
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: 'Janeiro' },
    { value: 1, label: 'Fevereiro' },
    { value: 2, label: 'Março' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Maio' },
    { value: 5, label: 'Junho' },
    { value: 6, label: 'Julho' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Setembro' },
    { value: 9, label: 'Outubro' },
    { value: 10, label: 'Novembro' },
    { value: 11, label: 'Dezembro' },
  ];

  const handleMonthChange = (month: string) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(parseInt(month));
    setCalendarMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(calendarMonth);
    newDate.setFullYear(parseInt(year));
    setCalendarMonth(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Dados Pessoais</h3>
        <p className="text-sm text-muted-foreground">
          Informações básicas para contextualizar a avaliação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Birth Date */}
        <div className="space-y-2">
          <Label>Data de Nascimento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-11",
                  !data.birthDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.birthDate ? (
                  format(data.birthDate, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 bg-popover border shadow-lg z-50" 
              align="start"
              side="bottom"
              sideOffset={4}
              avoidCollisions={false}
            >
              <div className="p-3 space-y-3">
                {/* Month/Year Selectors */}
                <div className="flex gap-2">
                  <Select
                    value={calendarMonth.getMonth().toString()}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[100]">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={calendarMonth.getFullYear().toString()}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[100] max-h-60">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Calendar
                  mode="single"
                  selected={data.birthDate}
                  onSelect={(date) => updateData({ birthDate: date })}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  className="pointer-events-auto"
                  locale={ptBR}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Laterality */}
        <div className="space-y-2">
          <Label>Lateralidade</Label>
          <Select
            value={data.laterality}
            onValueChange={(value: 'right' | 'left' | 'ambidextrous') => 
              updateData({ laterality: value })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="right">Destro</SelectItem>
              <SelectItem value="left">Canhoto</SelectItem>
              <SelectItem value="ambidextrous">Ambidestro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="Ex: 75.5"
            value={data.weightKg}
            onChange={(e) => updateData({ weightKg: e.target.value })}
            className="h-11"
          />
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Altura (cm)</Label>
          <Input
            id="height"
            type="number"
            step="1"
            placeholder="Ex: 175"
            value={data.heightCm}
            onChange={(e) => updateData({ heightCm: e.target.value })}
            className="h-11"
          />
        </div>

        {/* Occupation */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="occupation">Profissão</Label>
          <Input
            id="occupation"
            type="text"
            placeholder="Ex: Engenheiro, Professor, Atleta..."
            value={data.occupation}
            onChange={(e) => updateData({ occupation: e.target.value })}
            className="h-11"
          />
        </div>
      </div>

      {/* BMI Calculation */}
      {data.weightKg && data.heightCm && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            IMC calculado:{' '}
            <span className="font-semibold text-foreground">
              {(parseFloat(data.weightKg) / Math.pow(parseFloat(data.heightCm) / 100, 2)).toFixed(1)} kg/m²
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
