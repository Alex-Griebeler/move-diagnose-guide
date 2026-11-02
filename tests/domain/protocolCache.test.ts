import { describe, expect, it } from 'vitest';
import { cachedProtocol, canonicalJson, requestKey } from '@/lib/protocolCache';

// F-15: o protocolo gerado é reaproveitado só para o mesmo pedido, e só se ainda passar na validação.
const protocol = {
  protocolName: 'Protocolo sintético', priorityLevel: 'low', frequencyPerWeek: 2, durationWeeks: 6, summary: '',
  exercises: [{ name: 'Ponte', phase: 'activation', bodyRegion: '', targetMuscles: [], sets: 0, reps: '', instructions: '', rationale: '', priority: 0 }],
};

describe('canonicalJson', () => {
  it('ordena as chaves dos objetos, em qualquer nível', () => {
    expect(canonicalJson({ b: 1, a: { d: [{ y: 1, x: 2 }], c: 3 } })).toBe('{"a":{"c":3,"d":[{"x":2,"y":1}]},"b":1}');
  });

  it('mantém a ordem das listas e descarta campos indefinidos, como o JSON enviado', () => {
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]));
    expect(canonicalJson({ a: undefined, b: 1 })).toBe(JSON.stringify({ b: 1 }));
  });
});

describe('requestKey', () => {
  it('é o SHA-256 do texto canônico: igual para o mesmo pedido, em qualquer ordem de chaves', async () => {
    const key = await requestKey({ a: 1, b: [1, 2] });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await requestKey({ b: [1, 2], a: 1 })).toBe(key);
    expect(await requestKey({ a: 1, b: [2, 1] })).not.toBe(key);
  });
});

describe('cachedProtocol', () => {
  it('devolve o protocolo guardado só com a mesma chave', () => {
    expect(cachedProtocol({ inputKey: 'k', protocol }, 'k')).toStrictEqual(protocol);
    expect(cachedProtocol({ inputKey: 'k', protocol }, 'outra')).toBeNull();
    expect(cachedProtocol({ inputKey: 'k', protocol }, null)).toBeNull();
  });

  it('recusa rascunho ausente, de outro formato ou com protocolo inválido', () => {
    expect(cachedProtocol(null, 'k')).toBeNull();
    expect(cachedProtocol([], 'k')).toBeNull();
    expect(cachedProtocol({ inputKey: 'k', protocol: { ...protocol, priorityLevel: 'urgente' } }, 'k')).toBeNull();
  });
});
