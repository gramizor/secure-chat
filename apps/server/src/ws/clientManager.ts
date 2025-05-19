import {WebSocket} from 'ws'

type ClientId = string
type Pin = string

const clients = new Map<ClientId, WebSocket>()
const connections = new Map<ClientId, Set<ClientId>>()
const offerRegistry = new Map<Pin, { peerId: string; sdp: any; pubKey: string }>()

export const ClientManager = {
    add(id: ClientId, ws: WebSocket) {
        clients.set(id, ws)
        connections.set(id, new Set())
    },

    remove(id: ClientId) {
        clients.delete(id)
        connections.delete(id)
        for (const peers of connections.values()) {
            peers.delete(id)
        }
        console.log(`🔌 Клиент ${id} отключился`)
    },

    addConnection(a: ClientId, b: ClientId) {
        connections.get(a)?.add(b)
        connections.get(b)?.add(a)
    },

    getConnections(id: ClientId): string[] {
        return Array.from(connections.get(id) ?? [])
    },

    send(to: ClientId, message: object) {
        const client = clients.get(to)
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message))
        }
    },

    isOnline(id: ClientId): boolean {
        const ws = clients.get(id)
        return !!ws && ws.readyState === WebSocket.OPEN
    },

    getConnectedIds(): Iterable<ClientId> {
        return clients.keys()
    }
}

export const OfferRegistry = {
    register(pin: Pin, peerId: string, sdp: RTCSessionDescriptionInit, pubKey: string) {
        if (offerRegistry.has(pin)) {
            console.warn(`⚠️ PIN ${pin} уже зарегистрирован — перезаписываем`)
        }
        console.log("📥 REGISTER PIN:", pin)
        offerRegistry.set(pin, {peerId, sdp, pubKey})
    },

    consume(pin: Pin) {
        console.log("📤 CONSUME PIN:", pin)
        const data = offerRegistry.get(pin)
        if (data) {
            offerRegistry.delete(pin)
        }
        return data
    }
}
