interface Chat {
    uuid: string;
    chatName: string;
}

interface Props {
    chatHistory: Chat[];
    setMode: (v: 'idle' | 'host' | 'join') => void;
}

export const Sidebar = ({ chatHistory, setMode }: Props) => {
    return (
        <aside style={{
            width: '250px',
            backgroundColor: '#4d0000',
            color: 'white',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <button
                style={{ backgroundColor: '#660000', color: 'white', padding: '0.5rem' }}
                onClick={() => setMode('host')}
            >
                🔗 Создать соединение
            </button>
            <button
                style={{ backgroundColor: '#660000', color: 'white', padding: '0.5rem' }}
                onClick={() => setMode('join')}
            >
                🔌 Подключиться по PIN
            </button>

            <div>
                <h3 style={{ marginBottom: '0.5rem' }}>Чаты</h3>
                <ul style={{
                    listStyle: 'none', padding: 0, margin: 0,
                    display: 'flex', flexDirection: 'column', gap: '0.25rem'
                }}>
                    {chatHistory.map(chat => (
                        <li key={chat.uuid} style={{
                            backgroundColor: '#800000',
                            padding: '0.5rem',
                            borderRadius: '0.5rem'
                        }}>
                            {chat.chatName}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};
