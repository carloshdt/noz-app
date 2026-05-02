import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export async function uploadImagem(
  localUri: string,
  bucket: string,
  path: string
): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { upsert: true, contentType });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
}
