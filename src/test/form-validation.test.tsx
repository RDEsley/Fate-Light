import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useActionState, useState } from "react";
import { afterEach, beforeEach, vi } from "vitest";

import { FormActions, FormSection, TextField, ToggleCard } from "@/components/ui/field";
import { describeValidity, Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { FormMore, FormPanel } from "@/components/ui/form-panel";
import { MoneyField } from "@/components/ui/money-field";
import { OpenPanelLink } from "@/components/ui/open-panel-link";
import { PercentField } from "@/components/ui/percent-field";
import { clearToasts } from "@/components/ui/toast-store";
import { Toaster } from "@/components/ui/toaster";
import {
  initialActionState,
  rejectSubmission,
  type ActionState,
} from "@/lib/forms/action-state";

/** Action de formulário que só registra a chamada. */
const formAction = () => vi.fn<(formData: FormData) => void>();

describe("retorno de erro dos formulários", () => {
  beforeEach(() => clearToasts());
  afterEach(() => act(() => clearToasts()));

  it("barra o envio, marca o campo e avisa pela pilha em vez do balão do navegador", async () => {
    const user = userEvent.setup();
    const action = formAction();
    const { container } = render(
      <>
        <Toaster />
        <Form action={action}>
          <TextField label="Nome" name="name" required />
          <button type="submit">Salvar</button>
        </Form>
      </>,
    );

    // `noValidate` desliga o balão nativo: a recusa passa a ser do sistema.
    expect(container.querySelector("form")).toHaveAttribute("novalidate");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(action).not.toHaveBeenCalled();
    const field = screen.getByLabelText("Nome");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(document.getElementById(field.getAttribute("aria-describedby")!)).toHaveTextContent(
      "Preencha este campo.",
    );
    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("Revise o formulário");
    expect(toast).toHaveTextContent("Confira o campo “Nome”.");
  });

  it("abre o bloco recolhido que esconde o campo obrigatório", async () => {
    const user = userEvent.setup();
    const action = formAction();
    render(
      <Form action={action}>
        <TextField defaultValue="Gestão" label="Nome" name="name" required />
        <FormMore title="Personalizar preço e agenda">
          <DateField label="Início do serviço" name="startDate" required />
        </FormMore>
        <button type="submit">Aplicar serviço</button>
      </Form>,
    );

    const disclosure = screen.getByText("Personalizar preço e agenda").closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    // Antes o envio era barrado em silêncio: o campo obrigatório estava num bloco fechado
    // e o navegador não tinha como apontá-lo. Agora o bloco abre e o campo recebe o foco.
    expect(action).not.toHaveBeenCalled();
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Informe a data.")).toBeVisible();
    expect(screen.getByLabelText("Início do serviço")).toHaveFocus();
  });

  it("resume a quantidade quando há mais de um campo a revisar", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <Form action={formAction()}>
          <TextField label="Nome" name="name" required />
          <MoneyField label="Valor" name="amount" required />
          <button type="submit">Salvar</button>
        </Form>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("2 campos precisam de atenção");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveAttribute("aria-invalid", "true");
  });

  it("tira a marca assim que o usuário corrige o campo", async () => {
    const user = userEvent.setup();
    render(
      <Form action={formAction()}>
        <TextField label="Nome" name="name" required />
        <MoneyField label="Valor" name="amount" required />
        <button type="submit">Salvar</button>
      </Form>,
    );

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getAllByText("Preencha este campo.")).toHaveLength(2);

    await user.type(screen.getByLabelText("Nome"), "P");
    expect(screen.getByLabelText("Nome")).not.toHaveAttribute("aria-invalid");
    // Campo mascarado troca o valor por estado, sem evento nativo de digitação.
    await user.click(screen.getByRole("textbox", { name: "Valor" }));
    await user.keyboard("5");
    expect(screen.queryByText("Preencha este campo.")).not.toBeInTheDocument();
  });

  it("traduz e-mail malformado e texto curto em mensagens próprias", async () => {
    const user = userEvent.setup();
    render(
      <Form action={formAction()}>
        <TextField label="E-mail" name="email" type="email" />
        <TextField label="Motivo" minLength={4} name="reason" />
        <button type="submit">Salvar</button>
      </Form>,
    );

    await user.type(screen.getByLabelText("E-mail"), "sem-arroba");
    await user.type(screen.getByLabelText("Motivo"), "ab");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText(/Informe um e-mail válido/)).toBeInTheDocument();
    expect(screen.getByText("Use pelo menos 4 caracteres.")).toBeInTheDocument();
  });

  it("não aceita campo obrigatório preenchido só com espaços", async () => {
    const user = userEvent.setup();
    const action = formAction();
    render(
      <Form action={action}>
        <TextField label="Nome" name="name" required />
        <button type="submit">Salvar</button>
      </Form>,
    );

    // O navegador considera "   " preenchido; o servidor apara o texto e recusa.
    await user.type(screen.getByLabelText("Nome"), "   ");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Preencha este campo.")).toBeInTheDocument();
  });

  it("aplica as regras entre campos e envia quando tudo confere", async () => {
    const user = userEvent.setup();
    const action = formAction();
    const validate = (formData: FormData): Record<string, string> =>
      formData.get("name") === "proibido" ? { name: "Escolha outro nome." } : {};
    render(
      <Form action={action} validate={validate}>
        <TextField label="Nome" name="name" required />
        <button type="submit">Salvar</button>
      </Form>,
    );

    await user.type(screen.getByLabelText("Nome"), "proibido");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("Escolha outro nome.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Padaria");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("barra o percentual acima do limite no próprio formulário", async () => {
    const user = userEvent.setup();
    const action = formAction();
    render(
      <Form action={action}>
        <PercentField label="Desconto" name="discountValue" />
        <button type="submit">Salvar</button>
      </Form>,
    );

    await user.type(screen.getByRole("textbox", { name: "Desconto" }), "150");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText(/no máximo 100%/i)).toBeInTheDocument();
  });

  it("mostra a recusa do servidor no campo e na pilha, e confirma o sucesso", async () => {
    const user = userEvent.setup();
    async function serverAction(_state: ActionState, formData: FormData): Promise<ActionState> {
      return formData.get("name") === "ok"
        ? { message: "Perfil atualizado com segurança.", status: "success" }
        : rejectSubmission(formData, "Revise o campo Nome do serviço.", {
            name: "Já existe um serviço com esse nome.",
          });
    }
    function ServerForm() {
      const [state, formAction] = useActionState(serverAction, initialActionState);
      return (
        <Form action={formAction} state={state}>
          <TextField label="Nome" name="name" required />
          <button type="submit">Salvar</button>
        </Form>
      );
    }
    render(
      <>
        <Toaster />
        <ServerForm />
      </>,
    );

    await user.type(screen.getByLabelText("Nome"), "Gestão");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Já existe um serviço com esse nome.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Revise o campo Nome do serviço.");
    expect(screen.getByLabelText("Nome")).toHaveFocus();

    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "ok");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado com segurança.")).toBeInTheDocument();
    expect(screen.queryByText("Já existe um serviço com esse nome.")).not.toBeInTheDocument();
  });
});

