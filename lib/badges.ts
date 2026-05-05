import { CATEGORIAS } from '../constants/categorias';
import { Receita } from '../types';

export type ProfileStats = {
  totalReceitas: number;
  totalSalvas: number;
  totalCoracoes: number;
  totalComentarios: number;
};

export type ProfileBadge = {
  id: string;
  label: string;
  icon: string;
  grupo: 'solo' | 'categoria' | 'influencia';
  unlocked: boolean;
  descricao: string;
};

export function computarBadges(receitas: Receita[], stats: ProfileStats): ProfileBadge[] {
  const badges: ProfileBadge[] = [];
  const total = receitas.length;
  const categorias = new Set(receitas.flatMap((r) => r.categorias));
  const receitaCompleta = receitas.some((r) => !!r.imagem && r.ingredientes.length > 0 && r.instrucoes.length > 0);

  badges.push(
    {
      id: 'primeira-receita',
      label: 'Primeira receita',
      icon: '🍳',
      grupo: 'solo',
      descricao: 'Criar 1 receita',
      unlocked: total >= 1,
    },
    {
      id: 'receita-completa',
      label: 'Receita completa',
      icon: '📸',
      grupo: 'solo',
      descricao: 'Receita com foto, ingredientes e preparo',
      unlocked: receitaCompleta,
    },
    {
      id: '5-receitas',
      label: '5 receitas',
      icon: '🌿',
      grupo: 'solo',
      descricao: 'Criar 5 receitas',
      unlocked: total >= 5,
    },
    {
      id: '10-receitas',
      label: '10 receitas',
      icon: '🌳',
      grupo: 'solo',
      descricao: 'Criar 10 receitas',
      unlocked: total >= 10,
    },
    {
      id: 'chef-diversificado',
      label: 'Chef versátil',
      icon: '🎨',
      grupo: 'solo',
      descricao: 'Criar receitas em 3 categorias',
      unlocked: categorias.size >= 3,
    },
    {
      id: '50-receitas',
      label: '50 receitas',
      icon: '🏅',
      grupo: 'solo',
      descricao: 'Criar 50 receitas',
      unlocked: total >= 50,
    }
  );

  const porCategoria = new Map<string, number>();
  for (const receita of receitas) {
    for (const categoria of receita.categorias) {
      porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + 1);
    }
  }

  for (const categoria of CATEGORIAS.filter((c) => c !== 'Todas')) {
    const count = porCategoria.get(categoria) ?? 0;
    if (count === 0) continue;
    badges.push(
      {
        id: `5-${categoria}`,
        label: `5 ${categoria}`,
        icon: '🥉',
        grupo: 'categoria',
        descricao: `Criar 5 receitas de ${categoria}`,
        unlocked: count >= 5,
      },
      {
        id: `25-${categoria}`,
        label: `25 ${categoria}`,
        icon: '🥈',
        grupo: 'categoria',
        descricao: `Criar 25 receitas de ${categoria}`,
        unlocked: count >= 25,
      },
      {
        id: `50-${categoria}`,
        label: `50 ${categoria}`,
        icon: '🥇',
        grupo: 'categoria',
        descricao: `Criar 50 receitas de ${categoria}`,
        unlocked: count >= 50,
      }
    );
  }

  badges.push(
    {
      id: 'primeira-salva',
      label: '1ª salva',
      icon: '⭐',
      grupo: 'influencia',
      descricao: 'Uma pessoa salvou sua receita',
      unlocked: stats.totalSalvas >= 1,
    },
    {
      id: '10-salvas',
      label: '10 salvas',
      icon: '🔥',
      grupo: 'influencia',
      descricao: '10 pessoas salvaram suas receitas',
      unlocked: stats.totalSalvas >= 10,
    },
    {
      id: '50-salvas',
      label: '50 salvas',
      icon: '🏆',
      grupo: 'influencia',
      descricao: '50 pessoas salvaram suas receitas',
      unlocked: stats.totalSalvas >= 50,
    },
    {
      id: 'primeiro-coracao',
      label: '1º coração',
      icon: '💛',
      grupo: 'influencia',
      descricao: 'Receber 1 coração em suas receitas',
      unlocked: stats.totalCoracoes >= 1,
    },
    {
      id: '10-coracoes',
      label: '10 corações',
      icon: '✨',
      grupo: 'influencia',
      descricao: 'Receber 10 corações em suas receitas',
      unlocked: stats.totalCoracoes >= 10,
    },
    {
      id: 'primeiro-comentario',
      label: '1º comentário',
      icon: '💬',
      grupo: 'influencia',
      descricao: 'Receber 1 comentário em suas receitas',
      unlocked: stats.totalComentarios >= 1,
    }
  );

  return badges;
}
