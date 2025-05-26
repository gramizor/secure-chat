// pages/ChatPage/Header.tsx
import type {Dispatch, SetStateAction} from "react";
import {RTCPeer} from "@shared/api/RTCPeer";
import {WebSocketClient} from "@shared/api/WebSocketClient";

interface Props {
    peer: React.MutableRefObject<RTCPeer | null>;
    wsRef: React.MutableRefObject<WebSocketClient | null>;
    setConnectedPeerId: Dispatch<SetStateAction<string | null>>;
    setStatus: Dispatch<SetStateAction<'idle' | 'connecting' | 'connected'>>;
    setLog: Dispatch<SetStateAction<string[]>>;
    setMode: Dispatch<SetStateAction<'idle' | 'host' | 'join'>>;
}

export const Header = ({
                           peer,
                           wsRef,
                           setConnectedPeerId,
                           setStatus,
                           setLog,
                           setMode,
                       }: Props) => {
    const handleEndChat = () => {
        peer.current?.close();
        wsRef.current?.close(1000, 'chat closed');
        setConnectedPeerId(null);
        setStatus('idle');
        setMode('idle');
        setLog([]);
    };

    const handleDeleteAll = () => {
        indexedDB.deleteDatabase("chat-store");
        location.reload();
    };

    return (
        <header style={{
            backgroundColor: 'black',
            color: 'white',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h1 style={{margin: 0}}>Secure chat</h1>
            <div style={{display: 'flex', gap: '0.5rem'}}>
                <button onClick={handleEndChat}>Завершить чат</button>
                <button onClick={handleDeleteAll}>Удалить все</button>
            </div>
        </header>
    );
};
