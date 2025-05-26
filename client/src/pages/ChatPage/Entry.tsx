import {useEffect, useMemo, useRef, useState} from "react";
import {Layout} from "./Layout";
import {Header} from "./Header";
import {Sidebar} from "./Sidebar";

import {useChatLogs} from "@features/chat/model/useChatLogs";
import {useSendMessage} from "@features/chat/model/useSendMessage";
import {useStartAsHost} from "@features/chat/model/useStartAsHost";
import {useReconnect} from "@features/chat/model/useReconnect";
import {useChatHistory} from "@features/chat/model/useChatHistory";
import {usePinTimer} from "@features/chat/model/usePinTimer";
import {getOrGenerateUUID} from "@shared/lib/generateUUID.ts";
import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {RTCPeer} from "@shared/api/RTCPeer.ts";
import {handleMessage} from "@shared/lib/handleMessage.ts";

export const EntryPage = () => {
    const [input, setInput] = useState<string>("");
    const [targetId, setTargetId] = useState<string>("");
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
    const [chatHistory, setChatHistory] = useState<{ uuid: string, chatName: string }[]>([]);
    const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);

    const {log, addLog, setLog} = useChatLogs();
    const {pin, clearPinTimer} = usePinTimer(mode);
    const uuid = useMemo(() => getOrGenerateUUID(), []);
    const wsRef = useRef<WebSocketClient | null>(null);
    const peer = useRef<RTCPeer | null>(null);

    const loadChatHistory = useChatHistory(setChatHistory);
    const send = useSendMessage(peer, addLog);
    const startAsHost = useStartAsHost({wsRef, peerRef: peer, targetId, setStatus, addLog});

    useEffect(() => {
        if (wsRef.current || status === 'connected') return;

        const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
        wsRef.current = ws;
        console.log('[EntryPage] WebSocket создан:', { uuid, pin, mode });

        ws.onMessage(async (msg) => {
            handleMessage({
                msg,
                selfId: uuid,
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
            });
        });

        return () => {
            console.log('[EntryPage] cleanup');
            peer.current?.close();
            ws.close(1000, 'unmount cleanup');
            wsRef.current = null;
        };
    }, [mode, uuid]);


    const reconnect = useReconnect({
        uuid,
        wsRef,
        peer,
        status,
        connectedPeerId,
        setConnectedPeerId,
        setStatus,
        setMode,
        addLog,
        setLog,
    });

    useEffect(() => {
        loadChatHistory();
    }, []);

    return (
        <Layout
            header={
                <Header
                    peer={peer}
                    wsRef={wsRef}
                    setConnectedPeerId={setConnectedPeerId}
                    setStatus={setStatus}
                    setLog={setLog}
                    setMode={setMode}
                />
            }
            sidebar={
                <Sidebar
                    chatHistory={chatHistory}
                    setMode={setMode}
                    reconnect={reconnect}
                    onDeleteAll={() => {
                        indexedDB.deleteDatabase("chatHistory");
                        localStorage.removeItem("my-app-uuid");
                        setChatHistory([]);
                        setConnectedPeerId(null);
                        setStatus("idle");
                        setMode("idle");
                        setLog([]);
                    }}
                    onFinishChat={() => {
                        wsRef.current?.send({type: "disconnect", to: connectedPeerId});
                        peer.current?.close();
                        wsRef.current?.close(1000, "Завершение чата");
                        setConnectedPeerId(null);
                        setStatus("idle");
                        setMode("idle");
                        setLog([]);
                    }}
                />
            }
            main={
                <div style={{display: "flex", flexDirection: "column", flex: 1, height: "100%"}}>
                    {mode === "join" && (
                        <div style={{
                            backgroundColor: '#330000',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            color: 'white'
                        }}>
                            <p>Скопируй этот PIN и отправь другу:</p>
                            <h2 style={{
                                fontWeight: 'bold',
                                fontSize: '2rem',
                                letterSpacing: '0.1em',
                                margin: '0.5rem 0'
                            }}>{pin}</h2>
                            <button onClick={() => navigator.clipboard.writeText(pin)}>📋 Скопировать</button>
                        </div>
                    )}

                    {mode === "host" && (
                        <div style={{
                            backgroundColor: '#330000',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            <p>Вставь UUID друга:</p>
                            <input
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="UUID"
                                style={{width: '100%', padding: '0.5rem', borderRadius: '8px'}}
                            />
                            <button
                                style={{marginTop: '1rem'}}
                                onClick={startAsHost}
                                disabled={!targetId.trim()}
                            >
                                🚀 Начать соединение
                            </button>
                        </div>
                    )}

                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column-reverse",
                        paddingBottom: "1rem"
                    }}>
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                paddingBottom: "1rem",
                            }}
                        >
                            {log.map((entry, i) => {
                                const isMine = entry.startsWith("🧍");
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            background: "white",
                                            color: "black",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "12px",
                                            marginBottom: "0.5rem",
                                            maxWidth: 500,
                                            alignSelf: isMine ? "flex-end" : "flex-start",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {entry}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{marginTop: "1rem"}}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input, status, () => setInput(""))}
                            placeholder="Введите сообщение..."
                            style={{padding: '0.5rem', borderRadius: '8px', width: '100%'}}
                        />
                        <button onClick={() => send(input, status, () => setInput(""))} style={{marginTop: '0.5rem'}}>
                            Отправить
                        </button>
                    </div>
                </div>
            }
        />
    );
};
