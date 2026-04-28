export const CATEGORIAS = [
  'Todas',
  'Carnes',
  'Vegetariano',
  'Massas',
  'Sopas',
  'Saladas',
  'Sobremesas',
  'Lanches',
  'Bebidas',
] as const;

export type Categoria = typeof CATEGORIAS[number];
