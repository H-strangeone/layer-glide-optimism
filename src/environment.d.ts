
export {};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      selectedAddress?: string;
      networkVersion?: string;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener: (event: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (event: string) => void;
    };
  }
}
