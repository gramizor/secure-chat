import { useCallback } from "react";
import { getConnectionHistory } from "@shared/lib/db";

export const useChatHistory = (setChatHistory: (v: { uuid: string, chatName: string }[]) => void) => {
  return useCallback(async () => {
    const history = await getConnectionHistory();
    setChatHistory(history);
    console.log('[DB] история загружена:', history);
  }, [setChatHistory]);
};