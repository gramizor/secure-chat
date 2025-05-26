import {useEffect} from "react";
import {WebSocketClient} from "@shared/api/WebSocketClient";

interface Params {
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    uuid: string;
    mode: 'idle' | 'host' | 'join';
    pin?: string;
    onMessage: (msg: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
    addLog?: (msg: string) => void;
}

/**
 * Отвечает за инициализацию и очистку WebSocket клиента.
 * Без конфликта с ручным реконнектом.
 */
export const useSocketLifecycle = ({
                                       wsRef,
                                       uuid,
                                       mode,
                                       pin,
                                       onMessage,
                                       onOpen,
                                       onClose,
                                       addLog
                                   }: Params) => {
    useEffect(() => {
        if (wsRef.current) {
            const ready = wsRef.current.getSocketReadyState();
            if (ready !== WebSocket.OPEN) {
                addLog?.("[WS] найден нерабочий сокет — форсируем очистку");
                wsRef.current.close(1000, "cleanup before reinit");
                wsRef.current = null;
            } else {
                addLog?.("[WS] сокет уже существует — пропуск");
                return;
            }
        }


        const ws = new WebSocketClient(uuid, mode === "join" ? pin : undefined);
        wsRef.current = ws;

        addLog?.("[WS] сокет создан");

        ws.onMessage(onMessage);
        ws.onOpen(() => {
            addLog?.("[WS] соединение установлено");
            onOpen?.();
        });

        const cleanup = () => {
            addLog?.("[WS] cleanup — закрытие соединения");
            wsRef.current?.close(1000, "cleanup");
            wsRef.current = null;
            onClose?.();
        };

        return cleanup;
    }, [uuid, mode]);
};
