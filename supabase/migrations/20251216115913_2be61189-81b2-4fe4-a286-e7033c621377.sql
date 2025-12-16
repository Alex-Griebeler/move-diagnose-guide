-- Adicionar colunas de regressão e progressão aos exercícios
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS regression text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS progression text;

-- Atualizar exercícios existentes com regressões e progressões
-- MOBILITY
UPDATE exercises SET regression = 'Mobilização sentado com toalha sob o pé', progression = 'Joelho na parede com elevação do calcanhar' WHERE name = 'Joelho na Parede';
UPDATE exercises SET regression = 'Alongamento em pé com apoio', progression = 'Adicionar rotação torácica + alcance' WHERE name = 'Flexores do Quadril 1/2 Ajoelhado';
UPDATE exercises SET regression = 'Flexores do quadril 1/2 ajoelhado', progression = 'Couch stretch com elevação do braço' WHERE name = 'Couch Stretch';
UPDATE exercises SET regression = '90/90 estático sem rotação', progression = '90/90 com inclinação anterior do tronco' WHERE name = '90/90 com Rotação';
UPDATE exercises SET regression = 'Apenas flexão (gato)', progression = 'Cat/Camel segmentar isolado' WHERE name = 'Cat/Camel';
UPDATE exercises SET regression = 'Rotação torácica em decúbito lateral', progression = 'Rotação torácica com banda de resistência' WHERE name = 'Rotação Torácica 3 Apoios';
UPDATE exercises SET regression = 'Extensão torácica no chão', progression = 'Extensão torácica com braços elevados' WHERE name = 'Extensão Torácica no Rolo';
UPDATE exercises SET regression = 'Deslizamento com cotovelos flexionados', progression = 'Deslizamento com resistência de banda' WHERE name = 'Deslizamento Escapular';
UPDATE exercises SET regression = 'Borboleta sentado', progression = 'Adutor rock com rotação do tronco' WHERE name = 'Adutor Rock';
UPDATE exercises SET regression = 'Avanço estático', progression = 'World''s greatest stretch completo' WHERE name = 'Melhor do Mundo com Rotação';

-- INHIBITION
UPDATE exercises SET regression = 'Pressão estática com bola', progression = 'LMF com dorsiflexão ativa' WHERE name = 'LMF Panturrilha';
UPDATE exercises SET regression = 'Pressão estática manual', progression = 'LMF com bola de lacrosse' WHERE name = 'LMF TFL';
UPDATE exercises SET regression = 'Alongamento estático de adutores', progression = 'LMF com movimento ativo da perna' WHERE name = 'LMF Adutores';
UPDATE exercises SET regression = 'Alongamento de piriforme supino', progression = 'LMF com bola de lacrosse no piriforme' WHERE name = 'LMF Glúteos';
UPDATE exercises SET regression = 'Alongamento de quadríceps em pé', progression = 'LMF com flexão ativa do joelho' WHERE name = 'LMF Flexores do Quadril';
UPDATE exercises SET regression = 'Alongamento estático de isquiotibiais', progression = 'LMF com extensão ativa do joelho' WHERE name = 'LMF Posteriores da Coxa';
UPDATE exercises SET regression = 'Extensão torácica no chão', progression = 'LMF segmentar com pausa' WHERE name = 'LMF Coluna Torácica';
UPDATE exercises SET regression = 'Alongamento de lat em pé', progression = 'LMF com movimento do braço' WHERE name = 'LMF Latíssimo';
UPDATE exercises SET regression = 'Alongamento de peitoral na porta', progression = 'LMF com rotação do braço' WHERE name = 'LMF Peitoral';
UPDATE exercises SET regression = 'Alongamento manual da planta', progression = 'LMF com movimentos circulares' WHERE name = 'LMF Planta do Pé';
UPDATE exercises SET regression = 'Alongamento na escada (gastrocnêmio)', progression = 'Alongamento excêntrico em step' WHERE name = 'Alongamento Bi-fásico Panturrilha';
UPDATE exercises SET regression = 'Respiração diafragmática simples', progression = 'Respiração 4-7-8 com retenção prolongada' WHERE name = 'Respiração 4-7-8';

-- ACTIVATION
UPDATE exercises SET regression = 'Clam shell com amplitude reduzida', progression = 'Clam shell com mini-band' WHERE name = 'Clam Shell';
UPDATE exercises SET regression = 'Clam shell sem banda', progression = 'Clam shell com banda pesada + isometria' WHERE name = 'Clam Shell com Mini-Band';
UPDATE exercises SET regression = 'Ponte com pés elevados', progression = 'Ponte com marcha' WHERE name = 'Ponte';
UPDATE exercises SET regression = 'Ponte bilateral', progression = 'Ponte unilateral com elevação de calcâneo' WHERE name = 'Ponte Unilateral';
UPDATE exercises SET regression = 'Retração escapular em pé', progression = 'Prone Y com carga leve' WHERE name = 'Cobra (Prone Y)';
UPDATE exercises SET regression = 'Y em pé na parede', progression = 'Y inclinado em banco' WHERE name = 'Y em Decúbito Ventral';
UPDATE exercises SET regression = 'W sentado com banda', progression = 'W com carga ou em banco inclinado' WHERE name = 'W em Decúbito Ventral';
UPDATE exercises SET regression = 'Extensão de quadril em pé', progression = 'Bird-dog (perdigueiro)' WHERE name = '4 Apoios com Extensão de Quadril';
UPDATE exercises SET regression = 'Dead bug com pés apoiados', progression = 'Dead bug com banda ou kettlebell' WHERE name = 'Dead Bug';
UPDATE exercises SET regression = 'Prancha lateral de ombro elevado', progression = 'Prancha lateral completa' WHERE name = 'Prancha Lateral de Joelhos';
UPDATE exercises SET regression = 'Transferência de peso em pé', progression = 'Troca de pegada com KB mais pesado' WHERE name = 'Troca de Pegada com Kettlebell';
UPDATE exercises SET regression = 'Eversão com banda sentado', progression = 'Flexão plantar unilateral' WHERE name = 'Flexão Plantar com Ênfase Fibulares';

