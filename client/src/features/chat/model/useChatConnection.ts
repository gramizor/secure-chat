import { useRef, useEffect } from "react";
import { WebSocketClient } from "@shared/api/WebSocketClient";
import { RTCPeer } from "@shared/api/RTCPeer";
import { generatePin } from "@shared/lib/generatePin";
import { getOrGenerateUUID } from "@shared/lib/generateUUID";

export const useChatConnection = ({ mode, onLog }: { mode: 'host' | 'join' | 'idle', onLog: (msg: string) => void }) => {
  const uuid = getOrGenerateUUID();
  const pin = generatePin();
  const wsRef = useRef<WebSocketClient | null>(null);
  const peer = useRef<RTCPeer | null>(null);

  useEffect(() => {
    const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
    wsRef.current = ws;
    onLog('[useChatConnection] WebSocket создан');

    return () => {
      peer.current?.close();
      wsRef.current?.close(1000, 'cleanup');
    };
  }, [mode]);

  return { wsRef, peer, uuid, pin };
};