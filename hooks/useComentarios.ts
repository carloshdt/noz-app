import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type Comentario = {
  id: string;
  recipe_id: string;
  user_id: string;
  texto: string;
  parent_id: string | null;
  created_at: string;
  autor: { nome: string; foto_url?: string };
  total_coracoes: number;
  meu_coracao: boolean;
  replies?: Comentario[];
};

type RawComment = {
  id: string;
  recipe_id: string;
  user_id: string;
  texto: string;
  parent_id: string | null;
  created_at: string;
};

type PerfilComentario = { id: string; nome?: string; foto_url?: string | null };

function flatten(comentarios: Comentario[]) {
  return comentarios.flatMap((c) => [c, ...(c.replies ?? [])]);
}

function updateCommentTree(
  comentarios: Comentario[],
  commentId: string,
  updater: (comentario: Comentario) => Comentario
): Comentario[] {
  return comentarios.map((comentario) => {
    if (comentario.id === commentId) return updater(comentario);
    if (comentario.replies?.length) {
      return { ...comentario, replies: updateCommentTree(comentario.replies, commentId, updater) };
    }
    return comentario;
  });
}

function toComentario(
  raw: RawComment,
  heartMap: Map<string, { total: number; meu: boolean }>,
  profileMap: Map<string, PerfilComentario>
): Comentario {
  const hearts = heartMap.get(raw.id) ?? { total: 0, meu: false };
  const autor = profileMap.get(raw.user_id);
  return {
    id: raw.id,
    recipe_id: raw.recipe_id,
    user_id: raw.user_id,
    texto: raw.texto,
    parent_id: raw.parent_id,
    created_at: raw.created_at,
    autor: {
      nome: autor?.nome ?? 'Usuario',
      foto_url: autor?.foto_url ?? undefined,
    },
    total_coracoes: hearts.total,
    meu_coracao: hearts.meu,
    replies: [],
  };
}

export function useComentarios(receitaId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [comentarios, setComentarios] = useState<Comentario[]>([]);

  const total = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  const carregar = useCallback(async () => {
    if (!receitaId) {
      setComentarios([]);
      return;
    }

    const { data: rawComments, error } = await supabase
      .from('comments')
      .select('id, recipe_id, user_id, texto, parent_id, created_at')
      .eq('recipe_id', receitaId)
      .order('created_at', { ascending: true });

    if (error || !rawComments) {
      if (error) console.warn('Erro ao carregar comentarios', error);
      return;
    }

    const comments = rawComments as unknown as RawComment[];
    const ids = comments.map((c) => c.id);
    const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
    const heartMap = new Map<string, { total: number; meu: boolean }>();
    const profileMap = new Map<string, PerfilComentario>();

    if (userIds.length > 0) {
      const { data: perfis, error: perfisError } = await supabase
        .from('profiles')
        .select('id, nome, foto_url')
        .in('id', userIds);

      if (perfisError) console.warn('Erro ao carregar perfis dos comentarios', perfisError);
      for (const perfil of (perfis ?? []) as PerfilComentario[]) {
        profileMap.set(perfil.id, perfil);
      }
    }

    if (ids.length > 0) {
      const { data: hearts, error: heartsError } = await supabase
        .from('comment_hearts')
        .select('comment_id, user_id')
        .in('comment_id', ids);

      if (heartsError) console.warn('Erro ao carregar coracoes dos comentarios', heartsError);

      for (const heart of hearts ?? []) {
        const cur = heartMap.get(heart.comment_id) ?? { total: 0, meu: false };
        heartMap.set(heart.comment_id, {
          total: cur.total + 1,
          meu: cur.meu || heart.user_id === userId,
        });
      }
    }

    const byId = new Map<string, Comentario>();
    for (const raw of comments) {
      byId.set(raw.id, toComentario(raw, heartMap, profileMap));
    }

    const roots: Comentario[] = [];
    for (const comentario of byId.values()) {
      if (comentario.parent_id && byId.has(comentario.parent_id)) {
        const parent = byId.get(comentario.parent_id)!;
        parent.replies = [...(parent.replies ?? []), comentario];
      } else {
        roots.push(comentario);
      }
    }

    setComentarios(roots);
  }, [receitaId, userId]);

  const addComentario = useCallback(async (texto: string, parentId?: string) => {
    if (!userId || !receitaId || !texto.trim()) return;

    let resolvedParentId = parentId;
    if (parentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('parent_id')
        .eq('id', parentId)
        .single();
      if (parent?.parent_id) {
        resolvedParentId = parent.parent_id;
      }
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        recipe_id: receitaId,
        user_id: userId,
        texto: texto.trim(),
        parent_id: resolvedParentId ?? null,
      })
      .select('id, recipe_id, user_id, texto, parent_id, created_at')
      .single();

    if (error || !data) {
      if (error) console.warn('Erro ao adicionar comentario', error);
      return;
    }

    const profileMap = new Map<string, PerfilComentario>();
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, nome, foto_url')
      .eq('id', userId)
      .single();
    if (perfil) profileMap.set(userId, perfil as PerfilComentario);

    const novo = toComentario(data as RawComment, new Map(), profileMap);
    if (!resolvedParentId) {
      setComentarios((prev) => [...prev, novo]);
      return;
    }

    setComentarios((prev) =>
      updateCommentTree(prev, resolvedParentId!, (comentario) => ({
        ...comentario,
        replies: [...(comentario.replies ?? []), novo],
      }))
    );
  }, [receitaId, userId]);

  const deletarComentario = useCallback(async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.warn('Erro ao deletar comentario', error);
      return;
    }
    setComentarios((prev) =>
      prev
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => r.id !== commentId),
        }))
    );
  }, []);

  const toggleCoracaoComentario = useCallback(async (commentId: string) => {
    if (!userId) return;

    const atual = flatten(comentarios).find((c) => c.id === commentId);
    if (!atual) return;

    const novoMeu = !atual.meu_coracao;
    setComentarios((prev) =>
      updateCommentTree(prev, commentId, (comentario) => ({
        ...comentario,
        meu_coracao: novoMeu,
        total_coracoes: novoMeu
          ? comentario.total_coracoes + 1
          : Math.max(0, comentario.total_coracoes - 1),
      }))
    );

    let error: any;
    if (novoMeu) {
      const res = await supabase
        .from('comment_hearts')
        .upsert(
          { comment_id: commentId, user_id: userId },
          { onConflict: 'comment_id,user_id', ignoreDuplicates: true }
        );
      error = res.error;
    } else {
      const res = await supabase
        .from('comment_hearts')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
      error = res.error;
    }

    if (error) {
      console.warn('Erro ao alternar coracao do comentario', error);
      setComentarios((prev) => updateCommentTree(prev, commentId, () => atual));
    }
  }, [comentarios, userId]);

  return { comentarios, total, carregar, addComentario, toggleCoracaoComentario, deletarComentario };
}
