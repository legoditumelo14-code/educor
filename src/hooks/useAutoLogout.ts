// src/hooks/useAutoLogout.ts
import { useEffect, useState } from "react";

export const useAutoLogout = (timeout = 10 * 60 * 1000) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        setShowWarning(true); // show popup first
      }, timeout);
    };

    // Activity listeners
    ["mousemove", "keydown", "click", "scroll"].forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      clearTimeout(timer);
      ["mousemove", "keydown", "click", "scroll"].forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [timeout]);

  return { showWarning, setShowWarning };
};
