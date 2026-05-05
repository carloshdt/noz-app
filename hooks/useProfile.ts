import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { uploadImagem } from '../lib/uploadImagem';
import { ProfileStats } from '../lib/badges';
import { Profile } from '../types';
import { useAuth } from './useAuth';

const statsVazias: ProfileStats = {
  totalReceitas: 0,
  totalSalvas: 0,
  totalCoracoes: 0,
  totalComentarios: 0,
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats>(statsVazias);

  useEffect(() => {
    loadProfile(user);
  }, [user?.id]);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setStats(statsVazias);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      await loadStats(u.id, (data as Profile).total_importacoes ?? 0);
    } else if (error?.code === 'PGRST116') {
      const nome = u.user_metadata?.nome ?? u.email?.split('@')[0] ?? 'Usuário';
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: u.id, nome })
        .select()
        .single();
      setProfile((created as Profile) ?? null);
      await loadStats(u.id, (created as Profile | null)?.total_importacoes ?? 0);
    } else {
      setProfile(null);
      setStats(statsVazias);
    }
    setLoading(false);
  };

  const loadStats = async (userId: string, totalSalvas: number) => {
    const { data: receitasData } = await supabase
      .from('receitas')
      .select('id')
      .eq('user_id', userId);

    const receitaIds = (receitasData ?? []).map((r: any) => r.id);
    if (receitaIds.length === 0) {
      setStats({ totalReceitas: 0, totalSalvas, totalCoracoes: 0, totalComentarios: 0 });
      return;
    }

    const [{ count: coracoes }, { count: comentarios }] = await Promise.all([
      supabase
        .from('recipe_hearts')
        .select('id', { count: 'exact', head: true })
        .in('recipe_id', receitaIds),
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .in('recipe_id', receitaIds),
    ]);

    setStats({
      totalReceitas: receitaIds.length,
      totalSalvas,
      totalCoracoes: coracoes ?? 0,
      totalComentarios: comentarios ?? 0,
    });
  };

  const updateProfile = async (nome: string, fotoUri?: string) => {
    if (!user) return;
    let foto_url = profile?.foto_url;

    if (fotoUri) {
      foto_url = await uploadImagem(fotoUri, 'avatars', `${user.id}/avatar.jpg`);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ nome, foto_url })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  return { profile, loading, stats, updateProfile, refreshProfile: () => loadProfile(user) };
}
