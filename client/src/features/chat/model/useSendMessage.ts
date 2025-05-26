import { useCallback } from "react";
import { RTCPeer } from "@shared/api/RTCPeer";

export const useSendMessage = (peerRef: React.MutableRefObject<RTCPeer | null>, addLog: (msg: string) => void) => {
  return useCallback((input: string, status: 'idle' | 'connecting' | 'connected', clearInput: () => void) => {
    if (!input.trim() || status !== 'connected') return;
    peerRef.current?.sendMessage(input);
    addLog(`🧍 ${input}`);
    clearInput();
  }, [peerRef, addLog, status]);
};