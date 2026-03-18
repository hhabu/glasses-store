import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 2200;

export default function useActionToast(durationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState({ message: "", key: 0 });
  const timerRef = useRef(null);

  const showToast = useCallback(
    (message) => {
      if (!message) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const nextKey = Date.now();
      setToast({ message, key: nextKey });

      timerRef.current = setTimeout(() => {
        setToast((prev) =>
          prev.key === nextKey ? { message: "", key: 0 } : prev
        );
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast };
}
