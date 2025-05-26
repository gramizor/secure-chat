import {useEffect} from "react";
import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {connectionExists, saveConnectionHistory} from "@shared/lib/db";
import {addPending, clearPending} from "@shared/lib/pendingManager";
import {resetConnection} from "@shared/lib/resetConnection.ts";

interface Props {
    status: 'idle' | 'connecting' | 'connected';
    mode: 'idle' | 'host' | 'join';
    uuid: string;
    pin: string;
    peer: React.MutableRefObject<RTCPeer | null>;
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    connectedPeerId: string | null;
    setConnectedPeerId: (id: string | null) => void;
    setStatus: (status: 'idle' | 'connecting' | 'connected') => void;
    setMode: (mode: 'idle' | 'host' | 'join') => void;
    setLog: (logs: string[]) => void;
    addLog: (msg: string) => void;
    loadChatHistory: () => void;
    clearPinTimer: () => void;
}

export const useHandleIncomingMessages = ({
                                              status,
                                              mode,
                                              uuid,
                                              pin,
                                              peer,
                                              wsRef,
                                              connectedPeerId,
                                              setConnectedPeerId,
                                              setStatus,
                                              setMode,
                                              setLog,
                                              addLog,
                                              loadChatHistory,
                                              clearPinTimer,
                                          }: Props) => {
    useEffect(() => {
        if (wsRef.current) {
            addLog('[WS] сокет уже есть — пропускаем');
            return;
        }

        const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
        wsRef.current = ws;

        ws.onMessage(async (msg: any) => {
            addLog('[WS] получено сообщение: ' + msg.type);

            switch (msg.type) {
                case 'offer': {
                    if (status === 'connected' || peer.current || connectedPeerId) {
                        if (msg.from !== connectedPeerId) {
                            addPending(msg.from);
                            addLog(`📥 уже есть соединение, входящий offer от ${msg.from} сохранён в pending`);
                        } else {
                            addLog(`⚠️ повторный offer от текущего peer ${msg.from} — игнор`);
                        }
                        return;
                    }

                    addLog(`📩 offer от ${msg.from}`);
                    peer.current = new RTCPeer(false);
                    addLog('[RTC] создан peer (receiver)');

                    peer.current.onMessage(m => addLog(`👤 ${m}`));
                    peer.current.onOpen(async () => {
                        setConnectedPeerId(msg.from);
                        setStatus('connected');
                        addLog('🔗 канал открыт');
                        clearPinTimer();
                        clearPending(msg.from);

                        const alreadySaved = await connectionExists(msg.from);
                        if (!alreadySaved) {
                            const name = prompt("Введите имя чата") ?? "Без имени";
                            saveConnectionHistory(msg.from, name);
                            loadChatHistory();
                        }
                    });

                    peer.current.onIceCandidate(c => wsRef.current?.send({
                        type: 'ice-candidate',
                        to: msg.from,
                        data: {candidate: c}
                    }));

                    peer.current.onClose?.(() => {
                        addLog('🚫 соединение прервано — по ошибке канала');
                        peer.current?.close();
                        wsRef.current?.close(1000, 'datachannel error');
                        setConnectedPeerId(null);
                        setStatus('idle');
                        setMode('idle');
                        setLog([]);
                    });

                    const answer = await peer.current.acceptOffer(msg.data.sdp, msg.data.publicKey);
                    wsRef.current?.send({type: 'answer', to: msg.from, data: answer});
                    break;
                }

                case 'answer': {
                    addLog(`📩 answer от ${msg.from}`);
                    await peer.current?.acceptAnswer(msg.data.sdp, msg.data.publicKey);
                    addLog('[RTC] answer принят (host)');

                    const alreadySaved = await connectionExists(msg.from);
                    if (!alreadySaved) {
                        const name = prompt("Введите имя чата") ?? "Без имени";
                        saveConnectionHistory(msg.from, name);
                        loadChatHistory();
                    }
                    break;
                }

                case 'ice-candidate': {
                    await peer.current?.addIceCandidate(msg.data.candidate);
                    addLog('[ICE] кандидат добавлен');
                    break;
                }
                case 'disconnect': {
                    addLog(`🔌 собеседник завершил соединение`);
                    resetConnection(wsRef, peer, setConnectedPeerId, setStatus, setMode, setLog);
                    break;
                }
            }
        });

        return () => {
            addLog('[WS] cleanup — закрытие соединения');
            peer.current?.close();
            ws.close(1000, 'cleanup');
        };
    }, [mode, uuid]);
};