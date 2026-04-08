import { useEffect, useState } from "react";

export function useIdle(delay = 1200) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeout = 0;
    let idleHandle = 0;

    const complete = () => setIsIdle(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(complete, { timeout: delay });
      return () => {
        if (idleWindow.cancelIdleCallback) {
          idleWindow.cancelIdleCallback(idleHandle);
        }
      };
    }

    timeout = window.setTimeout(complete, delay);
    return () => window.clearTimeout(timeout);
  }, [delay]);

  return isIdle;
}
