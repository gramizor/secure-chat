import {useCallback} from "react";
import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {clearPending} from "@shared/lib/pendingManager";
import {bindConnectionWatchers} from "@shared/lib/resetConnection";

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
                                 bumpConnectionVersion
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
    bumpConnectionVersion: () => void;
}) => {
    return useCallback(async (peerUuid: string) => {
        if (status === "connected") {
            const confirmSwitch = confirm("Сейчас уже есть активный чат. Завершить его и начать новый?");
            if (!confirmSwitch) return;

            if (connectedPeerId) {
                wsRef.current?.send({type: "disconnect", to: connectedPeerId});
                addLog(`📤 отправлен disconnect для ${connectedPeerId}`, true);
            }

            bumpConnectionVersion();
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

            rtc.onMessage((m) => addLog(`${m}`, false));
            rtc.onOpen(() => {
                clearTimeout(timeoutId);
                setStatus("connected");
                setConnectedPeerId(peerUuid);
                addLog("🔗 канал открыт", true);
                clearPending(peerUuid);
            });
            rtc.onIceCandidate((c) => {
                ws.send({type: "ice-candidate", to: peerUuid, data: {candidate: c}});
            });

            bindConnectionWatchers(rtc, ws, {
                wsRef,
                peerRef: peer,
                setConnectedPeerId,
                setStatus,
                setMode,
                setLog,
                connectedPeerId: peerUuid,
                bumpConnectionVersion
            });

            const {sdp, publicKey} = await rtc.createOffer();
            ws.send({type: "offer", to: peerUuid, data: {sdp, publicKey}});
            addLog("⏳ offer отправлен — ждём ответ 6 сек...", true);

            timeoutId = setTimeout(() => {
                bumpConnectionVersion();
            }, 7000);
        });
    }, [uuid, wsRef, peer, status, connectedPeerId, setConnectedPeerId, setStatus, setMode, addLog, setLog, bumpConnectionVersion]);
};
