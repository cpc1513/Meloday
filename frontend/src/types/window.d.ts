export {};

declare global {
  interface Window {
    melodayWindow?: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      close: () => Promise<void>;
    };
  }
}
