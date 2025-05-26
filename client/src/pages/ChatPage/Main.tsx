import { useEffect, useRef } from "react";
import { CustomInput } from "@shared/ui/Input/Input.tsx";
import { CustomButton } from "@shared/ui/Button/Button.tsx";

interface Props {
  input: string;
  setInput: (v: string) => void;
  log: string[];
  status: "idle" | "connecting" | "connected";
  send: (input: string, status: "idle" | "connecting" | "connected", clear: () => void) => void;
  mode: "idle" | "host" | "join";
  pin: string;
  isReconnecting: boolean;
  targetId: string;
  setTargetId: (v: string) => void;
  startAsHost: () => void;
}

export const Main = ({
  input,
  setInput,
  log,
  status,
  send,
  mode,
  pin,
  isReconnecting,
  targetId,
  setTargetId,
  startAsHost,
}: Props) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
      {mode === "join" && !isReconnecting && (
        <div
          style={{
            backgroundColor: "#330000",
            padding: "1rem",
            borderRadius: "8px",
            marginTop: "1rem",
            color: "white",
          }}
        >
          <p>Скопируй этот PIN и отправь другу:</p>
          <h2
            style={{
              fontWeight: "bold",
              fontSize: "2rem",
              letterSpacing: "0.1em",
              margin: "0.5rem 0",
            }}
          >
            {pin}
          </h2>
          <CustomButton onClick={() => navigator.clipboard.writeText(pin)}>
            Скопировать
          </CustomButton>
        </div>
      )}

      {mode === "host" && !isReconnecting && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#330000",
            padding: "1rem",
            borderRadius: "8px",
            marginTop: "1rem",
            gap: "15px",
          }}
        >
          <p>Вставь UUID друга:</p>
          <CustomInput
            value={targetId}
            onChange={setTargetId}
            placeholder="UUID подключающегося"
            style={{ width: "100%" }}
            rows={1}
          />
          <CustomButton onClick={startAsHost} isDisabled={!targetId.trim()}>
            Начать соединение
          </CustomButton>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column-reverse",
          paddingBottom: "1rem",
        }}
      >
        <div style={{ paddingBottom: "1rem" }}>
          {log.length === 0 ? (
            <div style={{ color: "#aaa", fontSize: "1rem", margin: "auto", textAlign: "center" }}>
              {status === "connecting"
                ? "Устанавливаем соединение..."
                : status === "connected"
                  ? "Начните общаться!"
                  : "Здесь будут сообщения"}
            </div>
          ) : (
            <>
              {log.map((entry, i) => {
                const isMine = entry.startsWith("🧍");
                const text = isMine ? entry.slice(2) : entry;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMine ? "flex-end" : "flex-start",
                      marginBottom: "0.5rem",
                      maxWidth: "100%",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "#ccc", marginBottom: 4 }}>
                      {isMine ? "Вы:" : "Собеседник:"}
                    </span>
                    <div
                      style={{
                        background: isMine ? "#ffffff" : "#dddddd",
                        color: "#000",
                        padding: "0.5rem 1rem",
                        borderRadius: "12px",
                        wordBreak: "break-word",
                        maxWidth: "70%",
                      }}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <CustomInput
          value={input}
          onChange={setInput}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input, status, () => setInput(""));
            }
          }}
          isDisabled={status !== "connected"}
        />
        <CustomButton
          onClick={() => send(input, status, () => setInput(""))}
          isDisabled={status !== "connected"}
          backgroundColor="#4D0000"
        >
          Отправить
        </CustomButton>
      </div>
    </div>
  );
};
