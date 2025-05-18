export class RTCPeer {
  private peer = new RTCPeerConnection();
  private channel: RTCDataChannel | null = null;

  async createOffer(): Promise<string> {
    this.channel = this.peer.createDataChannel("chat");
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);

    return JSON.stringify({
      sdp: offer,
      type: "offer",
    });
  }

  async acceptAnswer(sdp: RTCSessionDescriptionInit) {
    await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async acceptOffer(sdp: RTCSessionDescriptionInit) {
    await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  getConnection(): RTCPeerConnection {
    return this.peer;
  }

  getChannel(): RTCDataChannel | null {
    return this.channel;
  }
}
