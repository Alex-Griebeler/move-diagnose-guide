import { describe, expect, it } from 'vitest';
import { restoreDraftDate, sanitizeMediaUrls } from '@/lib/draftSanitizer';

// Cópia literal da implementação que estava dentro de useWizardPersistence (main 9ecf185),
// fora do useCallback. Serve de referência: fora de Date, o resultado não pode mudar.
// A única diferença intencional é Date (F-01, Etapa 3a), coberta no bloco "F-01" abaixo.
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

const { birthDate: syntheticBirthDate, ...syntheticDraftWithoutDate } = syntheticDraft;

// Sem Date: aqui a implementação nova tem de ser idêntica à antiga.
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
  ['profundo', { a: [{ b: [{ c: 'data:x', d: 'ok' }] }] }],
  ['rascunho sintético sem data', syntheticDraftWithoutDate],
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

});

// F-01: antes, Date virava {} no rascunho e, na retomada, Invalid Date (a tela da anamnese caía).
describe('F-01: datas no rascunho', () => {
  const iso = '1990-05-17T00:00:00.000Z';

  it('Date válido vira a ISO de toISOString, na raiz, aninhado e em array', () => {
    expect(sanitizeMediaUrls(new Date(iso))).toBe(iso);
    expect(sanitizeMediaUrls({ a: { b: new Date(iso) } })).toStrictEqual({ a: { b: iso } });
    expect(sanitizeMediaUrls([new Date(iso), 'blob:x'])).toStrictEqual([iso, undefined]);
  });

  it('Date inválido some: undefined na raiz, chave ausente em objeto, null no JSON de array', () => {
    expect(sanitizeMediaUrls(new Date(NaN))).toBeUndefined();
    expect(sanitizeMediaUrls({ birthDate: new Date(NaN), n: 1 })).toStrictEqual({ n: 1 });
    expect(JSON.stringify(sanitizeMediaUrls([new Date(NaN)]))).toBe('[null]');
  });

  it('rascunho sintético: igual à implementação antiga, mais a data em ISO', () => {
    expect(sanitizeMediaUrls(syntheticDraft)).toStrictEqual({
      ...(legacySanitizeMediaUrls(syntheticDraftWithoutDate) as Record<string, unknown>),
      birthDate: syntheticBirthDate.toISOString(),
    });
  });

  it.each([
    ['meia-noite UTC (data vinda do perfil)', new Date('1990-05-15T00:00:00.000Z')],
    ['meia-noite local (data escolhida no calendário)', new Date(1990, 4, 15)],
  ])('ida e volta pelo banco preserva o instante: %s', (_name, date) => {
    const stored = JSON.parse(JSON.stringify({ birthDate: sanitizeMediaUrls(date) }));
    expect(restoreDraftDate(stored.birthDate)?.getTime()).toBe(date.getTime());
  });

  it('restoreDraftDate aceita a ISO gravada pelo sanitizador', () => {
    const restored = restoreDraftDate('1990-05-15T03:00:00.000Z');
    expect(restored).toBeInstanceOf(Date);
    expect(restored?.toISOString()).toBe('1990-05-15T03:00:00.000Z');
  });

  it.each([
    ['objeto vazio (rascunho já corrompido)', {}],
    ['null', null],
    ['undefined', undefined],
    ['número', 42],
    ['"0" (válido para new Date: ano 2000)', '0'],
    ['texto qualquer', 'abc'],
    ['data sem hora', '1990-05-15'],
    ['mês 13', '2020-13-45T00:00:00.000Z'],
    ['dia inexistente (new Date rolaria para 01/03)', '2020-02-30T00:00:00.000Z'],
  ])('restoreDraftDate recusa %s', (_name, value) => {
    expect(restoreDraftDate(value)).toBeUndefined();
  });
});
