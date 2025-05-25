import { WebSocketServer, WebSocket as WsSocket } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

type ClientId = string;
type Pin = string;

const clients = new Map<ClientId, WsSocket>();
const pinToClientId = new Map<Pin, { clientId: string; uuid: string }>();

console.log('🧠 Инициализация WebSocket-сервера...');

wss.on('connection', (ws: WsSocket, req) => {
    let clientId: string = '';
    let clientUUID: string = '';

    const ip = req.socket.remoteAddress;
    console.log(`🆕 Новое подключение от ${ip}`);

    ws.on('message', (data) => {
        try {
            const raw = data.toString();
            console.log('📨 Получено сообщение от клиента:', raw);

            const msg = JSON.parse(raw);
            console.log('🔍 Распарсено сообщение:', msg);

            if (!msg.type || !msg.from) {
                console.warn('⚠️ Некорректное сообщение: отсутствует type или from');
                return;
            }

            if (msg.type === 'join') {
                clientId = msg.from;
                clientUUID = msg.uuid;

                clients.set(clientId, ws);
                console.log(`✅ Клиент зарегистрирован: ${clientId}`);

                if (msg.pin) {
                    pinToClientId.set(msg.pin, {
                        clientId,
                        uuid: clientUUID
                    });
                    console.log(`📍 PIN зарегистрирован: ${msg.pin} → ${clientId} (uuid: ${clientUUID})`);
                } else {
                    console.warn('⚠️ join без PIN — возможно ошибка клиента');
                }

                console.log(`📦 Всего клиентов: ${clients.size}, PIN’ов: ${pinToClientId.size}`);
                return;
            }

            // роутинг сообщения
            let targetClientId = msg.to;

            if (pinToClientId.has(msg.to)) {
                const entry = pinToClientId.get(msg.to)!;
                targetClientId = entry.clientId;
                console.log(`📦 Маршрутизируем по PIN ${msg.to} → UUID ${targetClientId}`);
            } else {
                console.log(`📦 Маршрутизируем по UUID ${msg.to}`);
            }

            const target = clients.get(targetClientId);

            if (target) {
                target.send(JSON.stringify(msg));
                console.log(`📤 Отправлено сообщение типа ${msg.type} → ${targetClientId}`);
            } else {
                console.warn(`❌ Получатель ${targetClientId} не найден в clients`);
            }
        } catch (err) {
            console.error('💥 Ошибка при обработке сообщения:', err);
        }
    });

    ws.on('close', () => {
        console.log(`🔌 Соединение с ${clientId || 'неизвестный'} закрыто`);

        if (clientId) {
            clients.delete(clientId);
            console.log(`🗑 Клиент удалён из clients: ${clientId}`);

            // чистим связанные PIN’ы
            const before = pinToClientId.size;
            for (const [pin, entry] of pinToClientId.entries()) {
                if (entry.clientId === clientId) {
                    pinToClientId.delete(pin);
                    console.log(`🧹 PIN ${pin} отвязан от клиента ${clientId}`);
                }
            }

            console.log(`📦 Осталось клиентов: ${clients.size}, PIN’ов: ${pinToClientId.size} (было ${before})`);
        }
    });

    ws.on('error', (err) => {
        console.error(`❗ WebSocket error с ${clientId || 'неизвестный'}:`, err);
    });
});

server.listen(3001, () => {
    console.log('🛰 WebSocket-сервер запущен на ws://localhost:3001');
});
