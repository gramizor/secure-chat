import {SocketMessageType} from "@/shared/api/types";

let socket: WebSocket | null = null

export const connectSocket = (): WebSocket => {
    socket = new WebSocket('ws://localhost:3001')

    socket.onopen = () => { console.log('✅ WebSocket connected') }
    socket.onclose = () => { console.log('❌ WebSocket disconnected') }
    socket.onerror = (err) => { console.error('❗ WebSocket error', err) }

    return socket
}

export const sendSocketMessage = (data: SocketMessageType) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data))
    }
}

export const subscribeSocketMessage = (callback: (data: SocketMessageType) => void) => {
    if (!socket) return

    socket.onmessage = async (event) => {
        try {
            const text = typeof event.data === 'string'
                ? event.data
                : await (event.data as Blob).text()

            const parsed = JSON.parse(text)
            callback(parsed)
        } catch (e) {
            console.error('Ошибка парсинга сообщения', e)
        }
    }
}