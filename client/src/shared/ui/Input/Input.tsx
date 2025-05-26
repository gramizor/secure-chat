interface CustomInputProps {
    value: string;
    onChange: (v: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    rows?: number;
    style?: React.CSSProperties;
    isDisabled?: boolean;
}

export const CustomInput = ({
                                value,
                                onChange,
                                onKeyDown,
                                placeholder = "Введите сообщение...",
                                rows = 1,
                                style,
                                isDisabled = false,
                            }: CustomInputProps) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={rows}
        placeholder={placeholder}
        disabled={isDisabled}
        style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: 8,
            backgroundColor: 'black',
            color: 'white',
            border: '1px solid #555',
            resize: 'none',
            fontFamily: 'inherit', // 👈 обеспечит одинаковый шрифт
            cursor: isDisabled ? 'not-allowed' : 'text',
            ...style
        }}
    />
);
