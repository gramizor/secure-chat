import { useState } from "react";

export const useChatLogs = () => {
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg: string, system = false) => {
    if (!system) setLog(prev => [...prev, msg]);
    console.log(msg);
  };
  const clearLog = () => setLog([]);

  return { log, addLog, clearLog, setLog };
};