-- STABILITY
UPDATE exercises SET regression = 'Prancha de joelhos', progression = 'Prancha com perturbação ou alcance' WHERE name = 'Prancha Baixa';
UPDATE exercises SET regression = 'Prancha lateral de joelhos', progression = 'Prancha lateral com elevação de perna' WHERE name = 'Prancha Lateral';
UPDATE exercises SET regression = 'Prancha lateral sem abdução', progression = 'Prancha lateral com abdução + banda' WHERE name = 'Prancha Lateral com Abdução';
UPDATE exercises SET regression = 'Posição de 4 apoios estática', progression = 'Bear crawl' WHERE name = 'Bear Hold';
UPDATE exercises SET regression = 'Bird-dog com apoio de joelho', progression = 'Bird-dog com banda de resistência' WHERE name = 'Perdigueiro (Bird-Dog)';
UPDATE exercises SET regression = 'Pallof press isométrico', progression = 'Pallof press com rotação ou step' WHERE name = 'Pallof Press';
UPDATE exercises SET regression = 'Abdução de quadril em pé', progression = 'Monster walk com banda pesada' WHERE name = 'Monster Walk';
UPDATE exercises SET regression = 'SLDL com apoio', progression = 'SLDL com carga' WHERE name = 'Single-Leg Deadlift (SLDL)';
UPDATE exercises SET regression = 'SLDL estático', progression = 'Airplane com perturbação externa' WHERE name = 'Airplane';
UPDATE exercises SET regression = 'Flexão normal', progression = 'Push-up plus em instabilidade' WHERE name = 'Push-up Plus (Flexão Escapular)';
UPDATE exercises SET regression = 'Prancha alta estática', progression = 'Prancha com alcance alternado' WHERE name = 'Prancha Alta com Alcance';
UPDATE exercises SET regression = 'Y teste com apoio', progression = 'Y teste com maior amplitude' WHERE name = 'Y Teste em Pé';

-- STRENGTH
UPDATE exercises SET regression = 'Agachamento bodyweight', progression = 'Agachamento frontal com barra' WHERE name = 'Agachamento Taça';
UPDATE exercises SET regression = 'RDL com bastão', progression = 'RDL com barra pesada' WHERE name = 'RDL (Romanian Deadlift)';
UPDATE exercises SET regression = 'Ponte com peso no quadril', progression = 'Hip thrust unilateral' WHERE name = 'Hip Thrust';
UPDATE exercises SET regression = 'SLDL sem carga', progression = 'Deadlift unilateral com rotação' WHERE name = 'Deadlift Unilateral';
UPDATE exercises SET regression = 'Lunge reverso bodyweight', progression = 'Lunge reverso com deficit' WHERE name = 'Lunge Reverso';
UPDATE exercises SET regression = 'Step up baixo sem carga', progression = 'Step up alto com carga' WHERE name = 'Step Up';
UPDATE exercises SET regression = 'Nordic com assistência', progression = 'Nordic completo' WHERE name = 'Flexão Nórdica';
UPDATE exercises SET regression = 'Remada invertida no TRX', progression = 'Remada com pausa no topo' WHERE name = 'Remada Fechada nas Argolas';
UPDATE exercises SET regression = 'Face pull com banda leve', progression = 'Face pull com rotação externa acentuada' WHERE name = 'Face Pull';
UPDATE exercises SET regression = 'Flexão inclinada', progression = 'Flexão com feet elevated' WHERE name = 'Flexão de Braços';
UPDATE exercises SET regression = 'Press de ombro em pé', progression = 'Press landmine com rotação' WHERE name = 'Press Landmine 1/2 Ajoelhado';
UPDATE exercises SET regression = 'Agachamento búlgaro', progression = 'Pistol squat' WHERE name = 'Agachamento Unilateral';

-- INTEGRATION
UPDATE exercises SET regression = 'Agachamento com bastão', progression = 'OHS com barra' WHERE name = 'Agachamento Overhead';
UPDATE exercises SET regression = 'Windmill sem carga', progression = 'Windmill com KB duplo' WHERE name = 'Windmill';
UPDATE exercises SET regression = 'Lunge frontal apenas', progression = 'Lunge matrix com carga' WHERE name = 'Lunge Matrix';
UPDATE exercises SET regression = 'Bear hold', progression = 'Bear crawl com carga ou obstáculos' WHERE name = 'Bear Crawl';
UPDATE exercises SET regression = 'Deadlift com KB', progression = 'KB swing one-arm' WHERE name = 'Kettlebell Swing';
UPDATE exercises SET regression = 'Step up com KB', progression = 'Clean to box com altura maior' WHERE name = 'Clean to Box';
UPDATE exercises SET regression = 'TGU parcial (até cotovelo)', progression = 'TGU completo' WHERE name = 'Turkish Get-Up (Flow 1)';
UPDATE exercises SET regression = 'Burpee sem salto', progression = 'Burpee com pull-up ou box jump' WHERE name = 'Burpee';
UPDATE exercises SET regression = 'Box step up', progression = 'Box jump com altura maior' WHERE name = 'Box Jump';
UPDATE exercises SET regression = 'Arremesso frontal sem passada', progression = 'Arremesso rotacional com med ball pesada' WHERE name = 'Arremesso Overhead com Passada';