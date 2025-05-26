interface CustomInputProps {
    value: string;
    onChange: (v: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    rows?: number;
    style?: React.CSSProperties;
}

export const CustomInput = ({
                                value,
                                onChange,
                                onKeyDown,
                                disabled = false,
                                placeholder = "Введите сообщение...",
                                rows = 1,
                                style
                            }: CustomInputProps) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: 8,
            backgroundColor: 'black',
            color: 'white',
            border: '1px solid #555',
            resize: 'none',
            fontFamily: 'inherit', // 👈 обеспечит одинаковый шрифт
            ...style
        }}
    />
);
