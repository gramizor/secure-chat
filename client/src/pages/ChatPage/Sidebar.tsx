import { isPending } from "@shared/lib/pendingManager";
import { CustomButton } from "@shared/ui/Button/Button.tsx";

interface Chat {
  uuid: string;
  chatName: string;
}

interface Props {
  chatHistory: Chat[];
  setMode: (v: "idle" | "host" | "join") => void;
  reconnect: (uuid: string) => void;
  onDeleteAll: () => void;
  onFinishChat: () => void;
  connectedPeerId: string | null;
}

export const Sidebar = ({
  chatHistory,
  setMode,
  reconnect,
  onDeleteAll,
  onFinishChat,
  connectedPeerId,
}: Props) => {
  return (
    <aside
      style={{
        width: 250,
        backgroundColor: "#4d0000",
        color: "white",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 70px)",
        boxSizing: "border-box",
      }}
    >
      {/* Верхние кнопки */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <CustomButton style={{ color: "white", padding: "0.5rem" }} onClick={() => setMode("host")}>
          Создать соединение
        </CustomButton>
        <CustomButton style={{ color: "white", padding: "0.5rem" }} onClick={() => setMode("join")}>
          Подключиться по PIN
        </CustomButton>
      </div>

      {/* История чатов */}
      <div style={{ flex: 1, overflowY: "auto", margin: "1rem 0" }}>
        <h3 style={{ marginBottom: "7px" }}>История чатов</h3>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {chatHistory.map(chat => {
            const pending = isPending(chat.uuid);
            const isDisabled = pending || connectedPeerId === chat.uuid;

            return (
              <li
                key={chat.uuid}
                style={{
                  backgroundColor: "#800000",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                }}
              >
                <CustomButton
                  isDisabled={isDisabled}
                  style={{
                    width: "100%",
                    backgroundColor: pending ? "#4a0000" : "#990000",
                    borderRadius: "6px",
                  }}
                  onClick={() => reconnect(chat.uuid)}
                  title={pending ? "Ожидает ответа" : undefined}
                >
                  {chat.chatName} {pending ? "❗" : ""}
                </CustomButton>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Нижние кнопки */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <CustomButton onClick={onDeleteAll}>Удалить все соединения и UUID</CustomButton>

        <CustomButton onClick={onFinishChat}>Завершить чат</CustomButton>
      </div>
    </aside>
  );
};
