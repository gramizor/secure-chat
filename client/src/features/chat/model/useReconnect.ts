import { useCallback } from "react";
import { RTCPeer } from "@shared/api/RTCPeer";
import { WebSocketClient } from "@shared/api/WebSocketClient";
import { clearPending } from "@shared/lib/pendingManager";

export const useReconnect = ({
  uuid,
  setMode,
  setStatus,
  setConnectedPeerId,
  peerRef,
  wsRef,
  addLog
}: {
  uuid: string;
  setMode: (v: 'idle' | 'host' | 'join') => void;
  setStatus: (v: 'idle' | 'connecting' | 'connected') => void;
  setConnectedPeerId: (v: string | null) => void;
  peerRef: React.MutableRefObject<RTCPeer | null>;
  wsRef: React.MutableRefObject<WebSocketClient | null>;
  addLog: (msg: string) => void;
}) => {
  return useCallback(async (peerUuid: string) => {
    setMode('host');
    setStatus('connecting');
    addLog(`🔁 подключение к ${peerUuid.slice(0, 6)}`);

    const ws = new WebSocketClient(uuid);
    wsRef.current = ws;

    let timeoutId: NodeJS.Timeout;

    ws.onOpen(async () => {
      const rtc = new RTCPeer(true);
      peerRef.current = rtc;

      rtc.onMessage(m => addLog(`👤 ${m}`));
      rtc.onOpen(() => {
        clearTimeout(timeoutId);
        setStatus('connected');
        setConnectedPeerId(peerUuid);
        addLog('🔗 канал открыт');
        clearPending(peerUuid);
      });
      rtc.onIceCandidate(c => {
        ws.send({ type: 'ice-candidate', to: peerUuid, data: { candidate: c } });
      });

      const { sdp, publicKey } = await rtc.createOffer();
      ws.send({ type: 'offer', to: peerUuid, data: { sdp, publicKey } });
      addLog('⏳ offer отправлен — ждём ответ 6 сек...');

      timeoutId = setTimeout(() => {
        addLog('⌛ истекло время ожидания ответа — отмена подключения');
        rtc.close();
        peerRef.current = null;
        wsRef.current?.close(1000, 'обнуляем после простоя');
        wsRef.current = null;
        setStatus('idle');
        setMode('idle');
        setConnectedPeerId(null);
      }, 7000);
    });
  }, [uuid, wsRef, peerRef, addLog]);
};