-- Adicionar campo de lateralidade para protocolos rápidos
ALTER TABLE public.quick_protocol_sessions 
ADD COLUMN affected_side text CHECK (affected_side IN ('left', 'right', 'bilateral'));