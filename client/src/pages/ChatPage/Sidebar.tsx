import {isPending} from "@shared/lib/pendingManager";

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
}

export const Sidebar = ({
                            chatHistory,
                            setMode,
                            reconnect,
                            onDeleteAll,
                            onFinishChat,
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
            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                <button
                    style={{backgroundColor: "#660000", color: "white", padding: "0.5rem"}}
                    onClick={() => setMode("host")}
                >
                    🔗 Создать соединение
                </button>
                <button
                    style={{backgroundColor: "#660000", color: "white", padding: "0.5rem"}}
                    onClick={() => setMode("join")}
                >
                    🔌 Подключиться по PIN
                </button>
            </div>

            {/* История чатов с прокруткой */}
            <div style={{flex: 1, overflowY: "auto", margin: "1rem 0"}}>
                <h3>История чатов</h3>
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
                    {chatHistory.map((chat) => (
                        <li
                            key={chat.uuid}
                            style={{
                                backgroundColor: "#800000",
                                padding: "0.5rem",
                                borderRadius: "0.5rem",
                            }}
                        >
                            <button
                                disabled={isPending(chat.uuid)}
                                style={{
                                    width: "100%",
                                    backgroundColor: isPending(chat.uuid) ? "#4a0000" : "#990000",
                                    color: "white",
                                    padding: "0.5rem",
                                    borderRadius: "6px",
                                    cursor: isPending(chat.uuid) ? "not-allowed" : "pointer",
                                }}
                                onClick={() => reconnect(chat.uuid)}
                                title={isPending(chat.uuid) ? "Соединение активно" : undefined}
                            >
                                {chat.chatName} {isPending(chat.uuid) ? "✅" : ""}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Нижние кнопки */}
            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                <button
                    style={{
                        backgroundColor: "#990000",
                        color: "white",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                    onClick={onDeleteAll}
                >
                    🧨 Удалить все соединения и UUID
                </button>

                <button
                    style={{
                        backgroundColor: "#990000",
                        color: "white",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                    onClick={onFinishChat}
                >
                    🔌 Завершить чат
                </button>
            </div>
        </aside>
    );
};
