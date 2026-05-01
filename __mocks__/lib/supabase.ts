export const supabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signInWithOAuth: jest.fn(),
    setSession: jest.fn(),
  },
  from: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  })),
};
