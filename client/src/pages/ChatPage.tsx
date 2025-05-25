import {useEffect, useRef, useState} from 'react'
import {WebSocketClient} from "@shared/api/WebSocketClient.ts";
import {RTCPeer} from "@shared/api/RTCPeer.ts";
import {generatePin} from "@shared/lib/generatePin.ts";

const ChatPage = () => {
    const [pin] = useState(generatePin())
    const [targetId, setTargetId] = useState('')
    const [input, setInput] = useState('')
    const [log, setLog] = useState<string[]>([])
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle')
    console.log("🔑 Мой pin:", pin)

    const wsRef = useRef<WebSocketClient | null>(null)
    const peer = useRef<RTCPeer | null>(null)

    const addLog = (txt: string) => setLog(prev => [...prev, txt])

    useEffect(() => {
        const ws = new WebSocketClient(pin)
        wsRef.current = ws

        ws.onMessage(async msg => {
            switch (msg.type) {
                case 'offer': {
                    addLog(`📩 offer от ${msg.from}`)
                    peer.current = new RTCPeer(false)

                    peer.current.onMessage(m => addLog(`👤 ${m}`))
                    peer.current.onOpen(() => {
                        setStatus('connected')
                        addLog('🔗 канал открыт')
                    })
                    peer.current.onIceCandidate(c =>
                        ws.send({type: 'ice-candidate', to: msg.from, data: {candidate: c}})
                    )

                    const answer = await peer.current.acceptOffer(msg.data.sdp)
                    ws.send({type: 'answer', to: msg.from, data: {sdp: answer}})
                    break
                }

                case 'answer':
                    addLog(`📩 answer от ${msg.from}`)
                    await peer.current?.acceptAnswer(msg.data.sdp)
                    break

                case 'ice-candidate':
                    await peer.current?.addIceCandidate(msg.data.candidate)
                    break
            }
        })

        return () => {
            peer.current?.close()
            ws.close()
        }
    }, [])

    const startAsHost = async () => {
        setStatus('connecting')
        addLog(`🧭 ты инициатор — жди подключение`)

        peer.current = new RTCPeer(true)
        peer.current.onMessage(m => addLog(`👤 ${m}`))
        peer.current.onOpen(() => {
            setStatus('connected')
            addLog('🔗 канал открыт')
        })
        peer.current.onIceCandidate(c =>
            wsRef.current?.send({ type: 'ice-candidate', to: targetId, data: { candidate: c } })
        )

        // 🔧 вот этого не хватало:
        const offer = await peer.current.createOffer()
        wsRef.current?.send({ type: 'offer', to: targetId, data: { sdp: offer } })
    }


    const startAsJoin = async () => {
        setStatus('connecting')
        addLog(`↗️ подключаемся к ${targetId.slice(0, 8)}`)
        peer.current = new RTCPeer(false)
        peer.current.onMessage(m => addLog(`👤 ${m}`))
        peer.current.onOpen(() => {
            setStatus('connected')
            addLog('🔗 канал открыт')
        })
        peer.current.onIceCandidate(c =>
            wsRef.current?.send({ type: 'ice-candidate', to: targetId, data: { candidate: c } })
        )

        const offer = await peer.current.createOffer()
        wsRef.current?.send({ type: 'offer', to: targetId, data: { sdp: offer } })
    }

    const send = () => {
        if (!input.trim() || status !== 'connected') return
        peer.current?.sendMessage(input)
        addLog(`🧍 ${input}`)
        setInput('')
    }

    return (
        <div style={{padding: 24, maxWidth: 600, margin: '0 auto'}}>
            <h2>🛰 P2P Chat</h2>
            <p>Статус: {status}</p>

            {mode === 'idle' && (
                <>
                    <button onClick={() => setMode('host')}>🔗 Создать соединение</button>
                    <button onClick={() => setMode('join')}>🔌 Поделиться пином</button>
                </>
            )}

            {mode === 'host' && (
                <>
                    <input
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        placeholder="PIN подключающегося"
                    />
                    <button onClick={startAsHost} disabled={!targetId.trim()}>Начать</button>
                </>
            )}

            {mode === 'join' && (
                <>
                    <p>Скопируй этот PIN и отправь другу: <strong>{pin}</strong></p>
                    {/*<input*/}
                    {/*    value={targetId}*/}
                    {/*    onChange={e => setTargetId(e.target.value)}*/}
                    {/*    placeholder="Введи UUID друга"*/}
                    {/*/>*/}
                    {/*<button onClick={startAsJoin} disabled={!targetId.trim()}>Подключиться</button>*/}
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
        </div>
    )
}

export default ChatPage
