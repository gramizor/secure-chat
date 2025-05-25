import { WebSocket as WsSocket, WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

const clients = new Map<string, WsSocket>();
const pinToClientId = new Map<string, string>();  // Новый Map для PIN

wss.on('connection', (ws: WsSocket) => {
    let clientId = '';

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log('📨 server получено', msg);

            if (msg.type === 'join') {
                clientId = msg.from;
                clients.set(clientId, ws);
                console.log(`✅ ${clientId} connected`);

                if (msg.pin) {
                    pinToClientId.set(msg.pin, clientId);  // Сохраняем PIN
                }
                return;
            }

            // Используем PIN для поиска клиента
            const targetClientId = pinToClientId.get(msg.to);
            const target = clients.get(targetClientId ?? '');
            if (target) {
                console.log(`📤 server пересылка ${msg.type} → ${msg.to}`);
                target.send(JSON.stringify(msg));
            } else {
                console.warn(`⚠️ клиент ${msg.to} не найден`);
            }
        } catch (err) {
            console.error('[SERVER] Invalid message', err);
        }
    });

    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId);
            console.log(`❌ ${clientId} disconnected`);
            // Удаляем из pinToClientId, когда клиент отключается
            pinToClientId.forEach((value, key) => {
                if (value === clientId) pinToClientId.delete(key);
            });
        }
    });
});

server.listen(3001, () => {
    console.log('🛰 WebSocket server listening on ws://localhost:3001');
});
