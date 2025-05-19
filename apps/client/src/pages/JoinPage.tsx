import {useEffect, useState} from "react"
import {useSearchParams} from "react-router-dom"
import {v4 as uuid} from "uuid"
import {WebSocketClient} from "@/shared/api/ws/WebSocketClient"
import {RTCPeer} from "@/shared/api/rtc/RTCPeer"
import {ChatBox} from "@/widgets/chat/ChatBox.tsx"

const myPeerId = uuid()

function waitUntilOpen(socket: WebSocket): Promise<void> {
    return new Promise((resolve) => {
        if (socket.readyState === WebSocket.OPEN) return resolve()
        socket.addEventListener("open", () => resolve(), {once: true})
    })
}

export const JoinPage = () => {
    const [params] = useSearchParams()
    const pin = params.get("pin")
    const [status, setStatus] = useState("⏳ Ожидание...")
    const [peer, setPeer] = useState<RTCPeer | null>(null)
    const [ws, setWs] = useState<WebSocketClient | null>(null)

    useEffect(() => {
        if (!pin) {
            setStatus("❌ PIN не передан в URL")
            return
        }

        const client = new WebSocketClient(myPeerId)
        setWs(client)

        client.onMessage(async (msg) => {
            if (msg.type === "offer-response" && msg.data) {
                const {peerId, sdp, pubKey} = msg.data

                setStatus("📨 Получен offer, создаём answer...")

                const newPeer = new RTCPeer()
                setPeer(newPeer)
                await newPeer.acceptOffer(sdp)

                const answer = await newPeer.createAnswer()

                client.send({
                    type: "answer",
                    from: myPeerId,
                    to: peerId,
                    data: {sdp: answer}
                })

                setStatus("✅ Ответ отправлен. Установлено P2P соединение.")
            }

            if (msg.type === "offer-not-found") {
                setStatus("❌ Действие невозможно: пин недействителен или устарел.")
            }
        })

        waitUntilOpen(client.socket).then(() => {
            console.log("🟢 WebSocket открыт на JoinPage")

            client.send({
                type: "get-offer-by-pin",
                from: myPeerId,
                data: {pin}
            })
        })

        return () => client.close()
    }, [pin])

    return (
        <div>
            <h2>🔗 Подключение по PIN</h2>
            <p>
                Ваш peerId: <b>{myPeerId.slice(0, 8)}</b>
            </p>
            <p>{status}</p>
            {peer && <ChatBox peer={peer}/>}
        </div>
    )
}
