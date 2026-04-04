interface FieldErrorProps {
  show: boolean;
  message: string;
}

export function FieldError({ show, message }: FieldErrorProps) {
  if (!show) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
