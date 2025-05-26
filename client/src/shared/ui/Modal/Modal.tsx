import type {ReactNode} from "react";

export const Modal = ({ children }: { children: ReactNode }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                color: 'black',
                padding: '2rem',
                borderRadius: '12px',
                width: '300px',
                textAlign: 'center'
            }}>
                {children}
            </div>
        </div>
    );
};
