import {WebSocketServer} from 'ws'
import {ClientManager, OfferRegistry} from './clientManager'

export function createWSServer(port: number) {
    const wss = new WebSocketServer({port})
    console.log(`🟢 WebSocket сигналинг на ws://localhost:${port}`)

    wss.on('connection', ws => {
        let clientId: string | null = null

        ws.on('message', raw => {
            try {
                const msg = JSON.parse(raw.toString())

                // === JOIN ===
                if (msg.type === "join" && typeof msg.id === "string") {
                    clientId = msg.id
                    ClientManager.add(clientId, ws)
                    console.log(`👤 Клиент ${clientId} подключился`)
                    return
                }

                // === REGISTER OFFER ===
                if (msg.type === 'register-offer') {
                    const {pin, peerId, sdp, pubKey} = msg.data ?? {}

                    const isValidSDP = sdp && typeof sdp === 'object' &&
                        typeof sdp.type === 'string' &&
                        typeof sdp.sdp === 'string'

                    if (typeof pin !== 'string' || typeof peerId !== 'string' || !isValidSDP || typeof pubKey !== 'string') {
                        console.warn("❌ Невалидные данные в register-offer", msg)
                        return
                    }

                    OfferRegistry.register(pin, peerId, sdp, pubKey)
                    console.log(`📌 Зарегистрирован offer по PIN ${pin}`)
                    return
                }

                // === GET OFFER BY PIN ===
                if (msg.type === 'get-offer-by-pin') {
                    const {pin} = msg.data
                    const offer = OfferRegistry.consume(pin)

                    if (offer) {
                        console.log("✅ OFFER FOUND:", pin)
                        ClientManager.send(msg.from, {
                            type: 'offer-response',
                            data: offer
                        })
                    } else {
                        console.warn("❌ OFFER NOT FOUND:", pin)
                        ClientManager.send(msg.from, {
                            type: 'offer-not-found',
                            reason: 'expired or invalid'
                        })
                    }

                    return
                }

                // === ANSWER ===
                if (msg.type === 'answer') {
                    ClientManager.send(msg.to, msg)
                }

            } catch (e) {
                console.error('❌ Ошибка парсинга сообщения:', e)
            }
        })

        ws.on('close', () => {
            if (clientId) {
                ClientManager.remove(clientId)
                console.log(`🔌 Клиент ${clientId} отключился`)
            }
        })
    })
}
