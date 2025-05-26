import { getOrGenerateUUID } from "@shared/lib/generateUUID.ts";

export class WebSocketClient {
  private socket: WebSocket;
  private listeners = new Set<(msg: any) => void>();
  private openListeners = new Set<() => void>();
  private id: string;
  private uuid: string;
  private wasOpened = false;
  private closeListeners = new Set<() => void>();

  constructor(id: string, pin?: string) {
    this.id = id;
    this.uuid = getOrGenerateUUID();
    console.log(`[WSClient] init для id: ${id}, uuid: ${this.uuid}, pin: ${pin}`);

    this.socket = new WebSocket(`ws://localhost:3001`);

    this.socket.onopen = () => {
      console.log("[WSClient] соединение установлено");
      this.wasOpened = true;

      const payload: any = {
        type: "join",
        from: this.id,
        uuid: this.uuid,
      };

      if (pin) {
        payload.pin = pin;
        console.log(`[WSClient] добавлен PIN к join: ${pin}`);
      }

      this.send(payload);
      console.log("[WSClient] join отправлен");

      this.openListeners.forEach(cb => {
        console.log("[WSClient] вызов openListener");
        cb();
      });
      this.openListeners.clear();
    };

    this.socket.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[WSClient] получено сообщение:", msg);
        this.listeners.forEach(cb => cb(msg));
      } catch (e) {
        console.error("[WSClient] ошибка парсинга сообщения", e);
      }
    };

    this.socket.onerror = e => {
      console.error("[WSClient] ошибка сокета", e);
    };

    this.socket.onclose = event => {
      console.warn("[WSClient] соединение закрыто", {
        wasClean: event.wasClean,
        code: event.code,
        reason: event.reason,
      });
      this.closeListeners.forEach(cb => cb());
      this.closeListeners.clear();
    };
  }

  onMessage(cb: (msg: any) => void) {
    console.log("[WSClient] подписка на onMessage");
    this.listeners.add(cb);
  }

  onOpen(cb: () => void) {
    if (this.wasOpened || this.socket.readyState === WebSocket.OPEN) {
      console.log("[WSClient] socket уже открыт — вызываем cb немедленно");
      cb();
    } else {
      console.log("[WSClient] socket не готов — откладываем вызов cb");
      this.openListeners.add(cb);
    }
  }

  send(data: any) {
    const enriched = { ...data, from: this.id, uuid: this.uuid };
    console.log("[WSClient] отправка сообщения:", enriched);
    this.socket.send(JSON.stringify(enriched));
  }

  close(code: number, desc: string) {
    console.log("[WSClient] закрытие соединения");
    this.socket.close(code, desc);
  }

  onClose(cb: () => void) {
    this.closeListeners.add(cb);
  }

  getSocketReadyState() {
    return this.socket.readyState;
  }
}