describe("peças de formulário", () => {
  it("revela os campos extras só com a chave ligada", async () => {
    const user = userEvent.setup();
    function Promotion() {
      const [promotion, setPromotion] = useState(false);
      return (
        <ToggleCard
          checked={promotion}
          description="Outro valor nas primeiras cobranças."
          onCheckedChange={setPromotion}
          title="Preço promocional"
        >
          {promotion ? <MoneyField label="Valor promocional" name="promotionalPrice" /> : null}
        </ToggleCard>
      );
    }
    render(<Promotion />);

    expect(screen.queryByRole("textbox", { name: "Valor promocional" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Preço promocional/ }));
    expect(screen.getByRole("textbox", { name: "Valor promocional" })).toBeInTheDocument();
  });

  it("agrupa campos sob um título e alinha as ações no rodapé", () => {
    render(
      <FormSection description="O que entra na cobrança." title="Repasses">
        <FormActions>
          <button type="button">Cancelar</button>
        </FormActions>
      </FormSection>,
    );

    expect(screen.getByRole("group", { name: "Repasses" })).toHaveTextContent(
      "O que entra na cobrança.",
    );
    expect(screen.getByRole("button", { name: "Cancelar" }).parentElement).toHaveClass(
      "form-actions",
    );
  });

  it("abre o painel pelo atalho e foca o primeiro campo", async () => {
    const user = userEvent.setup();
    render(
      <>
        <OpenPanelLink href="?action=new-service#adicionar-servico" panelId="adicionar-servico">
          Adicionar serviço
        </OpenPanelLink>
        <FormPanel description="Do catálogo ou personalizado" id="adicionar-servico" title="Novo">
          <TextField label="Nome exibido no cliente" name="name" />
        </FormPanel>
      </>,
    );

    const panel = document.getElementById("adicionar-servico")!;
    expect(panel).not.toHaveAttribute("open");

    await user.click(screen.getByRole("link", { name: "Adicionar serviço" }));

    expect(panel).toHaveAttribute("open");
    expect(screen.getByLabelText("Nome exibido no cliente")).toHaveFocus();
  });

  it("deixa o link seguir o caminho normal quando o painel não está na página", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn((event: Event) => event.preventDefault());
    render(
      <div onClick={(event) => onNavigate(event.nativeEvent)}>
        <OpenPanelLink href="?action=new-service#adicionar-servico" panelId="adicionar-servico">
          Adicionar serviço
        </OpenPanelLink>
      </div>,
    );

    await user.click(screen.getByRole("link", { name: "Adicionar serviço" }));

    // Sem o painel, quem resolve é a navegação: a página abre o formulário pela URL.
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls[0]![0].defaultPrevented).toBe(true);
  });

  it("começa aberto quando a página pede e alterna pelo cabeçalho", async () => {
    const user = userEvent.setup();
    render(
      <FormPanel defaultOpen title="Nova despesa" tone="danger">
        <p>Conteúdo do painel</p>
      </FormPanel>,
    );

    const panel = screen.getByText("Nova despesa").closest("details")!;
    expect(panel).toHaveAttribute("open");

    await user.click(screen.getByText("Nova despesa"));
    expect(panel).not.toHaveAttribute("open");
  });
});

