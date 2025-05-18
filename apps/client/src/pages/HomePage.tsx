import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { RTCPeer } from "@/shared/api/rtc/RTCPeer";
import { WebSocketClient } from "@/shared/api/ws/WebSocketClient";
import { generateKeyPair } from "@/shared/crypto/ecdh";
import { generatePin } from "@/shared/lib/generatePin";
import { QRCodeBox } from "@/widgets/qr/QRCodeBox";

const peerId = uuid();

export const HomePage = () => {
  const [pin, setPin] = useState("");
  const [url, setUrl] = useState("");
  const [peer, setPeer] = useState<RTCPeer | null>(null);
  const [ws, setWs] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    const socket = new WebSocketClient(peerId);
    socket.onMessage((msg) => {
      if (msg.type === "answer") {
        peer?.acceptAnswer(msg.data.sdp);
        console.log("✅ Answer принят, соединение установлено");

        // после использования сбросить
        setPin("");
        setUrl("");
        setPeer(null);

        // (опционально) сгенерировать новый
        // generateInvitation()
      }
    });
    setWs(socket);
    return () => socket.close();
  }, []);

  const generateInvitation = async () => {
    if (!ws) return;

    const p = generatePin();
    setPin(p);

    const rtc = new RTCPeer();
    const { publicKey } = generateKeyPair();
    setPeer(rtc);

    const offer = await rtc.createOffer();

    ws.send({
      type: "register-offer",
      from: peerId,
      data: {
        pin: p,
        peerId,
        sdp: JSON.parse(offer),
        publicKey,
      },
    });

    setUrl(`${window.location.origin}/join?pin=${p}`);
  };

  return (
    <div>
      <h2>👤 Peer ID: {peerId.slice(0, 8)}</h2>
      <button onClick={generateInvitation}>Создать QR + PIN</button>

      {pin && (
        <>
          <p>
            🔐 PIN: <b>{pin}</b>
          </p>
          <QRCodeBox data={url} />
          <p style={{ fontSize: 12 }}>{url}</p>
        </>
      )}
    </div>
  );
};
