import {useCallback} from "react";
import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {clearPending} from "@shared/lib/pendingManager";

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
                             }: {
    uuid: string;
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    peer: React.MutableRefObject<RTCPeer | null>;
    status: "idle" | "connecting" | "connected";
    connectedPeerId: string | null;
    setConnectedPeerId: (id: string | null) => void;
    setStatus: (status: "idle" | "connecting" | "connected") => void;
    setMode: (mode: "idle" | "host" | "join") => void;
    addLog: (msg: string) => void;
    setLog: (logs: string[]) => void;
}) => {
    return useCallback(
        async (peerUuid: string) => {
            if (status === "connected") {
                const confirmSwitch = confirm(
                    "Сейчас уже есть активный чат. Завершить его и начать новый?"
                );
                if (!confirmSwitch) return;

                if (connectedPeerId) {
                    wsRef.current?.send({type: "disconnect", to: connectedPeerId});
                    addLog(`📤 отправлен disconnect для ${connectedPeerId}`);
                }

                peer.current?.close();
                peer.current = null;
                wsRef.current?.close(1000, "из реконекта");
                wsRef.current = null;
                setConnectedPeerId(null);
                setStatus("idle");
            }

            setMode("host");
            setStatus("connecting");
            addLog(`🔁 подключение к ${peerUuid.slice(0, 6)}`);

            const ws = new WebSocketClient(uuid);
            wsRef.current = ws;

            let timeoutId: NodeJS.Timeout;

            ws.onOpen(async () => {
                const rtc = new RTCPeer(true);
                peer.current = rtc;

                rtc.onMessage((m) => addLog(`👤 ${m}`));
                rtc.onOpen(() => {
                    clearTimeout(timeoutId);
                    setStatus("connected");
                    setConnectedPeerId(peerUuid);
                    addLog("🔗 канал открыт");
                    clearPending(peerUuid);
                });
                rtc.onIceCandidate((c) => {
                    ws.send({type: "ice-candidate", to: peerUuid, data: {candidate: c}});
                });

                const {sdp, publicKey} = await rtc.createOffer();
                ws.send({type: "offer", to: peerUuid, data: {sdp, publicKey}});
                addLog("⏳ offer отправлен — ждём ответ 6 сек...");

                timeoutId = setTimeout(() => {
                    addLog("⌛ истекло время ожидания ответа — отмена подключения");
                    peer.current?.close();
                    peer.current = null;
                    wsRef.current?.close(1000, "обнуляем после простоя");
                    wsRef.current = null;
                    setStatus("idle");
                    setMode("idle");
                    setConnectedPeerId(null);
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
