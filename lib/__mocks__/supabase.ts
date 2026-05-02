const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
};

const mockStorageChain = {
  upload: jest.fn().mockResolvedValue({ error: null }),
  getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/avatar.jpg' } }),
};

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
    exchangeCodeForSession: jest.fn(),
  },
  from: jest.fn(() => ({ ...mockChain })),
  storage: {
    from: jest.fn(() => ({ ...mockStorageChain })),
  },
};
