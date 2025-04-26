import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3001 })

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        // Рассылаем всем кроме отправителя
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(message)
            }
        })
    })
})

console.log('✅ WebSocket signaling server running on ws://localhost:3001')
