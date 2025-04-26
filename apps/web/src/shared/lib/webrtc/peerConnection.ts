import {sendSocketMessage} from '@/shared/api/socket'
import {decrypt, encrypt} from '@/shared/lib/crypto/aes'
import {sessionKey, setSessionKey} from "@/shared/config/session";

let peerConnection: RTCPeerConnection | null = null
let dataChannel: RTCDataChannel | null = null
let socket: WebSocket | null = null

export const setSocket = (ws: WebSocket) => {
    socket = ws
}

export const destroyConnection = async () => {
    if (dataChannel) {
        dataChannel.close()
        dataChannel = null
    }

    if (peerConnection) {
        peerConnection.close()
        peerConnection = null
    }

    if (socket && socket.readyState === WebSocket.OPEN && sessionKey) {
        const encrypted = await encrypt('Session closed', sessionKey)
        socket.send(JSON.stringify({type: 'session-closed', payload: encrypted}))
    }

    setSessionKey('')
    console.log('🧹 Connection destroyed')
}

const config: RTCConfiguration = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'} // публичный STUN сервер
    ]
}

const password = sessionKey

export const createOffer = async () => {
    if (!peerConnection) throw new Error('PeerConnection not initialized')

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    sendSocketMessage({
        type: 'offer',
        payload: offer
    })
}

export const createAnswer = async () => {
    if (!peerConnection) throw new Error('PeerConnection not initialized')

    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    sendSocketMessage({
        type: 'answer',
        payload: answer
    })
}

export const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection) throw new Error('PeerConnection not initialized')

    if (peerConnection.signalingState !== 'stable') {
        console.warn('Skipping handleOffer because signalingState is', peerConnection.signalingState)
        return
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    await createAnswer()
}

export const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection) throw new Error('PeerConnection not initialized')

    if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn('Skipping handleAnswer because signalingState is', peerConnection.signalingState)
        return
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
}

export const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection) throw new Error('PeerConnection not initialized')

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
}

export const createPeerConnection = () => {
    peerConnection = new RTCPeerConnection(config)

    dataChannel = peerConnection.createDataChannel('chat')

    setupDataChannel()

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel
        setupDataChannel()
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSocketMessage({
                type: 'ice-candidate',
                payload: event.candidate.toJSON()
            })
        }
    }

    peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection?.connectionState)
    }
}

const setupDataChannel = () => {
    if (!dataChannel) return

    dataChannel.onopen = () => {
        console.log('📡 DataChannel open')
    }

    dataChannel.onclose = () => {
        console.log('❌ DataChannel closed')
    }

    dataChannel.onmessage = async (event: MessageEvent<string>) => {
        try {
            const decrypted = await decrypt(event.data, password)
            console.log('📨 Decrypted message from peer:', decrypted)
        } catch (err) {
            console.error('Ошибка дешифровки', err)
        }
    }

}

export const sendMessage = async (message: string) => {
    if (dataChannel && dataChannel.readyState === 'open') {
        const encrypted = await encrypt(message, password)
        console.log('Отправляем сообщение:', encrypted)
        dataChannel.send(encrypted)
    } else {
        console.warn('DataChannel is not open')
    }
}
