import { expect, it } from 'vitest';
import { splitSavedMedia } from '@/lib/savedMedia';

// F-04 (Etapa 3c): a lista plana de mídia de um teste enviado volta para a vista (ou teste) de onde veio.
const A = '00000000-0000-0000-0000-0000000000f1';
const signed = (path: string) => `https://projeto.test/storage/v1/object/sign/assessment-media/${path}?token=sintetico`;

it('URL assinada e caminho puro voltam para a vista pelo nome do arquivo', () => {
  const photo = signed(`${A}/ohs_anterior_anterior_photo_1.jpg`);
  const video = `${A}/ohs_lateral_lateral_video_2.mp4`;
  expect(splitSavedMedia([photo, video], ['ohs_anterior_anterior', 'ohs_lateral_lateral'])).toStrictEqual({
    slots: { ohs_anterior_anterior: { photoUrl: photo }, ohs_lateral_lateral: { videoUrl: video } },
    unmatched: [],
  });
});

it('o que não cabe em nenhuma vista livre fica à parte, na ordem em que veio', () => {
  const first = `${A}/teste_a_photo_1.jpg`;
  const second = `${A}/teste_a_photo_2.jpg`;
  const other = `${A}/arquivo_antigo_sintetico.jpg`;
  expect(splitSavedMedia([first, other, second], ['teste_a'])).toStrictEqual({
    slots: { teste_a: { photoUrl: first } },
    unmatched: [other, second],
  });
});

it('prefixo parecido não confunde as vistas (lateral não é left_lateral)', () => {
  const sls = `${A}/sls_left_lateral_left_lateral_photo_1.jpg`;
  expect(splitSavedMedia([sls], ['sls_left_anterior_left_anterior', 'sls_left_lateral_left_lateral']).slots)
    .toStrictEqual({ sls_left_lateral_left_lateral: { photoUrl: sls } });
});

it('sem lista, ou com itens que não são texto, não quebra', () => {
  expect(splitSavedMedia(null, ['x'])).toStrictEqual({ slots: {}, unmatched: [] });
  expect(splitSavedMedia([1, { a: 1 }], ['x'])).toStrictEqual({ slots: {}, unmatched: [] });
});
