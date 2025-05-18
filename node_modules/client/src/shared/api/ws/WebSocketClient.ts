type Listener = (msg: any) => void;

export class WebSocketClient {
  private socket: WebSocket;
  private listeners = new Set<Listener>();

  constructor(private readonly peerId: string) {
    this.socket = new WebSocket(`ws://localhost:3001`);
    console.log(`[ws] connected as ${this.peerId}`);

    this.socket.addEventListener("open", () => {
      this.send({ type: "join", id: peerId });
      console.log(`🔌 Подключён к сигналинг-серверу как ${peerId}`);
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

  onMessage(cb: Listener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  send(msg: object) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      this.socket.addEventListener(
        "open",
        () => {
          this.socket.send(JSON.stringify(msg));
        },
        { once: true },
      );
    }
  }

  close() {
    this.socket.close();
  }
}
