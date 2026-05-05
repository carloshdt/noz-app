declare const jest: {
  fn: (...args: any[]) => any;
  mock: (...args: any[]) => any;
  clearAllMocks: () => any;
  resetModules: () => any;
};

declare namespace jest {
  type Mock = any;
}

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: any;
