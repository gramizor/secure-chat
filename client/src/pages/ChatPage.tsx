// ChatPage.tsx
import {useEffect, useRef, useState} from 'react';
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {RTCPeer} from "@shared/api/RTCPeer";
import {generatePin} from "@shared/lib/generatePin";
import {connectionExists, getConnectionHistory, saveConnectionHistory} from "@shared/lib/db";
import {getOrGenerateUUID} from "@shared/lib/generateUUID";
import {addPending, clearPending, isPending} from '@shared/lib/pendingManager'

const ChatPage = () => {
    const uuid = getOrGenerateUUID();
    const [pin, setPin] = useState(generatePin());
    const [targetId, setTargetId] = useState('');
    const [input, setInput] = useState('');
    const [log, setLog] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
    const [chatHistory, setChatHistory] = useState<{ uuid: string, chatName: string }[]>([]);
    const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);

    const wsRef = useRef<WebSocketClient | null>(null);
    const peer = useRef<RTCPeer | null>(null);
    const pinTimerRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (txt: string) => setLog(prev => [...prev, txt]);

    useEffect(() => {
        const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
        wsRef.current = ws;
        console.log('[ChatPage] WebSocket создан:', {uuid, pin, mode});

        ws.onMessage(async msg => {
            console.log('[WS] получено сообщение:', msg);
            switch (msg.type) {
                case 'offer': {
                    if (document.visibilityState === 'hidden' && 'serviceWorker' in navigator) {
                        const chat = chatHistory.find(c => c.uuid === msg.from);
                        const chatName = chat?.chatName ?? msg.from.slice(0, 6);

                        navigator.serviceWorker.ready.then(reg => {
                            reg.active?.postMessage({
                                type: 'notify',
                                payload: {
                                    title: '💬 Входящее подключение',
                                    body: `${chatName} хочет выйти на связь`,
                                },
                            });
                        });
                    }

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

                        const remoteUuid = msg.uuid ?? msg.from;
                        const alreadySaved = await connectionExists(remoteUuid);
                        if (!alreadySaved) {
                            const name = prompt("Введите имя чата") ?? "Без имени";
                            saveConnectionHistory(remoteUuid, name);
                            loadChatHistory()
                        }
                    });

                    peer.current.onIceCandidate(c => wsRef.current?.send({
                        type: 'ice-candidate',
                        to: msg.from,
                        data: {candidate: c}
                    }));

                    const answer = await peer.current.acceptOffer(msg.data.sdp);
                    addLog('[RTC] answer создан');
                    wsRef.current?.send({type: 'answer', to: msg.from, data: {sdp: answer}});
                    break;
                }
                case 'answer': {
                    addLog(`📩 answer от ${msg.from}`);
                    await peer.current?.acceptAnswer(msg.data.sdp);
                    addLog('[RTC] answer принят (host)');

                    const alreadySaved = await connectionExists(msg.from);
                    if (!alreadySaved) {
                        const name = prompt("Введите имя чата") ?? "Без имени";
                        saveConnectionHistory(msg.from, name);
                        addLog(`[DB] сохранена история с uuid ${msg.from}`);
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
                    peer.current?.close();
                    peer.current = null;
                    wsRef.current?.close();
                    wsRef.current = null;
                    setConnectedPeerId(null);
                    setStatus('idle');
                    setMode('idle');
                    setLog([]);
                    break;
                }
            }
        });

        return () => {
            console.log('[ChatPage] закрытие peer и WebSocket');
            peer.current?.close();
            ws.close();
        };
    }, [mode, uuid]);

    useEffect(() => {
        if (mode !== 'join') return;

        const interval = setInterval(() => {
            const newPin = generatePin();
            setPin(newPin);
            console.log('[Pin] обновлён:', newPin);
        }, 60000);

        pinTimerRef.current = interval;
        return () => clearInterval(interval);
    }, [mode]);

    const clearPinTimer = () => {
        if (pinTimerRef.current) {
            clearInterval(pinTimerRef.current);
            pinTimerRef.current = null;
            console.log('[Pin] таймер остановлен — соединение установлено');
        }
    };

    const startAsHost = async () => {
        setStatus('connecting');
        addLog(`🧭 ты инициатор — жди подключение`);

        wsRef.current?.onOpen(async () => {
            addLog('📡 WebSocket готов, создаём RTC');
            peer.current = new RTCPeer(true);
            addLog('[RTC] создан peer (host)');

            peer.current.onMessage(m => addLog(`👤 ${m}`));
            peer.current.onOpen(() => {
                setStatus('connected');
                addLog('🔗 канал открыт');
            });
            peer.current.onIceCandidate(c => wsRef.current?.send({
                type: 'ice-candidate',
                to: targetId,
                data: {candidate: c}
            }));

            const offer = await peer.current.createOffer();
            addLog('[RTC] offer создан (host)');
            wsRef.current?.send({type: 'offer', to: targetId, data: {sdp: offer}});
        });
    };

    const send = () => {
        if (!input.trim() || status !== 'connected') return;
        peer.current?.sendMessage(input);
        addLog(`🧍 ${input}`);
        setInput('');
    };

    const loadChatHistory = async () => {
        const history = await getConnectionHistory();
        setChatHistory(history);
        console.log('[DB] история загружена:', history);
    };

    const handleReconnect = async (peerUuid: string) => {
        if (status === 'connected') {
            const confirmSwitch = confirm("Сейчас уже есть активный чат. Завершить его и начать новый?");
            if (!confirmSwitch) return;

            if (connectedPeerId) {
                wsRef.current?.send({type: 'disconnect', to: connectedPeerId});
                addLog(`📤 отправлен disconnect для ${connectedPeerId}`);
            }

            peer.current?.close();
            peer.current = null;
            wsRef.current?.close();
            wsRef.current = null;
            setConnectedPeerId(null);
            setStatus('idle');
        }

        setMode('host');
        setStatus('connecting');
        addLog(`🔁 подключение к ${peerUuid.slice(0, 6)}`);

        const ws = new WebSocketClient(uuid);
        wsRef.current = ws;

        let timeoutId: NodeJS.Timeout;

        ws.onOpen(async () => {
            const rtc = new RTCPeer(true);
            peer.current = rtc;

            rtc.onMessage(m => addLog(`👤 ${m}`));
            rtc.onOpen(() => {
                clearTimeout(timeoutId); // ответ получен вовремя
                setStatus('connected');
                setConnectedPeerId(peerUuid);
                addLog('🔗 канал открыт');
                clearPending(peerUuid);
            });
            rtc.onIceCandidate(c => {
                ws.send({type: 'ice-candidate', to: peerUuid, data: {candidate: c}});
            });

            const offer = await rtc.createOffer();
            ws.send({type: 'offer', to: peerUuid, data: {sdp: offer}});
            addLog('⏳ offer отправлен — ждём ответ 6 сек...');

            timeoutId = setTimeout(() => {
                addLog('⌛ истекло время ожидания ответа — отмена подключения');
                peer.current?.close();
                peer.current = null;
                wsRef.current?.close();
                wsRef.current = null;
                setStatus('idle');
                setMode('idle');
                setConnectedPeerId(null);
            }, 6000);
        });
    };


    useEffect(() => {
        loadChatHistory();
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    return (
        <div style={{padding: 24, maxWidth: 600, margin: '0 auto'}}>
            <h2>🛰 P2P Chat</h2>
            <p>Статус: {status}</p>

            <div>

                <button
                    onClick={async () => {
                        if (connectedPeerId && wsRef.current?.getSocketReadyState() === WebSocket.OPEN) {
                            wsRef.current.send({ type: 'disconnect', to: connectedPeerId });
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

                        peer.current?.close();
                        peer.current = null;
                        wsRef.current?.close();
                        wsRef.current = null;
                        setConnectedPeerId(null);
                        setStatus('idle');
                        setMode('idle');
                        setLog([]);
                    }}
                >
                    🔌 Завершить чат
                </button>

                <button
                    onClick={async () => {
                        await indexedDB.deleteDatabase('chatHistory');
                        localStorage.removeItem('my-app-uuid');
                        document.body.innerHTML = `
      <div style="display: flex; height: 100vh; align-items: center; justify-content: center; flex-direction: column; font-family: sans-serif;">
        <h1>🧹 Поздравляю, ваша история начинается с чистого листа!</h1>
        <p>Теперь вы можете закрыть вкладку.</p>
      </div>
    `;
                    }}
                >
                    🧨 Удалить все соединения и UUID
                </button>


            </div>
            {mode === 'idle' && (
                <>
                    <button onClick={() => setMode('host')}>🔗 Создать соединение</button>
                    <button onClick={() => setMode('join')}>🔌 Подключиться по PIN</button>
                </>
            )}

            {mode === 'host' && (
                <>
                    <input
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        placeholder="UUID подключающегося"
                    />
                    <button onClick={startAsHost} disabled={!targetId.trim()}>Начать</button>
                </>
            )}

            {mode === 'join' && (
                <>
                    <p>Скопируй этот PIN и отправь другу: <strong>{pin}</strong></p>
                </>
            )}

            <div style={{border: '1px solid #555', minHeight: 120, padding: 12, margin: '16px 0'}}>
                {log.map((l, i) => (
                    <div key={i}>{l}</div>
                ))}
            </div>

            <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Введите сообщение"
                disabled={status !== 'connected'}
            />
            <button onClick={send} disabled={status !== 'connected'}>
                Отправить
            </button>

            <h3>История чатов</h3>
            <ul>
                {chatHistory.map((chat, index) => (
                    <li key={index}>
                        <button
                            onClick={() => {
                                if (isPending(chat.uuid)) {
                                    const confirmSwitch = confirm("Поступил входящий запрос от этого пользователя. Завершить текущий чат и подключиться?");
                                    if (!confirmSwitch) return;

                                    peer.current?.close();
                                    wsRef.current?.close();
                                    setStatus('idle');
                                }

                                handleReconnect(chat.uuid);
                            }}
                        >
                            {chat.chatName} {isPending(chat.uuid) ? '❗' : ''}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ChatPage;