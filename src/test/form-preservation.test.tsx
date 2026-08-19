import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DomainForm } from "@/app/dominios/domain-form";
import {
  initialActionState,
  rejectSubmission,
  submittedValues,
  type ActionState,
} from "@/lib/forms/action-state";

const clients = [
  { id: "a", name: "Ana Ativa", status: "active", tradeName: "Estúdio Ana", website: "ana.com.br" },
];

const savedDomain = {
  autoRenew: true,
  clientId: "a",
  cost: 40,
  domain: "exemplo.com.br",
  expiresOn: "2027-01-10",
  id: "11111111-1111-4111-8111-111111111111",
  notes: "renova pelo painel",
  paymentResponsibility: "Empresa",
  registrar: "godaddy.com",
};

/** Recusa tudo, como o servidor faria com um domínio malformado. */
async function alwaysRejects(_state: ActionState, formData: FormData): Promise<ActionState> {
  return rejectSubmission(formData, "Revise o campo Domínio.", {
    domain: "Informe só o endereço, como exemplo.com.br.",
  });
}

/** O combobox de cliente é obrigatório aqui; sem escolher, o browser nem envia. */
async function chooseClient(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Cliente" }));
  await user.click(screen.getByRole("option", { name: /Ana Ativa/ }));
  await user.type(screen.getByRole("combobox", { name: "Data de expiração" }), "10012027");
}

describe("preservação do formulário quando o servidor recusa", () => {
  it("devolve o que foi digitado em vez de esvaziar a tela", async () => {
    const user = userEvent.setup();
    render(<DomainForm action={alwaysRejects} clients={clients} />);

    await chooseClient(user);
    await user.type(screen.getByPlaceholderText("exemplo.com.br"), "meu site");
    await user.clear(screen.getByPlaceholderText("Ex.: Empresa"));
    await user.type(screen.getByPlaceholderText("Ex.: Empresa"), "Cliente paga");
    await user.click(screen.getByText(/Mais detalhes/));
    await user.type(screen.getByPlaceholderText(/godaddy/), "registro.br");
    await user.type(screen.getByPlaceholderText(/Login usado/), "combinado por e-mail");

    await user.click(screen.getByRole("button", { name: "Criar domínio" }));
    await screen.findByText("Informe só o endereço, como exemplo.com.br.");

    // O React devolve campo não controlado ao defaultValue quando a action termina; sem
    // reenviar os valores, tudo abaixo voltaria vazio por causa de um campo só.
    expect(screen.getByPlaceholderText("exemplo.com.br")).toHaveValue("meu site");
    expect(screen.getByPlaceholderText("Ex.: Empresa")).toHaveValue("Cliente paga");
    expect(screen.getByPlaceholderText(/godaddy/)).toHaveValue("registro.br");
    expect(screen.getByPlaceholderText(/Login usado/)).toHaveValue("combinado por e-mail");
  });

  it("abre o disclosure quando o erro está escondido lá dentro", async () => {
    const user = userEvent.setup();
    async function rejectsRegistrar(_state: ActionState, formData: FormData): Promise<ActionState> {
      return rejectSubmission(formData, "Revise o campo Registrador.", {
        registrar: "Registrador inválido.",
      });
    }
    render(<DomainForm action={rejectsRegistrar} clients={clients} />);

    await chooseClient(user);
    await user.type(screen.getByPlaceholderText("exemplo.com.br"), "exemplo.com.br");
    await user.clear(screen.getByPlaceholderText("Ex.: Empresa"));
    await user.type(screen.getByPlaceholderText("Ex.: Empresa"), "Empresa");
    await user.click(screen.getByRole("button", { name: "Criar domínio" }));

    // Apontar um campo atrás de um disclosure fechado é o mesmo que não apontar.
    expect(await screen.findByText("Registrador inválido.")).toBeVisible();
  });

  it("mantém desmarcada a caixa que o usuário desmarcou de propósito", async () => {
    const user = userEvent.setup();
    render(<DomainForm action={alwaysRejects} clients={clients} domain={savedDomain} />);

    const autoRenew = screen.getByRole("checkbox", { name: /Renovação automática/ });
    expect(autoRenew).toBeChecked();

    await user.click(autoRenew);
    await user.click(screen.getByRole("button", { name: "Salvar domínio" }));
    await screen.findByText("Informe só o endereço, como exemplo.com.br.");

    // Checkbox sem marca não chega no FormData, então voltar ao valor salvo desfaria a
    // escolha do usuário justamente no envio que falhou.
    expect(screen.getByRole("checkbox", { name: /Renovação automática/ })).not.toBeChecked();
  });
});

describe("leitura dos valores devolvidos", () => {
  const state = rejectSubmission(
    (() => {
      const formData = new FormData();
      formData.set("name", "Padaria");
      formData.set("autoRenew", "on");
      formData.append("linkLabel", "Painel");
      formData.append("linkLabel", "Drive");
      return formData;
    })(),
    "Revise os dados.",
  );

  it("separa 'ainda não enviei' de 'enviei e foi recusado'", () => {
    expect(submittedValues(initialActionState).resubmitting).toBe(false);
    expect(submittedValues(state).resubmitting).toBe(true);
    // Sem envio, o valor do registro prevalece; depois da recusa, o que foi digitado.
    expect(submittedValues(initialActionState).text("name", "Do banco")).toBe("Do banco");
    expect(submittedValues(state).text("name", "Do banco")).toBe("Padaria");
  });

  it("preserva campos repetidos, como os links do cliente", () => {
    expect(submittedValues(state).list("linkLabel")).toEqual(["Painel", "Drive"]);
  });

  it("trata a ausência da chave como caixa desmarcada, não como valor do registro", () => {
    expect(submittedValues(state).checkbox("autoRenew", false)).toBe(true);
    expect(submittedValues(state).checkbox("ausente", true)).toBe(false);
    expect(submittedValues(initialActionState).checkbox("ausente", true)).toBe(true);
  });
});
