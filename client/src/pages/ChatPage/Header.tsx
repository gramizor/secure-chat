// pages/ChatPage/Header.tsx

export const Header = () => {
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
                <img src="/logo.png" alt="logo" width="50" height="50"/>
            </div>
        </header>
    );
};
