import { describe, expect, it } from 'vitest';
import { sanitizeMediaUrls } from '@/lib/draftSanitizer';

// Cópia literal da implementação que estava dentro de useWizardPersistence (main 9ecf185),
// fora do useCallback. Serve de referência: a extração não pode mudar o resultado.
// Quando a Etapa 3 mudar o comportamento de propósito (F-01), esta cópia muda junto.
function legacySanitizeMediaUrls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Filter out local/blob URLs that won't work across sessions
    if (obj.startsWith('blob:') || obj.startsWith('data:')) {
      return undefined;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(legacySanitizeMediaUrls);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const sanitized = legacySanitizeMediaUrls(value);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  return obj;
}

// Rascunho sintético com a forma da anamnese do wizard (nenhum dado real).
const syntheticDraft = {
  fullName: 'Aluno Sintético',
  birthDate: new Date('1990-05-17T00:00:00.000Z'),
  sleepQuality: 3,
  sedentaryHoursPerDay: 7,
  painHistory: [
    { region: 'lombar', intensity: 4, photo: 'blob:http://localhost/abc' },
    { region: 'joelho', intensity: 2, photo: 'https://example.invalid/foto.jpg' },
  ],
  sports: [{ name: 'corrida' }],
  media: {
    anterior: 'data:image/jpeg;base64,AAAA',
    lateral: 'https://example.invalid/lateral.jpg',
    extras: ['blob:x', 'https://example.invalid/1.jpg', undefined, null],
  },
  consent: true,
  notes: '',
};

const corpus: Array<[string, unknown]> = [
  ['null na raiz', null],
  ['undefined na raiz', undefined],
  ['string vazia', ''],
  ['blob na raiz', 'blob:http://localhost/x'],
  ['data na raiz', 'data:text/plain,oi'],
  ['https na raiz', 'https://example.invalid/a.jpg'],
  ['BLOB maiúsculo', 'BLOB:http://localhost/x'],
  ['Data com maiúscula', 'Data:text/plain,oi'],
  ['blob com espaço antes', ' blob:http://localhost/x'],
  ['prefixo parcial', 'blo'],
  ['número', 42],
  ['zero', 0],
  ['booleano', false],
  ['objeto vazio', {}],
  ['array vazio', []],
  ['undefined dentro de array', [1, undefined, 'blob:x', null]],
  ['Date na raiz', new Date('2020-01-01T00:00:00.000Z')],
  ['Date aninhado', { a: { b: new Date('2020-01-01T00:00:00.000Z') } }],
  ['profundo', { a: [{ b: [{ c: 'data:x', d: 'ok' }] }] }],
  ['rascunho sintético', syntheticDraft],
];

describe('sanitizeMediaUrls: diferencial contra a implementação antiga', () => {
  it.each(corpus)('%s', (_name, input) => {
    const now = sanitizeMediaUrls(input);
    const before = legacySanitizeMediaUrls(input);
    expect(now).toStrictEqual(before);
    // Mesmo syncKey e mesmo payload gravado (JSON.stringify como em syncToDatabase).
    expect(JSON.stringify({ data: now, step: 2 })).toBe(JSON.stringify({ data: before, step: 2 }));
  });
});

describe('sanitizeMediaUrls: comportamento', () => {
  it('remove blob: e data: em objetos', () => {
    expect(sanitizeMediaUrls({ a: 'blob:x', b: 'data:y', c: 'https://example.invalid/c.jpg' }))
      .toStrictEqual({ c: 'https://example.invalid/c.jpg' });
  });

  it('em arrays, blob: e data: viram buracos (undefined), que o JSON grava como null', () => {
    const out = sanitizeMediaUrls(['blob:x', 'https://example.invalid/1.jpg', 'data:y']);
    expect(out).toStrictEqual([undefined, 'https://example.invalid/1.jpg', undefined]);
    expect(JSON.stringify(out)).toBe('[null,"https://example.invalid/1.jpg",null]');
  });

  it('preserva número, booleano, null e https', () => {
    expect(sanitizeMediaUrls({ n: 1, b: true, z: null, u: 'https://example.invalid' }))
      .toStrictEqual({ n: 1, b: true, z: null, u: 'https://example.invalid' });
  });

  it.todo('F-01: preservar Date no rascunho (Etapa 3)');

  // TEMPORÁRIO: documenta o defeito F-01 como ele é hoje. A Etapa 3 substitui este teste.
  it('F-01 (atual, temporário): Date vira objeto vazio', () => {
    expect(sanitizeMediaUrls(new Date('1990-05-17T00:00:00.000Z'))).toStrictEqual({});
  });
});
