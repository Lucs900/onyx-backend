type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'footer' | 'nav';
};

export function Container({
  children,
  className = '',
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-content px-5 sm:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
