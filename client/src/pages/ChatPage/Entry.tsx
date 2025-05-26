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
import {generatePin} from "@shared/lib/generatePin.ts";
import {CustomInput} from "@shared/ui/Input/Input.tsx";
import {CustomButton} from "@shared/ui/Button/Button.tsx";

export const EntryPage = () => {
    const [input, setInput] = useState("");
    const [targetId, setTargetId] = useState("");
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
    const [chatHistory, setChatHistory] = useState<{ uuid: string, chatName: string }[]>([]);
    const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);

    const endRef = useRef<HTMLDivElement | null>(null);
    const wsRef = useRef<WebSocketClient | null>(null);
    const peer = useRef<RTCPeer | null>(null);
    const isReconnecting = useRef(false);

    const {log, addLog, setLog} = useChatLogs();
    const {pin, setPin, clearPinTimer} = usePinTimer(mode);
    const uuid = useMemo(() => getOrGenerateUUID(), []);
    const loadChatHistory = useChatHistory(setChatHistory);
    const send = useSendMessage(peer, addLog);
    const startAsHost = useStartAsHost({wsRef, peerRef: peer, targetId, setStatus, addLog, isReconnecting});

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
        isReconnecting,
    });

    useEffect(() => {
        if (wsRef.current || status === 'connected') return;

        const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
        wsRef.current = ws;
        console.log('[EntryPage] WebSocket создан:', {uuid, pin, mode});

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
            peer.current = null;
        };
    }, [mode, uuid]);

    useEffect(() => {
        endRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [log]);

    useEffect(() => {
        if (mode !== 'join') return;
        isReconnecting.current = false;
        const interval = setInterval(() => {
            const newPin = generatePin();
            setPin(newPin);
            console.log('[PIN] Обновлён:', newPin);
        }, 60000);
        return () => clearInterval(interval);
    }, [mode]);

    useEffect(() => {
        loadChatHistory();
    }, []);

    useEffect(() => {
        const handleUnload = () => {
            if (wsRef.current && wsRef.current.getSocketReadyState() === WebSocket.OPEN) {
                wsRef.current.send({ type: 'disconnect', to: connectedPeerId });
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [connectedPeerId]);

    return (<Layout
        header={<Header/>}
        sidebar={<Sidebar
            chatHistory={chatHistory}
            setMode={setMode}
            reconnect={reconnect}
            connectedPeerId={connectedPeerId}
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
                peer.current?.close();
                peer.current = null;
                wsRef.current?.close(1000, 'manual disconnect');
                wsRef.current = null;
                setConnectedPeerId(null);
                setStatus("idle");
                setMode("idle");
                setLog([]);
            }}
        />}
        main={<div style={{display: "flex", flexDirection: "column", flex: 1, height: "100%"}}>
            {mode === "join" && !isReconnecting.current && (<div style={{
                backgroundColor: '#330000', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: 'white'
            }}>
                <p>Скопируй этот PIN и отправь другу:</p>
                <h2 style={{
                    fontWeight: 'bold', fontSize: '2rem', letterSpacing: '0.1em', margin: '0.5rem 0'
                }}>{pin}</h2>
                <CustomButton onClick={() => navigator.clipboard.writeText(pin)}>📋 Скопировать</CustomButton>
            </div>)}

            {mode === "host" && !isReconnecting.current && (<div style={{
                backgroundColor: '#330000', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'
            }}>
                <p>Вставь UUID друга:</p>
                <CustomInput
                    value={targetId}
                    onChange={setTargetId}
                    placeholder="UUID подключающегося"
                    style={{width: '100%'}}
                    rows={1}
                />
                <CustomButton
                    style={{marginTop: '1rem'}}
                    onClick={startAsHost}
                    isDisabled={!targetId.trim()}
                >
                    🚀 Начать соединение
                </CustomButton>
            </div>)}

            <div style={{
                flex: 1, overflowY: "auto", display: "flex", flexDirection: "column-reverse", paddingBottom: "1rem"
            }}>
                <div style={{paddingBottom: "1rem"}}>
                    {log.length === 0 ? (
                        <div style={{color: "#aaa", fontSize: "1rem", margin: "auto", textAlign: "center"}}>
                            {status === 'connecting' ? 'Устанавливаем соединение...' : status === 'connected' ? 'Начните общаться!' : 'Здесь будут сообщения'}
                        </div>) : (<>
                        {log.map((entry, i) => {
                            const isMine = entry.startsWith("\ud83e\udecd");
                            const text = isMine ? entry.slice(2) : entry;

                            return (<div
                                key={i}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: isMine ? "flex-end" : "flex-start",
                                    maxWidth: 500,
                                    marginBottom: "0.5rem"
                                }}
                            >
                                                <span style={{fontSize: "0.75rem", color: "#ccc", marginBottom: 4}}>
                                                    {isMine ? "Вы:" : "Собеседник:"}
                                                </span>
                                <div style={{
                                    background: "white",
                                    color: "black",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "12px",
                                    wordBreak: "break-word"
                                }}>
                                    {text}
                                </div>
                            </div>);
                        })}
                        <div ref={endRef}/>
                    </>)}
                </div>
            </div>

            <div style={{display: "flex", gap: 8, marginTop: '1rem'}}>
                <CustomInput
                    value={input}
                    onChange={setInput}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send(input, status, () => setInput(""));
                        }
                    }}
                    isDisabled={status !== "connected"}
                />
                <CustomButton
                    onClick={() => send(input, status, () => setInput(""))}
                    isDisabled={status !== "connected"}
                >
                    Отправить
                </CustomButton>
            </div>
        </div>}
    />);
};
