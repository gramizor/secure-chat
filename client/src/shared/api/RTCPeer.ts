// ✅ RTCPeer.ts
export class RTCPeer {
    private peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    'stun:31.128.46.246:3478'
                ]
            }
        ]
    })
    private channel: RTCDataChannel | null = null
    private listeners = new Set<(msg: string) => void>()
    private onOpenCallback: (() => void) | null = null
    private iceCallback: ((candidate: RTCIceCandidate) => void) | null = null
    private monitorInterval: ReturnType<typeof setInterval> | null = null
    private isInitiator: boolean

    constructor(isInitiator: boolean) {
        this.isInitiator = isInitiator
        if (!isInitiator) {
            this.peer.ondatachannel = (event) => {
                console.log('📡 ondatachannel triggered')
                this.channel = event.channel
                this.channel.onopen = () => {
                    console.log('✅ remote DataChannel opened')
                    this.onOpenCallback?.()
                    this.monitorState()
                }
                this.setupChannel()
            }
        }

        this.peer.onicecandidate = (event) => {
            if (event.candidate && this.iceCallback) {
                console.log('📨 ICE candidate:', event.candidate)
                this.iceCallback(event.candidate)
            }
        }
    }

    onMessage(cb: (msg: string) => void) {
        this.listeners.add(cb)
    }

    onOpen(cb: () => void) {
        this.onOpenCallback = cb
    }

    onIceCandidate(cb: (c: RTCIceCandidate) => void) {
        this.iceCallback = cb
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (this.isInitiator) {
            this.channel = this.peer.createDataChannel("chat")
            this.channel.onopen = () => {
                console.log('✅ local DataChannel opened')
                this.onOpenCallback?.()
            }
            this.setupChannel()
            this.monitorState()
        }
        const offer = await this.peer.createOffer()
        await this.peer.setLocalDescription(offer)
        console.log('📤 offer created')
        return offer
    }

    async acceptOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        console.log('📥 accepting offer')
        await this.peer.setRemoteDescription(sdp)
        const answer = await this.peer.createAnswer()
        await this.peer.setLocalDescription(answer)
        console.log('📤 answer created')
        return answer
    }

    async acceptAnswer(sdp: RTCSessionDescriptionInit) {
        console.log('📥 accepting answer')
        await this.peer.setRemoteDescription(sdp)
    }

    async addIceCandidate(c: RTCIceCandidate) {
        console.log('➕ adding ICE candidate', c)
        await this.peer.addIceCandidate(c)
    }

    sendMessage(text: string) {
        console.log('📤 отправка сообщения:', text)
        this.channel?.send(text)
    }

    close() {
        console.log('❌ peer closed')
        if (this.monitorInterval) clearInterval(this.monitorInterval)
        this.channel?.close()
        this.peer.close()
    }

    private setupChannel() {
        if (!this.channel) return

        this.channel.onmessage = (e) => {
            console.log('📨 получено сообщение:', e.data)
            for (const l of this.listeners) l(e.data)
        }

        this.channel.onerror = (err) => {
            console.error('❌ DataChannel error:', err)
        }
    }

    private monitorState() {
        if (this.monitorInterval) clearInterval(this.monitorInterval)
        this.monitorInterval = setInterval(() => {
            if (this.channel?.readyState === 'open') {
                console.log('📡 channel readyState:', this.channel?.readyState)
            }
        }, 1000)
    }
}
