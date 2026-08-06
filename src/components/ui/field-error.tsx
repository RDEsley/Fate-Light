import { Icon } from "./icon";

/**
 * Erro de um campo, sempre com o mesmo ícone e a mesma posição abaixo do controle.
 * Existe para que a mensagem tenha uma forma só: antes cada formulário repetia o
 * markup, e as diferenças acumuladas iam aparecendo como ruído entre telas parecidas.
 */
export function FieldError({ message }: { message?: string | null }) {
  return message ? (
    <span className="field__error">
      <Icon className="size-3.5" name="alert" /> {message}
    </span>
  ) : null;
}
