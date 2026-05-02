-- supabase/migrations/002_feed_social.sql

-- Receitas públicas por padrão
ALTER TABLE public.receitas ALTER COLUMN publica SET DEFAULT true;

-- Rastreamento de origem nas cópias
ALTER TABLE public.receitas
  ADD COLUMN fonte_receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  ADD COLUMN fonte_atualizada_em timestamptz;

-- Contador denormalizado no perfil do criador
ALTER TABLE public.profiles
  ADD COLUMN total_importacoes int DEFAULT 0 NOT NULL;

-- Perfil público: leitura aberta para autenticados
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfil público leitura" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Função para incrementar total_importacoes com segurança
CREATE OR REPLACE FUNCTION public.incrementar_importacoes(perfil_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET total_importacoes = total_importacoes + 1
  WHERE id = perfil_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.incrementar_importacoes(uuid) TO anon, authenticated;
