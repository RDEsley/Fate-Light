"use client";

type ConfirmSubmitButtonProps = {
  className?: string;
  confirmation: string;
  label: string;
};

export function ConfirmSubmitButton({ className, confirmation, label }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      type="submit"
    >
      {label}
    </button>
  );
}
