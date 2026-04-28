export type Dificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type Ingrediente = {
  nome: string;
  quantidade: number;
  unidade: string;
};

export type Receita = {
  id: string;
  nome: string;
  categoria: string;
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  ingredientes: Ingrediente[];
  instrucoes: string[];
  criadaEm: string;
};

export type CardapioDia = {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  receitaId: string | null;
};

export type ItemCompra = {
  nome: string;
  quantidade: number;
  unidade: string;
  categoria: string;
};
