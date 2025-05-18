import { useLayoutEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

interface Props {
  data: string;
}

export const QRCodeBox = ({ data }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const qr = new QRCodeStyling({
      width: 260,
      height: 260,
      data,
      image: "/logo.png",
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10,
      },
      dotsOptions: {
        color: "#000000",
        type: "square",
      },
      cornersSquareOptions: {
        color: "#000000",
        type: "square",
      },
      cornersDotOptions: {
        color: "#000000",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
    });

    qr.append(ref.current);

    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [data]);

  return <div ref={ref} />;
};
