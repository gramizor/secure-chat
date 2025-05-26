import {type MutableRefObject, type RefObject, useCallback} from "react";
import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";

export const useStartAsHost = ({
                                   wsRef,
                                   peerRef,
                                   targetId,
                                   setStatus,
                                   addLog,
                                   isReconnecting
                               }: {
    wsRef: MutableRefObject<WebSocketClient | null>;
    peerRef: MutableRefObject<RTCPeer | null>;
    targetId: string;
    setStatus: (s: 'idle' | 'connecting' | 'connected') => void;
    addLog: (msg: string, system: boolean) => void;
    isReconnecting: RefObject<boolean>
}) => {
    return useCallback(() => {
        isReconnecting.current = false
        setStatus('connecting');
        addLog(`🧭 ты инициатор — жди подключение`, true);

        wsRef.current?.onOpen(async () => {
            addLog('📡 WebSocket готов, создаём RTC', true);
            const peer = new RTCPeer(true);
            peerRef.current = peer;

            peer.onMessage(m => addLog(`${m}`, false));
            peer.onOpen(() => {
                setStatus('connected');
                addLog('🔗 канал открыт', true);
            });
            peer.onIceCandidate(c => {
                wsRef.current?.send({
                    type: 'ice-candidate',
                    to: targetId,
                    data: {candidate: c},
                });
            });

            const {sdp, publicKey} = await peer.createOffer();
            addLog('[RTC] offer создан (host)', true);
            wsRef.current?.send({type: 'offer', to: targetId, data: {sdp, publicKey}});
        });
    }, [wsRef, peerRef, targetId, setStatus, addLog]);
};