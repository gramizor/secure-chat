type MessageListener = (message: string) => void

export class RTCPeer {
    private peer = new RTCPeerConnection({
        iceServers: [
            {urls: 'stun:stun.l.google.com:19302'}
        ]
    })
    private channel: RTCDataChannel | null = null
    private listeners = new Set<MessageListener>()
    private onChannelOpenResolver: (() => void) | null = null

    constructor() {
        this.peer.onicecandidate = (e) => {
            if (!e.candidate) {
                console.log('🔒 ICE gathering complete')
            }
        }
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        this.channel = this.peer.createDataChannel('chat')
        this.setupChannel()

        const offer = await this.peer.createOffer()
        await this.peer.setLocalDescription(offer)

        return offer
    }

    async acceptOffer(sdp: RTCSessionDescriptionInit) {
        this.peer.ondatachannel = (event) => {
            this.channel = event.channel
            this.setupChannel()
        }

        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp))

        await this.waitForChannelOpen()
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        const answer = await this.peer.createAnswer()
        await this.peer.setLocalDescription(answer)
        return answer
    }

    async acceptAnswer(sdp: RTCSessionDescriptionInit) {
        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp))

        if (!this.channel) {
            console.warn('⚠️ DataChannel ещё не создан — ждём onopen')
        }

        await this.waitForChannelOpen()
    }

    private waitForChannelOpen(): Promise<void> {
        return new Promise(resolve => {
            if (this.channel?.readyState === 'open') return resolve()
            this.onChannelOpenResolver = resolve
        })
    }

    private setupChannel() {
        if (!this.channel) return

        this.channel.onmessage = (event) => {
            this.listeners.forEach(cb => cb(event.data))
        }

        this.channel.onopen = () => {
            console.log('✅ DataChannel открыт и готов к передаче сообщений')
            this.onChannelOpenResolver?.()
            this.onChannelOpenResolver = null
        }

        this.channel.onclose = () => {
            console.warn('⚠️ DataChannel закрыт')
        }
    }

    onMessage(cb: MessageListener) {
        this.listeners.add(cb)

        // Если канал уже открыт и есть буфер сообщений (или уже подключен),
        // то стоит уведомить (опционально — см. ниже).
        if (this.channel?.readyState === 'open') {
            console.log('ℹ️ Слушатель подключён к уже открытому каналу')
        }

        return () => this.listeners.delete(cb)
    }

    sendMessage(message: string) {
        if (!this.channel || this.channel.readyState !== 'open') {
            console.warn('❌ DataChannel не готов:', this.channel?.readyState)
            return
        }
        this.channel.send(message)
    }

    getConnection(): RTCPeerConnection {
        return this.peer
    }

    getChannel(): RTCDataChannel | null {
        return this.channel
    }
}
