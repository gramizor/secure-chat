import {useEffect, useRef, useState} from 'react'
import {v4 as uuid} from 'uuid'
import {RTCPeer} from './RTCPeer'
import {WebSocketClient} from './WebSocketClient'

const ChatPage = () => {
    const [peerId] = useState(uuid())
    const [targetId, setTargetId] = useState('')
    const [input, setInput] = useState('')
    const [log, setLog] = useState<string[]>([])
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
    const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle')
    console.log("🔑 Мой peerId:", peerId)

    const wsRef = useRef<WebSocketClient | null>(null)
    const peer = useRef<RTCPeer | null>(null)

    const addLog = (txt: string) => setLog(prev => [...prev, txt])

    useEffect(() => {
        const ws = new WebSocketClient(peerId)
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
            <h2>🛰 P2P Chat ({peerId.slice(0, 8)})</h2>
            <p>Статус: {status}</p>

            {mode === 'idle' && (
                <>
                    <button onClick={() => setMode('host')}>🔗 Создать соединение</button>
                    <button onClick={() => setMode('join')}>🔌 Присоединиться</button>
                </>
            )}

            {mode === 'host' && (
                <>
                    <p>Скопируй этот UUID и отправь другу: <strong>{peerId}</strong></p>
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
                    <input
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        placeholder="Введи UUID друга"
                    />
                    <button onClick={startAsJoin} disabled={!targetId.trim()}>Подключиться</button>
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
