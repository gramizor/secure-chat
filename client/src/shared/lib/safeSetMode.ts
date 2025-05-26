import {RTCPeer} from "@shared/api/RTCPeer.ts";
import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {resetConnection} from "@shared/lib/resetConnection.ts";
import type {MutableRefObject} from "react";

export function safeSetMode(
    nextMode: 'idle' | 'host' | 'join',
    currentStatus: 'idle' | 'connecting' | 'connected',
    wsRef: MutableRefObject<WebSocketClient | null>,
    peer: MutableRefObject<RTCPeer | null>,
    setConnectedPeerId: (id: string | null) => void,
    setStatus: (s: typeof currentStatus) => void,
    setMode: (m: typeof nextMode) => void,
    setLog: (logs: string[]) => void
) {
    if (currentStatus === 'connected') {
        const confirmDisconnect = confirm("Сейчас есть активное соединение. Завершить его?");
        if (!confirmDisconnect) return;
        resetConnection(wsRef, peer, setConnectedPeerId, setStatus, setMode, setLog);
    }

    setMode(nextMode);
}
