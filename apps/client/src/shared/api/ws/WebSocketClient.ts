type Listener = (msg: any) => void;

export class WebSocketClient {
    private socket: WebSocket;
    private listeners = new Set<Listener>();
    private openListeners = new Set<() => void>()

    constructor(private readonly peerId: string) {
        this.socket = new WebSocket(`ws://localhost:3001`);
        console.log(`[ws] created for ${this.peerId}`);

        this.socket.addEventListener("open", () => {
            // сначала отправляем JOIN
            this.socket.send(JSON.stringify({type: "join", id: this.peerId}));
            console.log(`🔌 Подключён к сигналинг-серверу как ${this.peerId}`);

            // потом уведомляем всех onOpen
            this.openListeners.forEach(fn => fn())
            this.openListeners.clear()
        });

        this.socket.addEventListener("message", (event) => {
            try {
                const data = JSON.parse(event.data);
                this.listeners.forEach((cb) => cb(data));
            } catch (e) {
                console.error("Ошибка парсинга сообщения:", e);
            }
        });
    }

    onOpen(cb: () => void) {
        if (this.socket.readyState === WebSocket.OPEN) {
            cb()
        } else {
            this.openListeners.add(cb)
        }
    }

    onMessage(cb: Listener) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    send(msg: object) {
        const data = JSON.stringify(msg)

        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(data)
        } else if (this.socket.readyState === WebSocket.CONNECTING) {
            const onOpen = () => this.socket.send(data)
            this.socket.addEventListener('open', onOpen, {once: true})
        } else {
            console.warn(`❌ Нельзя отправить: WebSocket в состоянии ${this.socket.readyState}`)
        }
    }

    close() {
        this.socket.close();
    }
}
