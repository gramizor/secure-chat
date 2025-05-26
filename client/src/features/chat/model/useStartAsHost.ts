import { useCallback } from "react";
import { RTCPeer } from "@shared/api/RTCPeer";
import { WebSocketClient } from "@shared/api/WebSocketClient";

export const useStartAsHost = ({
  wsRef,
  peerRef,
  targetId,
  setStatus,
  addLog,
}: {
  wsRef: React.MutableRefObject<WebSocketClient | null>;
  peerRef: React.MutableRefObject<RTCPeer | null>;
  targetId: string;
  setStatus: (s: 'idle' | 'connecting' | 'connected') => void;
  addLog: (msg: string) => void;
}) => {
  return useCallback(() => {
    setStatus('connecting');
    addLog(`🧭 ты инициатор — жди подключение`);

    wsRef.current?.onOpen(async () => {
      addLog('📡 WebSocket готов, создаём RTC');
      const peer = new RTCPeer(true);
      peerRef.current = peer;

      peer.onMessage(m => addLog(`👤 ${m}`));
      peer.onOpen(() => {
        setStatus('connected');
        addLog('🔗 канал открыт');
      });
      peer.onIceCandidate(c => {
        wsRef.current?.send({
          type: 'ice-candidate',
          to: targetId,
          data: { candidate: c },
        });
      });

      const { sdp, publicKey } = await peer.createOffer();
      addLog('[RTC] offer создан (host)');
      wsRef.current?.send({ type: 'offer', to: targetId, data: { sdp, publicKey } });
    });
  }, [wsRef, peerRef, targetId, setStatus, addLog]);
};