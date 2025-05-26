import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {connectionExists, saveConnectionHistory} from "@shared/lib/db";
import {addPending, clearPending} from "@shared/lib/pendingManager";

interface HandleMessageParams {
    msg: any;
    selfId: string;
    peer: React.MutableRefObject<RTCPeer | null>;
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    status: 'idle' | 'connecting' | 'connected';
    setConnectedPeerId: (id: string | null) => void;
    setStatus: (s: 'idle' | 'connecting' | 'connected') => void;
    setMode: (m: 'idle' | 'host' | 'join') => void;
    setLog: (logs: string[]) => void;
    addLog: (txt: string) => void;
    clearPinTimer: () => void;
    loadChatHistory: () => void;
}

export const handleMessage = ({
                                  msg, selfId, peer, wsRef, status,
                                  setConnectedPeerId, setStatus, setMode, setLog,
                                  addLog, clearPinTimer, loadChatHistory,
                              }: HandleMessageParams & { msg: any }) => {
    switch (msg.type) {
        case "offer": {
            if (status === "connected" || peer.current || wsRef.current?.getSocketReadyState() !== 1) {
                if (msg.from !== selfId) {
                    addPending(msg.from);
                    addLog(`📥 уже есть соединение, входящий offer от ${msg.from} сохранён в pending`);
                } else {
                    addLog(`⚠️ повторный offer от текущего peer ${msg.from} — игнор`);
                }
                return;
            }

            addLog(`📩 offer от ${msg.from}`);
            peer.current = new RTCPeer(false);
            addLog("[RTC] создан peer (receiver)");

            peer.current.onMessage((m) => addLog(`👤 ${m}`));
            peer.current.onOpen(async () => {
                setConnectedPeerId(msg.from);
                setStatus("connected");
                addLog("🔗 канал открыт");
                clearPinTimer();
                clearPending(msg.from);

                const exists = await connectionExists(msg.from);
                if (!exists) {
                    const name = prompt("Введите имя чата") ?? "Без имени";
                    await saveConnectionHistory(msg.from, name);
                    loadChatHistory();
                }
            });

            peer.current.onIceCandidate((c) =>
                wsRef.current?.send({type: "ice-candidate", to: msg.from, data: {candidate: c}})
            );

            peer.current.onClose?.(() => {
                addLog("🚫 соединение прервано — по ошибке канала");
                peer.current?.close();
                wsRef.current?.close(1000, "datachannel error");
                wsRef.current = null;
                peer.current = null;
                setConnectedPeerId(null);
                setStatus("idle");
                setMode("idle");
                setLog([]);
            });

            peer.current.acceptOffer(msg.data.sdp, msg.data.publicKey).then((answer) => {
                wsRef.current?.send({type: "answer", to: msg.from, data: answer});
            });
            break;
        }

        case "answer": {
            addLog(`📩 answer от ${msg.from}`);
            peer.current?.acceptAnswer(msg.data.sdp, msg.data.publicKey);
            addLog("[RTC] answer принят (host)");

            connectionExists(msg.from).then((exists) => {
                if (!exists) {
                    const name = prompt("Введите имя чата") ?? "Без имени";
                    saveConnectionHistory(msg.from, name).then(loadChatHistory);
                }
            });
            break;
        }

        case "ice-candidate": {
            peer.current?.addIceCandidate(msg.data.candidate).then(() => {
                addLog("[ICE] кандидат добавлен");
            });
            break;
        }

        case "disconnect": {
            addLog(`🔌 собеседник завершил соединение`);
            peer.current?.close();
            peer.current = null;
            wsRef.current?.close(1000, "disconnect");
            wsRef.current = null;
            setConnectedPeerId(null);
            setStatus("idle");
            setMode("idle");
            setLog([]);
            break;
        }
    }
};
