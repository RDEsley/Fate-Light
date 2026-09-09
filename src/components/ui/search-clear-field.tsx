"use client";

/**
 * Campo de busca das listagens: Enter envia o formulário (GET) e apagar tudo
 * restaura o estado padrão sem precisar clicar em Filtrar.
 */
export function SearchClearField({
  "aria-label": ariaLabel,
  className,
  defaultValue = "",
  name = "q",
  placeholder,
}: {
  "aria-label": string;
  className?: string;
  defaultValue?: string;
  name?: string;
  placeholder: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={className}
      defaultValue={defaultValue}
      name={name}
      onInput={(event) => {
        const input = event.currentTarget;
        const hadQuery = defaultValue.trim().length > 0;
        if (hadQuery && input.value.trim() === "" && input.form) {
          input.form.querySelectorAll('input[name="page"]').forEach((node) => node.remove());
          input.form.requestSubmit();
        }
      }}
      placeholder={placeholder}
      type="search"
    />
  );
}
