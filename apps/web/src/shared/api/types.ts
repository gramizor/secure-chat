export type SocketMessageType =
    | { type: 'test'; payload: string }
    | { type: 'offer'; payload: RTCSessionDescriptionInit }
    | { type: 'answer'; payload: RTCSessionDescriptionInit }
    | { type: 'ice-candidate'; payload: RTCIceCandidateInit }
    | { type: 'session-closed'; payload: string }
