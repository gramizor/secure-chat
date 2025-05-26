import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {connectionExists, saveConnectionHistory} from "@shared/lib/db";
import {addPending, clearPending} from "@shared/lib/pendingManager";
import {bindConnectionWatchers} from "@shared/lib/resetConnection";

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
    addLog: (txt: string, system: boolean) => void;
    clearPinTimer: () => void;
    loadChatHistory: () => void;
    bumpConnectionVersion?: () => void;
    connectedPeerId?: string | null;
}

export const handleMessage = ({
                                  msg,
                                  selfId,
                                  peer,
                                  wsRef,
                                  status,
                                  setConnectedPeerId,
                                  setStatus,
                                  setMode,
                                  setLog,
                                  addLog,
                                  clearPinTimer,
                                  loadChatHistory,
                                  bumpConnectionVersion,
                              }: HandleMessageParams) => {
    switch (msg.type) {
        case "offer": {
            if (status === "connected" || peer.current || wsRef.current?.getSocketReadyState() !== 1) {
                if (msg.from !== selfId) {
                    addPending(msg.from);
                    addLog(`📥 уже есть соединение, входящий offer от ${msg.from} сохранён в pending`, true);
                } else {
                    addLog(`⚠️ повторный offer от текущего peer ${msg.from} — игнор`, true);
                }
                return;
            }

            addLog(`📩 offer от ${msg.from}`, true);
            peer.current = new RTCPeer(false);
            addLog("[RTC] создан peer (receiver)", true);

            peer.current.onMessage((m) => addLog(`${m}`, false));
            peer.current.onOpen(async () => {
                setConnectedPeerId(msg.from);
                setStatus("connected");
                addLog("🔗 канал открыт", true);
                clearPinTimer();
                clearPending(msg.from);

                const exists = await connectionExists(msg.from);
                if (!exists) {
                    const name = prompt("Введите имя чата") ?? "Без имени";
                    await saveConnectionHistory(msg.from, name);
                    loadChatHistory();
                }
            });

            peer.current.onIceCandidate((c) => wsRef.current?.send({
                type: "ice-candidate",
                to: msg.from,
                data: {candidate: c}
            }));

            bindConnectionWatchers(peer.current, wsRef.current!, {
                wsRef,
                peerRef: peer,
                setConnectedPeerId,
                setStatus,
                setMode,
                setLog,
                connectedPeerId: msg.from,
                bumpConnectionVersion,
            });

            peer.current.acceptOffer(msg.data.sdp, msg.data.publicKey).then((answer) => {
                wsRef.current?.send({type: "answer", to: msg.from, data: answer});
            });
            break;
        }

        case "answer": {
            addLog(`📩 answer от ${msg.from}`, true);
            peer.current?.acceptAnswer(msg.data.sdp, msg.data.publicKey);
            addLog("[RTC] answer принят (host)", true);

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
                addLog("[ICE] кандидат добавлен", true);
            });
            break;
        }

        case "disconnect": {
            bumpConnectionVersion?.();
            break;
        }
    }
};
