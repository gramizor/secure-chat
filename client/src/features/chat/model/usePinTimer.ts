import { useEffect, useRef, useState } from "react";
import { generatePin } from "@shared/lib/generatePin";

export const usePinTimer = (mode: 'idle' | 'host' | 'join') => {
  const [pin, setPin] = useState(generatePin());
  const pinTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode !== 'join') return;

    const interval = setInterval(() => {
      const newPin = generatePin();
      setPin(newPin);
      console.log('[Pin] обновлён:', newPin);
    }, 60000);

    pinTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [mode]);

  const clearPinTimer = () => {
    if (pinTimerRef.current) {
      clearInterval(pinTimerRef.current);
      pinTimerRef.current = null;
      console.log('[Pin] таймер остановлен — соединение установлено');
    }
  };

  return { pin, setPin, clearPinTimer };
};