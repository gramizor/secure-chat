import {usePeerMessaging} from '@/shared/lib/usePeerMessaging'
import {RTCPeer} from '@/shared/api/rtc/RTCPeer'

interface Props {
    peer: RTCPeer | null
}

export const ChatBox = ({peer}: Props) => {
    const {messages, input, setInput, send} = usePeerMessaging(peer)

    return (
        <div>
            <h3>💬 Сообщения</h3>
            <div style={{border: '1px solid #ccc', height: 200, overflowY: 'auto', padding: 8, marginBottom: 8}}>
                {messages.map((msg, idx) => (
                    <div key={idx}>{msg}</div>
                ))}
            </div>
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Введите сообщение"
                onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send}>Отправить</button>
        </div>
    )
}
