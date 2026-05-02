export const CATEGORIAS = [
  'Todas',
  'Carnes',
  'Massas',
  'Lanches',
  'Sobremesas',
  'Saladas',
  'Vegetariano',
  'Sopas',
  'Bebidas',
  'Frutos do Mar',
  'Café da Manhã',
  'Pães e Bolos',
] as const;

export type Categoria = typeof CATEGORIAS[number];
