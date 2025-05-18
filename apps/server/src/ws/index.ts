import {WebSocketServer} from 'ws'

const wss = new WebSocketServer({port: 3001})
console.log('🟢 WebSocket сервер запущен на ws://localhost:3001')

wss.on('connection', socket => {
    console.log('📡 Клиент подключился')

    socket.on('message', data => {
        console.log('📨 Получено сообщение:', data.toString())

        // Пока просто эхо
        socket.send(data)
    })

    socket.on('close', () => {
        console.log('🔌 Соединение закрыто')
    })
})
