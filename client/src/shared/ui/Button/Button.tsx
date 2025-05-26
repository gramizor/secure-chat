interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  backgroundColor?: string;
  textColor?: string;
  isDisabled?: boolean;
}
// backgroundColor — цвет кнопки
// textColor — цвет текста
// style — для дополнительных override'ов
// ...props — onClick, disabled и прочее

export const CustomButton = ({
  children,
  backgroundColor = "#7C0000",
  textColor = "white",
  style,
  isDisabled = false,
  ...props
}: CustomButtonProps) => (
  <button
    {...props}
    style={{
      padding: "0.5rem 1rem",
      backgroundColor,
      color: textColor,
      borderRadius: 8,
      border: "none",
      cursor: isDisabled ? "not-allowed" : "pointer",
      ...style,
    }}
  >
    {children}
  </button>
);
