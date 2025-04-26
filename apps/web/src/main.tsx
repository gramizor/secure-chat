import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {connectSocket, subscribeSocketMessage} from '@/shared/api/socket'
import {
    addIceCandidate,
    createOffer,
    createPeerConnection,
    handleAnswer,
    handleOffer,
    sendMessage,
    setSocket
} from '@/shared/lib/webrtc/peerConnection'
import {sessionKey, setSessionKey} from "@/shared/config/session";
import {generateSessionKey} from "@/shared/lib/crypto/sessionKey";
import {QRCodeCanvas} from 'qrcode.react'
import {deriveSessionKeyFromPin, generatePin} from '@/shared/lib/crypto/pin'

const App = () => {
    const [input, setInput] = useState('')
    const [sessionKeyGenerated, setSessionKeyGenerated] = useState('')
    const [keyInput, setKeyInput] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const [pinGenerated, setPinGenerated] = useState('')
    const [pinInput, setPinInput] = useState('')
    const [pinTimerId, setPinTimerId] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const ws = connectSocket()
        setSocket(ws)

        subscribeSocketMessage((message) => {
            console.log('📩 Incoming:', message)

            if (message.type === 'offer') {
                handleOffer(message.payload)
            }

            if (message.type === 'answer') {
                handleAnswer(message.payload)
            }

            if (message.type === 'ice-candidate') {
                addIceCandidate(message.payload)
            }

            if (message.type === 'session-closed') {
                alert('❌ Сессия завершена другим пользователем')
                window.location.reload()
            }
        })

        createPeerConnection()
    }, [])

    const handleSend = () => {
        sendMessage(input)
        setInput('')
    }

    const handleGenerateKey = () => {
        const newKey = generateSessionKey()
        setSessionKey(newKey)
        console.log(`Ваш session key:\n${newKey}`)
        setSessionKeyGenerated(newKey)
    }

    const handleSetKey = () => {
        setSessionKey(keyInput)
        alert('Ключ установлен')
    }

    const handleStartConnection = async () => {
        if (!sessionKey) {
            alert('Установите sessionKey сначала!')
            return
        }

        await createOffer()
        setIsConnected(true)
    }

    useEffect(() => {
        const handleBeforeUnload = () => {
            setSessionKey('')
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [])

    const handleGeneratePin = async () => {
        if (pinTimerId) {
            clearTimeout(pinTimerId)
        }

        const pin = generatePin()
        const derivedKey = await deriveSessionKeyFromPin(pin)

        setSessionKey(derivedKey)
        setPinGenerated(pin)

        const timer = setTimeout(() => {
            setSessionKey('')
            setPinGenerated('')
            alert('❌ PIN истёк. Сгенерируйте новый.')
        }, 90_000) // 90 секунд

        setPinTimerId(timer)
    }

    const handleSetPin = async () => {
        if (pinTimerId) {
            clearTimeout(pinTimerId)
        }

        const derivedKey = await deriveSessionKeyFromPin(pinInput)
        setSessionKey(derivedKey)
        alert('PIN установлен')
    }

    return (
        <div style={{padding: 24}}>
            <h1>Secure Chat</h1>

            <button onClick={handleStartConnection}>
                🔗 Start Connection
            </button>

            <div style={{marginBottom: 20}}>
                <button onClick={handleGenerateKey}>🔐 Сгенерировать sessionKey</button>
                {sessionKeyGenerated && (
                    <div style={{marginTop: 10}}>
                        <p>Отсканируй этот QR-код:</p>
                        <QRCodeCanvas value={sessionKeyGenerated} size={150}/>
                        <p style={{wordBreak: 'break-all', marginTop: 10}}>{sessionKeyGenerated}</p>
                    </div>
                )}
                <br/><br/>
                <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Вставить полученный sessionKey"
                    style={{marginRight: 8}}
                />
                <button onClick={handleSetKey}>✅ Установить ключ</button>
            </div>

            <div style={{marginBottom: 20}}>
                <button onClick={handleGeneratePin}>🔐 Сгенерировать одноразовый PIN</button>

                {pinGenerated && (
                    <div style={{marginTop: 10}}>
                        <p>Отдай этот PIN собеседнику:</p>
                        <h2>{pinGenerated}</h2>
                    </div>
                )}

                <br/><br/>

                <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Вставить PIN от собеседника"
                    style={{marginRight: 8}}
                />
                <button onClick={handleSetPin}>✅ Установить PIN</button>
            </div>


            {isConnected && (
                <div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter message"
                        style={{marginRight: 8}}
                    />
                    <button onClick={handleSend}>📨 Send</button>
                </div>
            )}

        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)
