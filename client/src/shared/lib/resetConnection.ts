import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {RTCPeer} from "@shared/api/RTCPeer.ts";

export function resetConnection(
    wsRef: React.MutableRefObject<WebSocketClient | null>,
    peer: React.MutableRefObject<RTCPeer | null>,
    setConnectedPeerId: (id: string | null) => void,
    setStatus: (status: 'idle' | 'connecting' | 'connected') => void,
    setMode: (mode: 'idle' | 'host' | 'join') => void,
    setLog: (logs: string[]) => void
) {
    if (wsRef.current) {
        wsRef.current.close(1000, 'reset connection');
        wsRef.current = null;
    }

    if (peer.current) {
        peer.current.close();
        peer.current = null;
    }

    setConnectedPeerId(null);
    setStatus('idle');
    setMode('idle');
    setLog([]);
}
