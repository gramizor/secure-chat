import {useEffect, useState} from 'react'
import {RTCPeer} from '../api/rtc/RTCPeer'

export function usePeerMessaging(peer: RTCPeer | null) {
    const [messages, setMessages] = useState<string[]>([])
    const [input, setInput] = useState('')

    useEffect(() => {
        if (!peer) return
        const unsub = peer.onMessage((msg) => {
            setMessages(prev => [...prev, `👤 Собеседник: ${msg}`])
        })
        return () => {
            unsub()
        }
    }, [peer])

    const send = () => {
        if (!input || !peer) return
        peer.sendMessage(input)
        setMessages(prev => [...prev, `🧑‍💻 Я: ${input}`])
        setInput('')
    }

    return {messages, input, setInput, send}
}
