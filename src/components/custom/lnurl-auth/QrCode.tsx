'use client';

import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

export function QrCode({
  value,
  size = 180,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    QRCode.toCanvas(
      canvas,
      value,
      { errorCorrectionLevel: 'M', margin: 1, width: size },
      (err) => {
        if (err) {
          console.error('Failed to render QR code:', err);
        }
      }
    );
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-md border bg-white p-2"
      style={{ width: size, height: size }}
    />
  );
}
