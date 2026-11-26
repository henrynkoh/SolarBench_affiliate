import { useState } from 'react';
import { Sun } from 'lucide-react';

interface HardwareImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
}

export function HardwareImage({
  src,
  alt,
  title,
  className = 'w-full h-full object-cover',
}: HardwareImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 p-4 text-center"
        role="img"
        aria-label={alt}
      >
        <Sun className="w-7 h-7 text-amber-600 mb-2" strokeWidth={1.75} />
        <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[180px]">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
