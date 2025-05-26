import {useCallback} from "react";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {RTCPeer} from "@shared/api/RTCPeer";
import {handleMessage} from "@shared/lib/handleMessage";

interface StartAsJoinParams {
    uuid: string;
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    peerRef: React.MutableRefObject<RTCPeer | null>;
    pin?: string;
    status: "idle" | "connecting" | "connected";
    setConnectedPeerId: (id: string | null) => void;
    setStatus: (status: "idle" | "connecting" | "connected") => void;
    setMode: (mode: "idle" | "host" | "join") => void;
    setLog: (logs: string[]) => void;
    addLog: (msg: string, system: boolean) => void;
    clearPinTimer: () => void;
    loadChatHistory: () => void;
}

export const useStartAsJoin = ({
                                   uuid,
                                   wsRef,
                                   peerRef,
                                   pin,
                                   status,
                                   setConnectedPeerId,
                                   setStatus,
                                   setMode,
                                   setLog,
                                   addLog,
                                   clearPinTimer,
                                   loadChatHistory,
                               }: StartAsJoinParams) => {
    return useCallback(() => {
        if (wsRef.current) {
            addLog("[useStartAsJoin] WebSocket уже существует — пропуск", true);
            return;
        }

        addLog(`[useStartAsJoin] WebSocket создаётся`, true);

        const ws = new WebSocketClient(uuid, pin);
        wsRef.current = ws;

        ws.onOpen(() => {
            addLog("[useStartAsJoin] соединение установлено", true);

            ws.send({type: "join", from: uuid, uuid, pin});
            addLog("[useStartAsJoin] join отправлен", true);
        });

        ws.onMessage((msg: any) => {
            handleMessage({
                msg,
                selfId: uuid,
                peer: peerRef,
                wsRef,
                status,
                setConnectedPeerId,
                setStatus,
                setMode,
                setLog,
                addLog,
                clearPinTimer,
                loadChatHistory,
            });
        });

    }, [uuid, pin, wsRef, peerRef, status]);
};
