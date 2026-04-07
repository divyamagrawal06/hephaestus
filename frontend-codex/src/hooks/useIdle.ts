import { useEffect } from "react";

export const useIdle = (callback: () => void, timeout = 1200) => {
  useEffect(() => {
    let handle: number | null = null;
    const win = window as unknown as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number | null) => void;
    };

    if (win.requestIdleCallback) {
      handle = win.requestIdleCallback(callback, { timeout });
      return () => win.cancelIdleCallback?.(handle);
    }

    const timer = win.setTimeout(callback, Math.min(600, timeout));
    return () => win.clearTimeout(timer);
  }, [callback, timeout]);
};
