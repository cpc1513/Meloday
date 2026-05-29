export {};

declare global {
  interface Window {
    melodayWindow?: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      isMaximized: () => Promise<boolean>;
      close: () => Promise<void>;
    };
  }
}
