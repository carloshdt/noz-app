export type Dificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type Instrucao = {
  texto: string;
  imagem?: string;
};

export type Ingrediente = {
  id?: string;
  nome: string;
  quantidade: number;
  unidade: string;
};

export type Receita = {
  id: string;
  user_id?: string;
  nome: string;
  categorias: string[];
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  ingredientes: Ingrediente[];
  instrucoes: Instrucao[];
  publica?: boolean;
  criadaEm: string;
  atualizadaEm?: string;
  _pendingSync?: boolean;
};

export type Profile = {
  id: string;
  nome: string;
  foto_url?: string;
  criado_em: string;
};

export type CardapioDia = {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  receitaId: string | null;
  porcoes?: number;
};

export type ItemCompra = {
  nome: string;
  quantidade: number;
  unidade: string;
  receitas: string[];
};
