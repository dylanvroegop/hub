interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TiltCard({ children, className = '', style }: TiltCardProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
