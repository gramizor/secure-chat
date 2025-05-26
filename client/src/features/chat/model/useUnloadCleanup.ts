import { useEffect } from "react";
import { RTCPeer } from "@shared/api/RTCPeer";
import { WebSocketClient } from "@shared/api/WebSocketClient";

interface Props {
  peerRef: React.MutableRefObject<RTCPeer | null>;
  wsRef: React.MutableRefObject<WebSocketClient | null>;
  connectedPeerId: string | null;
  addLog: (msg: string) => void;
}

export const useUnloadCleanup = ({ peerRef, wsRef, connectedPeerId, addLog }: Props) => {
  useEffect(() => {
    const handleUnload = () => {
      if (connectedPeerId && wsRef.current?.getSocketReadyState() === WebSocket.OPEN) {
        wsRef.current.send({ type: 'disconnect', to: connectedPeerId });
        addLog(`📤 disconnect перед закрытием вкладки (${connectedPeerId})`);
      }
      peerRef.current?.close();
      wsRef.current?.close(1000, 'unload');
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [connectedPeerId, peerRef, wsRef]);
};