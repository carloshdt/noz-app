import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile(user);
  }, [user?.id]);

  const loadProfile = async (u: User | null) => {
    if (!u) { setProfile(null); setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    } else if (error?.code === 'PGRST116') {
      const nome = u.user_metadata?.nome ?? u.email?.split('@')[0] ?? 'Usuário';
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: u.id, nome })
        .select()
        .single();
      setProfile((created as Profile) ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const updateProfile = async (nome: string, fotoUri?: string) => {
    if (!user) return;
    let foto_url = profile?.foto_url;

    if (fotoUri) {
      const ext = fotoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(fotoUri, {
        encoding: 'base64' as any,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { upsert: true, contentType });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      foto_url = publicUrl;
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

  return { profile, loading, updateProfile, refreshProfile: () => loadProfile(user) };
}
