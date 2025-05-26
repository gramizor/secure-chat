import { useState } from "react";

export const useChatLogs = () => {
  const [log, setLog] = useState<string[]>([]);
  const addLog = (entry: string) => setLog(prev => [...prev, entry]);
  const clearLog = () => setLog([]);

  return { log, addLog, clearLog, setLog };
};