import { computarBadges, ProfileStats } from '../../lib/badges';
import { Receita } from '../../types';

const statsZero: ProfileStats = {
  totalReceitas: 0,
  totalSalvas: 0,
  totalCoracoes: 0,
  totalComentarios: 0,
};

function makeReceita(overrides: Partial<Receita> = {}): Receita {
  return {
    id: 'r1',
    user_id: 'u1',
    nome: 'Teste',
    categorias: ['Carnes'],
    tempoPreparo: 30,
    porcoes: 2,
    dificuldade: 'Facil' as any,
    ingredientes: [],
    instrucoes: [],
    criadaEm: '2026-01-01',
    ...overrides,
  };
}

describe('computarBadges', () => {
  it('desbloqueia primeira receita com 1 receita', () => {
    const badges = computarBadges([makeReceita()], statsZero);
    expect(badges.find((b) => b.id === 'primeira-receita')?.unlocked).toBe(true);
  });

  it('desbloqueia receita completa com foto, ingredientes e instrucoes', () => {
    const badges = computarBadges([
      makeReceita({
        imagem: 'url.jpg',
        ingredientes: [{ nome: 'Sal', quantidade: 1, unidade: 'colher' }],
        instrucoes: [{ texto: 'Misturar' }],
      }),
    ], statsZero);

    expect(badges.find((b) => b.id === 'receita-completa')?.unlocked).toBe(true);
  });

  it('desbloqueia chef versatil com 3 categorias', () => {
    const badges = computarBadges([
      makeReceita({ id: 'r1', categorias: ['Carnes'] }),
      makeReceita({ id: 'r2', categorias: ['Massas'] }),
      makeReceita({ id: 'r3', categorias: ['Sobremesas'] }),
    ], statsZero);

    expect(badges.find((b) => b.id === 'chef-diversificado')?.unlocked).toBe(true);
  });

  it('cria badges de categoria apenas para categorias usadas', () => {
    const badges = computarBadges([makeReceita({ categorias: ['Carnes'] })], statsZero);
    expect(badges.some((b) => b.id === '5-Carnes')).toBe(true);
    expect(badges.some((b) => b.id === '5-Massas')).toBe(false);
  });

  it('desbloqueia badges de influencia por stats', () => {
    const badges = computarBadges([], {
      totalReceitas: 0,
      totalSalvas: 1,
      totalCoracoes: 1,
      totalComentarios: 1,
    });

    expect(badges.find((b) => b.id === 'primeira-salva')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'primeiro-coracao')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'primeiro-comentario')?.unlocked).toBe(true);
  });
});
