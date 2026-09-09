import { Icon } from "./icon";

/**
 * Erro de um campo, sempre com o mesmo ícone e a mesma posição abaixo do controle.
 * `id` opcional permite ligar `aria-describedby` do controle ao aviso.
 */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  return message ? (
    <span className="field__error" id={id}>
      <Icon className="size-3.5" name="alert" /> {message}
    </span>
  ) : null;
}
