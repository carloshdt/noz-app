export function traduzirErroAuth(msg?: string): string {
  if (!msg) return 'Ocorreu um erro. Tente novamente.';
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Este email já está cadastrado.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.';
  if (msg.includes('Invalid email')) return 'Email inválido.';
  if (msg.includes('Password should be')) return 'Senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde e tente novamente.';
  if (msg.includes('User not found')) return 'Usuário não encontrado.';
  if (msg.includes('sending') || msg.includes('recovery')) return 'Não foi possível enviar o email. Verifique o endereço e tente novamente.';
  return msg;
}
