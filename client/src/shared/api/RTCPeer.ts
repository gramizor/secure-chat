// RTCPeer.ts
import {SecureChannel} from '@shared/lib/secureChannel';

export class RTCPeer {
    private peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: ['stun:31.128.46.246:3478']
            }
        ]
    });
    private channel: RTCDataChannel | null = null;
    private listeners = new Set<(msg: string) => void>();
    private onOpenCallback: (() => void) | null = null;
    private iceCallback: ((candidate: RTCIceCandidate) => void) | null = null;
    private monitorInterval: ReturnType<typeof setInterval> | null = null;
    private isInitiator: boolean;
    private secure: SecureChannel | null = null;
    private publicKey: string | null = null;
    private pendingCandidates: RTCIceCandidate[] = [];
    private onCloseCallback: (() => void) | null = null;

    constructor(isInitiator: boolean) {
        this.isInitiator = isInitiator;

        if (!isInitiator) {
            this.peer.ondatachannel = (event) => {
                console.log('📡 ondatachannel triggered');
                this.channel = event.channel;

                this.channel.onopen = () => {
                    console.log('✅ remote DataChannel opened');
                    this.onOpenCallback?.();
                    this.monitorState();
                };

                this.setupChannel();
            };
        }

        this.peer.onicecandidate = (event) => {
            if (event.candidate && this.iceCallback) {
                console.log('📨 ICE candidate:', event.candidate);
                this.iceCallback(event.candidate);
            }
        };
    }

    onMessage(cb: (msg: string) => void) {
        this.listeners.add(cb);
    }

    onOpen(cb: () => void) {
        this.onOpenCallback = cb;
    }

    onIceCandidate(cb: (c: RTCIceCandidate) => void) {
        this.iceCallback = cb;
    }

    getPublicKey(): string {
        if (!this.publicKey) throw new Error('PublicKey is not initialized');
        return this.publicKey;
    }

    async createOffer(): Promise<{ sdp: RTCSessionDescriptionInit; publicKey: string }> {
        if (this.isInitiator) {
            this.channel = this.peer.createDataChannel("chat");
            this.channel.onopen = () => {
                console.log('✅ local DataChannel opened');
                this.onOpenCallback?.();
            };
            this.setupChannel();
            this.monitorState();
        }

        const {channel, publicKey} = await SecureChannel.initNew();
        this.secure = channel;
        this.publicKey = publicKey;

        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);
        console.log('📤 offer created');

        return {sdp: offer, publicKey};
    }

    async acceptOffer(sdp: RTCSessionDescriptionInit, remotePublicKey: string): Promise<{
        sdp: RTCSessionDescriptionInit;
        publicKey: string
    }> {
        console.log('📥 accepting offer');
        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));

        const {channel, publicKey} = await SecureChannel.initWithRemoteKey(remotePublicKey);
        this.secure = channel;
        this.publicKey = publicKey;

        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
        console.log('📤 answer created');

        this.pendingCandidates.forEach(c => this.peer.addIceCandidate(c));
        this.pendingCandidates = [];

        return {sdp: answer, publicKey};
    }

    async acceptAnswer(sdp: RTCSessionDescriptionInit, remotePublicKey: string) {
        console.log('📥 accepting answer');
        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        await this.secure?.setRemotePublicKey(remotePublicKey);

        this.pendingCandidates.forEach(c => this.peer.addIceCandidate(c));
        this.pendingCandidates = [];
    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {
        if (!this.peer.remoteDescription) {
            console.warn('⏳ remoteDescription нет, откладываю ICE');
            this.pendingCandidates.push(new RTCIceCandidate(candidate));
            return;
        }
        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    }

    async sendMessage(text: string) {
        if (!this.secure || !this.channel) return;
        const {cipher, iv} = await this.secure.encryptMessage(text);
        this.channel.send(JSON.stringify({cipher, iv}));
    }

    close() {
        console.log('❌ peer closed');
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.channel?.close();
        this.peer.close();
    }

    onClose(cb: () => void) {
        this.onCloseCallback = cb;
    }

    private setupChannel() {
        if (!this.channel) return;

        this.channel.onmessage = async (e) => {
            try {
                console.log('📨 получено сообщение:', e.data);
                const {cipher, iv} = JSON.parse(e.data);
                const msg = await this.secure!.decryptMessage(cipher, iv);
                for (const l of this.listeners) l(msg);
            } catch (err) {
                console.error('❌ ошибка расшифровки сообщения:', err);
            }
        };

        this.channel.onerror = (err) => {
            console.error('❌ DataChannel error:', err);
            this.close();
            this.onOpenCallback = null;
            this.iceCallback = null;
            this.listeners.clear();
        };
    }

    private monitorState() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
            if (this.channel?.readyState === 'open') {
                console.log('📡 channel readyState:', this.channel?.readyState);
            }
        }, 1000);
    }
}