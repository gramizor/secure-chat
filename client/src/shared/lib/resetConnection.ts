import type {MutableRefObject} from "react";
import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {RTCPeer} from "@shared/api/RTCPeer.ts";

export function resetConnection(
    wsRef: MutableRefObject<WebSocketClient | null>,
    peer: MutableRefObject<RTCPeer | null>,
    setConnectedPeerId: (id: string | null) => void,
    setStatus: (status: 'idle' | 'connecting' | 'connected') => void,
    setMode: (mode: 'idle' | 'host' | 'join') => void,
    setLog: (logs: string[]) => void,
    connectedPeerId?: string
) {
    if (connectedPeerId && wsRef.current?.getSocketReadyState() === WebSocket.OPEN) {
        wsRef.current.send({ type: 'disconnect', to: connectedPeerId });
    }

    peer.current?.close();
    peer.current = null;

    wsRef.current?.close(1000, 'reset connection');
    wsRef.current = null;

    setConnectedPeerId(null);
    setStatus('idle');
    setMode('idle');
    setLog([]);
}
