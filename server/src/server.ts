// ✅ server.ts
import {WebSocket as WsSocket, WebSocketServer} from 'ws'
import http from 'http'

const server = http.createServer()
const wss = new WebSocketServer({server})

const clients = new Map<string, WsSocket>()

wss.on('connection', (ws: WsSocket) => {
    let clientId = ''

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString())
            console.log('📨 server получено', msg)

            if (msg.type === 'join') {
                clientId = msg.from
                clients.set(clientId, ws)
                console.log(`✅ ${clientId} connected`)
                return
            }

            const target = clients.get(msg.to)
            if (target) {
                console.log(`📤 server пересылка ${msg.type} → ${msg.to}`)
                target.send(JSON.stringify(msg))
            } else {
                console.warn(`⚠️ клиент ${msg.to} не найден`)
            }
        } catch (err) {
            console.error('[SERVER] Invalid message', err)
        }
    })

    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId)
            console.log(`❌ ${clientId} disconnected`)
        }
    })
})

server.listen(3001, () => {
    console.log('🛰 WebSocket server listening on ws://localhost:3001')
})
