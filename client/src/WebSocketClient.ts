// ✅ WebSocketClient.ts
export class WebSocketClient {
    private socket: WebSocket
    private listeners = new Set<(msg: any) => void>()
    private id: string

    constructor(id: string) {
        this.id = id
        this.socket = new WebSocket(`ws://localhost:3001`)

        this.socket.onopen = () => {
            console.log('[WS] connected')
            this.send({type: 'join', from: this.id})
        }

        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                console.log('[WS] получено сообщение', msg)
                this.listeners.forEach((cb) => cb(msg))
            } catch (e) {
                console.error('[WS] Parse error', e)
            }
        }

        this.socket.onerror = (e) => {
            console.error('[WS] Error', e)
        }
    }

    onMessage(cb: (msg: any) => void) {
        this.listeners.add(cb)
    }

    send(data: any) {
        const enriched = {...data, from: this.id}
        console.log('[WS] отправка', enriched)
        this.socket.send(JSON.stringify(enriched))
    }

    close() {
        console.log('[WS] закрытие соединения')
        this.socket.close()
    }
}