// ChatPage.tsx
import {useEffect, useRef, useState} from 'react';
import {WebSocketClient} from "@shared/api/WebSocketClient";
import {RTCPeer} from "@shared/api/RTCPeer";
import {generatePin} from "@shared/lib/generatePin";
import {connectionExists, getConnectionHistory, saveConnectionHistory} from "@shared/lib/db";
import {getOrGenerateUUID} from "@shared/lib/generateUUID";

const ChatPage = () => {
    const uuid = getOrGenerateUUID();
    const [pin, setPin] = useState(generatePin());
    const [targetId, setTargetId] = useState('');
    const [input, setInput] = useState('');
    const [log, setLog] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
    const [chatHistory, setChatHistory] = useState<{ uuid: string, chatName: string }[]>([]);

    const wsRef = useRef<WebSocketClient | null>(null);
    const peer = useRef<RTCPeer | null>(null);
    const pinTimerRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (txt: string) => setLog(prev => [...prev, txt]);

    useEffect(() => {
        const ws = new WebSocketClient(uuid, mode === 'join' ? pin : undefined);
        wsRef.current = ws;
        console.log('[ChatPage] WebSocket создан:', { uuid, pin, mode });

        ws.onMessage(async msg => {
            console.log('[WS] получено сообщение:', msg);
            switch (msg.type) {
                case 'offer': {
                    addLog(`📩 offer от ${msg.from}`);
                    peer.current = new RTCPeer(false);
                    addLog('[RTC] создан peer (receiver)');

                    peer.current.onMessage(m => addLog(`👤 ${m}`));
                    peer.current.onOpen(async () => {
                        setStatus('connected');
                        addLog('🔗 канал открыт');
                        clearPinTimer();

                        const alreadySaved = await connectionExists(msg.uuid);
                        if (!alreadySaved) {
                            const name = prompt("Введите имя чата") ?? "Без имени";
                            saveConnectionHistory(msg.uuid, name);
                            addLog(`[DB] сохранена история с uuid ${msg.uuid}`);
                        }
                    });
                    peer.current.onIceCandidate(c => ws.send({type: 'ice-candidate', to: msg.from, data: {candidate: c}}));

                    const answer = await peer.current.acceptOffer(msg.data.sdp);
                    addLog('[RTC] answer создан');
                    ws.send({type: 'answer', to: msg.from, data: {sdp: answer}});
                    break;
                }
                case 'answer': {
                    addLog(`📩 answer от ${msg.from}`);
                    await peer.current?.acceptAnswer(msg.data.sdp);
                    addLog('[RTC] answer принят (host)');
                    break;
                }
                case 'ice-candidate': {
                    await peer.current?.addIceCandidate(msg.data.candidate);
                    addLog('[ICE] кандидат добавлен');
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
                saveConnectionHistory(targetId, prompt("Название чата:") ?? "Без названия");
            });
            peer.current.onIceCandidate(c => wsRef.current?.send({type: 'ice-candidate', to: targetId, data: {candidate: c}}));

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

    const handleReconnect = async (uuid: string) => {
        setStatus('connecting');
        addLog(`🔁 подключение к ${uuid.slice(0, 6)}`);

        const ws = new WebSocketClient(uuid);
        wsRef.current = ws;

        const rtc = new RTCPeer(true);
        peer.current = rtc;

        rtc.onMessage(m => addLog(`👤 ${m}`));
        rtc.onOpen(() => {
            setStatus('connected');
            addLog('🔗 канал открыт');
        });
        rtc.onIceCandidate(c => ws.send({type: 'ice-candidate', to: uuid, data: {candidate: c}}));

        const offer = await rtc.createOffer();
        ws.send({type: 'offer', to: uuid, data: {sdp: offer}});
    };

    useEffect(() => {
        loadChatHistory();
    }, []);

    return (
        <div style={{padding: 24, maxWidth: 600, margin: '0 auto'}}>
            <h2>🛰 P2P Chat</h2>
            <p>Статус: {status}</p>

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
                        <button onClick={() => handleReconnect(chat.uuid)}>{chat.chatName}</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ChatPage;