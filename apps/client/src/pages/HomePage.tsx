import {useEffect, useState} from "react"
import {v4 as uuid} from "uuid"
import {RTCPeer} from "@/shared/api/rtc/RTCPeer"
import {WebSocketClient} from "@/shared/api/ws/WebSocketClient"
import {generateKeyPair} from "@/shared/crypto/ecdh"
import {generatePin} from "@/shared/lib/generatePin"
import {QRCodeBox} from "@/widgets/qr/QRCodeBox"
import {ChatBox} from "@/widgets/chat/ChatBox"

const peerId = uuid()

export const HomePage = () => {
    const [pin, setPin] = useState("")
    const [url, setUrl] = useState("")
    const [peer, setPeer] = useState<RTCPeer | null>(null)
    const [ws, setWs] = useState<WebSocketClient | null>(null)
    const [wsReady, setWsReady] = useState(false)

    useEffect(() => {
        const socket = new WebSocketClient(peerId)
        setWs(socket)

        socket.onOpen(() => {
            console.log("🟢 WebSocket открыт")
            setWsReady(true)
        })

        socket.onMessage(async (msg) => {
            if (msg.type === "answer") {
                if (!peer) {
                    console.warn("❌ Пришёл answer до инициализации peer")
                    return
                }

                await peer.acceptAnswer(msg.data.sdp)
                console.log("✅ Answer принят, соединение установлено")

                setPin("")
                setUrl("")
            }
        })

        return () => {
            socket.close()
        }
    }, [])

    const generateInvitation = async () => {
        if (!ws) return;

        const p = generatePin();
        setPin(p);

        const rtc = new RTCPeer();
        const {publicKey} = generateKeyPair();
        const offer = await rtc.createOffer();
        setPeer(rtc);

        console.log("📤 Ожидаем открытие WebSocket перед отправкой register-offer...");

        if (ws.isOpen) {
            ws.send({
                type: "register-offer",
                from: peerId,
                data: {
                    pin: p,
                    peerId,
                    sdp: offer,
                    pubKey: publicKey
                }
            });

            setUrl(`${window.location.origin}/join?pin=${p}`);
        } else {
            ws.onOpen(() => {
                ws.send({
                    type: "register-offer",
                    from: peerId,
                    data: {
                        pin: p,
                        peerId,
                        sdp: offer,
                        pubKey: publicKey
                    }
                });

                setUrl(`${window.location.origin}/join?pin=${p}`);
            });
        }
    };

    return (
        <div>
            <h2>👤 Peer ID: {peerId.slice(0, 8)}</h2>

            <button onClick={generateInvitation} disabled={!wsReady}>
                {wsReady ? "Создать QR + PIN" : "Подключение..."}
            </button>

            {pin && (
                <>
                    <p>🔐 PIN: <b>{pin}</b></p>
                    <QRCodeBox data={url}/>
                    <p style={{fontSize: 12}}>{url}</p>
                </>
            )}

            {peer && <ChatBox peer={peer}/>}
        </div>
    )
}
