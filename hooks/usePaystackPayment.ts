import { useCallback } from 'react';

interface PaystackConfig {
  key: string;
  email: string;
  amount: number; // in kobo (amount * 100)
  ref: string;
  metadata?: Record<string, any>;
  onSuccess: (response: any) => void;
  onClose: () => void;
  currency?: string;
  channels?: string[];
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
        closeIframe: () => void;
      };
    };
  }
}

export const usePaystackPayment = (config: PaystackConfig) => {
  const initializePayment = useCallback(() => {
    if (typeof window !== 'undefined' && window.PaystackPop) {
      const handler = window.PaystackPop.setup(config);
      handler.openIframe();
    } else {
      console.error("PaystackPop is not available. Ensure the Paystack script is loaded.");
      // Optionally, show an error toast here if PaystackPop is not loaded
    }
  }, [config]);

  return initializePayment;
};
