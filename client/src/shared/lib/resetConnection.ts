import type {MutableRefObject} from "react";
import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {RTCPeer} from "@shared/api/RTCPeer.ts";

export interface ResetConnectionParams {
    wsRef: MutableRefObject<WebSocketClient | null>;
    peerRef: MutableRefObject<RTCPeer | null>;
    setConnectedPeerId: (id: string | null) => void;
    setStatus: (status: 'idle' | 'connecting' | 'connected') => void;
    setMode: (mode: 'idle' | 'host' | 'join') => void;
    setLog: (logs: string[]) => void;
    connectedPeerId?: string | null;
    bumpConnectionVersion?: () => void;
}

export function resetConnection({
                                    wsRef, peerRef, setConnectedPeerId, setStatus, setMode, setLog, connectedPeerId,
                                }: Omit<ResetConnectionParams, 'bumpConnectionVersion'>): void {
    if (connectedPeerId && wsRef.current?.getSocketReadyState() === WebSocket.OPEN) {
        wsRef.current.send({type: 'disconnect', to: connectedPeerId});
    }

    peerRef.current?.close();
    peerRef.current = null;

    wsRef.current?.close(1000, 'reset connection');
    wsRef.current = null;

    setConnectedPeerId(null);
    setStatus('idle');
    setMode('idle');
    setLog([]);
}

export function fullResetConnection(params: ResetConnectionParams): void {
    resetConnection(params);
    params.bumpConnectionVersion?.();
}

export function bindConnectionWatchers(peer: RTCPeer, ws: WebSocketClient, resetParams: ResetConnectionParams): void {
    peer.onClose(() => {
        console.log("👀 peer.onClose → сбрасываем соединение");
        fullResetConnection(resetParams);
    });

    ws.onClose(() => {
        console.log("👀 ws.onClose → сбрасываем соединение");
        fullResetConnection(resetParams);
    });
}
