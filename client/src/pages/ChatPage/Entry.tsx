import {useEffect, useState} from "react";
import {Layout} from "./Layout";
import {Header} from "./Header";
import {Sidebar} from "./Sidebar";

import {useChatLogs} from "@features/chat/model/useChatLogs";
import {useChatConnection} from "@features/chat/model/useChatConnection";
import {useSendMessage} from "@features/chat/model/useSendMessage";
import {useStartAsHost} from "@features/chat/model/useStartAsHost";
import {useReconnect} from "@features/chat/model/useReconnect";
import {useChatHistory} from "@features/chat/model/useChatHistory";
import {useHandleIncomingMessages} from "@features/chat/model/useHandleIncomingMessages";
import {usePinTimer} from "@features/chat/model/usePinTimer";
import {useUnloadCleanup} from "@features/chat/model/useUnloadCleanup.ts";

export const EntryPage = () => {
    const [input, setInput] = useState<string>("");
    const [targetId, setTargetId] = useState<string>("");
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
    const [chatHistory, setChatHistory] = useState<{ uuid: string, chatName: string }[]>([]);
    const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);

    const {log, addLog, clearLog, setLog} = useChatLogs();
    const {wsRef, peer, uuid} = useChatConnection({mode, onLog: addLog});
    const {pin, clearPinTimer} = usePinTimer(mode);

    const send = useSendMessage(peer, addLog);
    const startAsHost = useStartAsHost({wsRef, peerRef: peer, targetId, setStatus, addLog});
    const reconnect = useReconnect({uuid, wsRef, peerRef: peer, setStatus, setMode, setConnectedPeerId, addLog});
    const loadChatHistory = useChatHistory(setChatHistory);

    useEffect(() => {
        loadChatHistory();
    }, []);

    useHandleIncomingMessages({
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
    });

    useUnloadCleanup({
        peerRef: peer,
        wsRef,
        connectedPeerId,
        addLog,
    });


    return (
        <>
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
                    />
                }
                main={
                    <div style={{color: 'white'}}>
                        {mode === 'join' && (
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

                        {mode === 'host' && (
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

                        <div style={{marginBottom: '1rem'}}>
                            {log.map((entry, index) => (
                                <div key={index} style={{
                                    background: 'white',
                                    color: 'black',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    marginBottom: '0.25rem'
                                }}>
                                    {entry}
                                </div>
                            ))}
                        </div>

                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input, status, () => setInput(""))}
                            placeholder="Введите сообщение..."
                            style={{padding: '0.5rem', borderRadius: '8px', width: '100%'}}
                        />
                        <button onClick={() => send(input, status, () => setInput(""))}>Отправить</button>

                        <h3>История чатов</h3>
                        <ul>
                            {chatHistory.map(chat => (
                                <li key={chat.uuid}>
                                    <button onClick={() => reconnect(chat.uuid)}>
                                        {chat.chatName}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                }
            />
        </>
    );
};
