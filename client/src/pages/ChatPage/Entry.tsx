import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "./Layout";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

import { useChatLogs } from "@features/chat/model/useChatLogs";
import { useSendMessage } from "@features/chat/model/useSendMessage";
import { useStartAsHost } from "@features/chat/model/useStartAsHost";
import { useReconnect } from "@features/chat/model/useReconnect";
import { useChatHistory } from "@features/chat/model/useChatHistory";
import { usePinTimer } from "@features/chat/model/usePinTimer";
import { getOrGenerateUUID } from "@shared/lib/generateUUID.ts";
import { WebSocketClient } from "@shared/api/WebSocketClient.ts";
import { RTCPeer } from "@shared/api/RTCPeer.ts";
import { handleMessage } from "@shared/lib/handleMessage.ts";
import { generatePin } from "@shared/lib/generatePin.ts";
import { Main } from "@pages/ChatPage/Main.tsx";

export const EntryPage = () => {
  const [input, setInput] = useState("");
  const [targetId, setTargetId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [mode, setMode] = useState<"idle" | "host" | "join">("idle");
  const [chatHistory, setChatHistory] = useState<{ uuid: string; chatName: string }[]>([]);
  const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocketClient | null>(null);
  const peer = useRef<RTCPeer | null>(null);
  const isReconnecting = useRef(false);

  const { log, addLog, setLog } = useChatLogs();
  const { pin, setPin, clearPinTimer } = usePinTimer(mode);
  const uuid = useMemo(() => getOrGenerateUUID(), []);
  const loadChatHistory = useChatHistory(setChatHistory);
  const send = useSendMessage(peer, addLog);
  const startAsHost = useStartAsHost({
    wsRef,
    peerRef: peer,
    targetId,
    setStatus,
    addLog,
    isReconnecting,
  });

  const reconnect = useReconnect({
    uuid,
    wsRef,
    peer,
    status,
    connectedPeerId,
    setConnectedPeerId,
    setStatus,
    setMode,
    addLog,
    setLog,
    isReconnecting,
  });

  useEffect(() => {
    if (wsRef.current || status === "connected") return;

    const ws = new WebSocketClient(uuid, mode === "join" ? pin : undefined);
    wsRef.current = ws;
    console.log("[EntryPage] WebSocket создан:", { uuid, pin, mode });

    ws.onMessage(async msg => {
      handleMessage({
        msg,
        selfId: uuid,
        peer,
        wsRef,
        status,
        setConnectedPeerId,
        setStatus,
        setMode,
        setLog,
        addLog,
        clearPinTimer,
        loadChatHistory,
      });
    });

    return () => {
      console.log("[EntryPage] cleanup");
      peer.current?.close();
      ws.close(1000, "unmount cleanup");
      wsRef.current = null;
      peer.current = null;
    };
  }, [mode, uuid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    if (mode !== "join") return;
    isReconnecting.current = false;
    const interval = setInterval(() => {
      const newPin = generatePin();
      setPin(newPin);
      console.log("[PIN] Обновлён:", newPin);
    }, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (wsRef.current && wsRef.current.getSocketReadyState() === WebSocket.OPEN) {
        wsRef.current.send({ type: "disconnect", to: connectedPeerId });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [connectedPeerId]);

  return (
    <Layout
      header={<Header />}
      sidebar={
        <Sidebar
          chatHistory={chatHistory}
          setMode={setMode}
          reconnect={reconnect}
          connectedPeerId={connectedPeerId}
          onDeleteAll={() => {
            indexedDB.deleteDatabase("chatHistory");
            localStorage.removeItem("uuid");
            setChatHistory([]);
            setConnectedPeerId(null);
            setStatus("idle");
            setMode("idle");
            setLog([]);
          }}
          onFinishChat={() => {
            peer.current?.close();
            peer.current = null;
            wsRef.current?.close(1000, "manual disconnect");
            wsRef.current = null;
            setConnectedPeerId(null);
            setStatus("idle");
            setMode("idle");
            setLog([]);
          }}
        />
      }
      main={
        <Main
          log={log}
          input={input}
          setInput={setInput}
          send={send}
          status={status}
          mode={mode}
          pin={pin}
          isReconnecting={isReconnecting.current}
          targetId={targetId}
          setTargetId={setTargetId}
          startAsHost={startAsHost}
        />
      }
    />
  );
};