describe("mensagens das restrições do navegador", () => {
  const hosts: HTMLFormElement[] = [];

  function control(html: string) {
    const host = document.createElement("form");
    host.innerHTML = html;
    document.body.append(host);
    hosts.push(host);
    return host.firstElementChild as HTMLInputElement;
  }

  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
  });

  it("explica cada recusa em português", () => {
    expect(describeValidity(control('<input type="checkbox" required>'))).toBe(
      "Marque esta opção para continuar.",
    );
    expect(
      describeValidity(control('<input required data-required-message="Informe a data.">')),
    ).toBe("Informe a data.");

    const address = control('<input type="url">');
    address.value = "sem protocolo";
    expect(describeValidity(address)).toBe("Informe um endereço válido.");

    const code = control('<input pattern="[0-9]+" data-pattern-message="Use só números.">');
    code.value = "abc";
    expect(describeValidity(code)).toBe("Use só números.");

    const plain = control('<input pattern="[0-9]+">');
    plain.value = "abc";
    expect(describeValidity(plain)).toBe("Confira o formato deste campo.");

    const custom = control("<input>");
    custom.setCustomValidity("Escolha um cliente da lista.");
    expect(describeValidity(custom)).toBe("Escolha um cliente da lista.");
  });

  it("barra o envio mesmo quando o controle não tem nome para receber a mensagem", async () => {
    const user = userEvent.setup();
    const action = formAction();
    render(
      <>
        <Toaster />
        <Form action={action}>
          <input aria-label="Frase de confirmação" required />
          <button type="submit">Salvar</button>
        </Form>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Confira o campo destacado em vermelho.");
    expect(screen.getByLabelText("Frase de confirmação")).toHaveFocus();
  });
});

describe("nome acessível dos campos", () => {
  it("separa o rótulo da marca de opcional", () => {
    render(<TextField label="E-mail" name="email" optional />);

    // Sem o espaço o leitor de tela anunciava "E-mailopcional" e a busca por rótulo falhava.
    expect(screen.getByLabelText("E-mail opcional")).toBeInTheDocument();
  });
});
