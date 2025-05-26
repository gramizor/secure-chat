import { useCallback } from "react";
import { RTCPeer } from "@shared/api/RTCPeer";
import { WebSocketClient } from "@shared/api/WebSocketClient";
import { clearPending } from "@shared/lib/pendingManager";

export const useReconnect = ({
  uuid,
  wsRef,
  peer,
  status,
  connectedPeerId,
  setConnectedPeerId,
  setStatus,
  setMode,
  addLog,
  setLog,
  isReconnecting,
}: {
  uuid: string;
  wsRef: React.MutableRefObject<WebSocketClient | null>;
  peer: React.MutableRefObject<RTCPeer | null>;
  status: "idle" | "connecting" | "connected";
  connectedPeerId: string | null;
  setConnectedPeerId: (id: string | null) => void;
  setStatus: (status: "idle" | "connecting" | "connected") => void;
  setMode: (mode: "idle" | "host" | "join") => void;
  addLog: (msg: string, system: boolean) => void;
  setLog: (logs: string[]) => void;
  isReconnecting: React.RefObject<boolean>;
}) => {
  return useCallback(
    async (peerUuid: string) => {
      if (status === "connected") {
        const confirmSwitch = confirm(
          "Сейчас уже есть активный чат. Завершить его и начать новый?"
        );
        if (!confirmSwitch) return;

        if (connectedPeerId) {
          wsRef.current?.send({ type: "disconnect", to: connectedPeerId });
          addLog(`📤 отправлен disconnect для ${connectedPeerId}`, true);
        }

        peer.current?.close();
        peer.current = null;
        wsRef.current?.close(1000, "reconnect");
        wsRef.current = null;

        setConnectedPeerId(null);
        setStatus("idle");
        setMode("idle");
        setLog([]);
      }

      isReconnecting.current = true;
      setMode("host");
      setStatus("connecting");
      addLog(`🔁 подключение к ${peerUuid.slice(0, 6)}`, true);

      const ws = new WebSocketClient(uuid);
      wsRef.current = ws;

      let timeoutId: NodeJS.Timeout;

      ws.onOpen(async () => {
        const rtc = new RTCPeer(true);
        peer.current = rtc;

        rtc.onMessage(m => addLog(`${m}`, false));
        rtc.onOpen(() => {
          clearTimeout(timeoutId);
          setStatus("connected");
          setConnectedPeerId(peerUuid);
          addLog("🔗 канал открыт", true);
          clearPending(peerUuid);
        });
        rtc.onIceCandidate(c => {
          ws.send({ type: "ice-candidate", to: peerUuid, data: { candidate: c } });
        });

        rtc.onClose(() => {
          addLog("🚫 соединение закрыто", true);
          setConnectedPeerId(null);
          setStatus("idle");
          setMode("idle");
          setLog([]);
          peer.current = null;
        });

        ws.onClose(() => {
          addLog("📴 WebSocket отключен", true);
          setConnectedPeerId(null);
          setStatus("idle");
          setMode("idle");
          setLog([]);
          wsRef.current = null;
        });

        const { sdp, publicKey } = await rtc.createOffer();
        ws.send({ type: "offer", to: peerUuid, data: { sdp, publicKey } });
        addLog("⏳ offer отправлен — ждём ответ 6 сек...", true);

        timeoutId = setTimeout(() => {
          addLog("⌛ истекло время ожидания ответа — отмена подключения", true);
          peer.current?.close();
          peer.current = null;
          wsRef.current?.close(1000, "reconnect");
          wsRef.current = null;
          setConnectedPeerId(null);
          setStatus("idle");
          setMode("idle");
          setLog([]);
        }, 7000);
      });
    },
    [
      uuid,
      wsRef,
      peer,
      status,
      connectedPeerId,
      setConnectedPeerId,
      setStatus,
      setMode,
      addLog,
      setLog,
    ]
  );
};
