import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/_actions/mvp", () => ({
  cancelCharge: vi.fn(),
  cancelDomain: vi.fn(),
  deleteDomain: vi.fn(),
  deleteOperationalRecord: vi.fn(),
  deletePaidFinancialRecord: vi.fn(),
  markChargePaid: vi.fn(),
  markExpensePaid: vi.fn(),
  reactivateDomain: vi.fn(),
  recordChargeDelayReason: vi.fn(),
  stopExpenseRecurrence: vi.fn(),
  updateDomain: vi.fn(),
}));
vi.mock("@/app/_actions/fiscal-documents", () => ({
  deleteFiscalDocument: vi.fn(),
  downloadFiscalDocument: vi.fn(),
  uploadFiscalDocument: vi.fn(),
}));

import { ChargeRow, chargeListColumns, chargeListLabels } from "@/app/cobrancas/charge-row";
import { ExpenseRow } from "@/app/despesas/expense-row";
import { DomainCard } from "@/app/dominios/domain-card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { RecordCell, RecordGroup, RecordList, RecordRow } from "@/components/ui/record-row";

const today = "2026-10-08";
const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const charge = {
  additionalFee: 150,
  additionalFeeIsRevenue: false,
  clientId,
  clientName: "Padaria Pão Dourado",
  companyRevenue: 1500,
  description: "Gestão de tráfego pago",
  dueDate: "2026-10-04",
  entityName: null,
  grossTotal: 3650,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  mediaBudget: 2000,
  status: "pending",
};

const expense = {
  amount: 249,
  categoryLabel: "Ferramentas",
  description: "Ferramenta de automação",
  dueDate: "2026-10-06",
  expenseType: "fixed",
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  monthly: true,
  recurrenceActive: true,
  status: "pending",
};

const domain = {
  autoRenew: false,
  clientEntityId: null,
  clientId,
  cost: 40,
  domain: "paodourado.example",
  expiresOn: "2026-10-13",
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  notes: "Renovação combinada com o cliente.",
  paymentResponsibility: "Cliente",
  registrar: "registro.br",
};

describe("record list", () => {
  it("mostra os rótulos das colunas e só monta os detalhes ao abrir a linha", () => {
    render(
      <RecordList columns="1fr 6rem 6rem auto 1rem" head={["Registro", "Data", "Valor", "", ""]}>
        <RecordGroup>Resolvidas</RecordGroup>
        <RecordRow
          amount="R$ 10,00"
          amountNote="receita R$ 8,00"
          cells={
            <RecordCell label="Data" note="há 2 dias">
              06/10/2026
            </RecordCell>
          }
          id="registro"
          status={<span>Pendente</span>}
          subtitle="Cliente"
          title="Registro de teste"
          tone="danger"
        >
          <p>Detalhes do registro</p>
        </RecordRow>
      </RecordList>,
    );

    expect(
      screen.getByText("Registro", { selector: ".record-list__head span" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Resolvidas")).toHaveClass("record-list__group");
    const row = document.getElementById("registro")!;
    expect(row).toHaveAttribute("data-tone", "danger");
    expect(row).not.toHaveAttribute("data-open");
    expect(screen.queryByText("Detalhes do registro")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Registro de teste" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(row).toHaveAttribute("data-open", "true");
    expect(screen.getByText("Detalhes do registro")).toBeVisible();
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toContainElement(
      screen.getByText("Detalhes do registro"),
    );

    fireEvent.click(toggle);
    expect(screen.queryByText("Detalhes do registro")).not.toBeInTheDocument();
  });

  it("já chega aberta quando um alerta leva até ela e aceita título de nível 3", () => {
    render(
      <RecordRow defaultOpen headingLevel={3} title="Linha em foco">
        <p>Conteúdo</p>
      </RecordRow>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Linha em foco" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeVisible();
  });

  it("oferece escolha única em pílulas com a opção padrão marcada", () => {
    render(
      <ChoiceChips
        defaultValue="Pix"
        label="Forma de pagamento"
        name="paymentMethod"
        options={[
          { label: "Pix", value: "Pix" },
          { label: "Boleto", value: "Boleto" },
        ]}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Forma de pagamento" });
    expect(within(group).getByRole("radio", { name: "Pix" })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: "Boleto" }));
    expect(within(group).getByRole("radio", { name: "Pix" })).not.toBeChecked();
  });
});

describe("charge row", () => {
  it("usa na lista as mesmas colunas que anuncia no cabeçalho", () => {
    expect(chargeListColumns.split(/\s+(?![^(]*\))/)).toHaveLength(chargeListLabels.length);
  });

  it("resume a cobrança vencida e separa a receita da verba de mídia", () => {
    render(<ChargeRow charge={charge} returnTo="/cobrancas" today={today} />);

    expect(screen.getByText("Vencida")).toHaveClass("charge-status--overdue");
    expect(screen.getByText("há 4 dias")).toBeInTheDocument();
    expect(screen.getByText("Padaria Pão Dourado")).toBeInTheDocument();
    expect(screen.getByText(/receita R\$\s1\.500,00/)).toBeInTheDocument();
    expect(document.getElementById(`charge-${charge.id}`)).toHaveAttribute("data-tone", "danger");
  });

  it("confirma a forma de pagamento antes de dar baixa", () => {
    render(<ChargeRow charge={charge} returnTo="/cobrancas?state=pending" today={today} />);

    fireEvent.click(screen.getByRole("button", { name: `Receber ${charge.description}` }));

    const dialog = screen.getByRole("dialog", { name: `Receber ${charge.description}` });
    expect(within(dialog).getByRole("radio", { name: "Pix" })).toBeChecked();
    const form = within(dialog).getByRole("button", { name: "Marcar como paga" }).closest("form")!;
    expect(form.querySelector('input[name="id"]')).toHaveValue(charge.id);
    expect(form.querySelector('input[name="returnTo"]')).toHaveValue("/cobrancas?state=pending");

    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guarda composição, motivo do atraso e cancelamento nos detalhes", () => {
    render(<ChargeRow charge={charge} returnTo="/cobrancas" today={today} />);

    expect(screen.queryByRole("link", { name: /ver cliente/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: charge.description }));

    expect(screen.getByText("Adicional (repasse)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver cliente/i })).toHaveAttribute(
      "href",
      `/clientes/${clientId}`,
    );
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("na ficha do cliente mostra a empresa e aponta para a lista geral", () => {
    render(
      <ChargeRow
        charge={{ ...charge, dueDate: "2026-10-20", entityName: "Unidade Centro" }}
        context="client"
        defaultOpen
        headingLevel={3}
        returnTo={`/clientes/${clientId}`}
        today={today}
      />,
    );

    expect(screen.getByText("Unidade Centro")).toBeInTheDocument();
    expect(screen.queryByText("Padaria Pão Dourado")).not.toBeInTheDocument();
    expect(screen.getByText("Pendente")).toHaveClass("charge-status--pending");
    expect(screen.getByRole("link", { name: /ver em cobranças/i })).toHaveAttribute(
      "href",
      `/cobrancas?focus=${charge.id}`,
    );
    // Cancelar pede motivo e contexto: fica só na lista de cobranças.
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it("não oferece baixa para cobrança paga nem cancelada e mostra o motivo", () => {
    const { rerender } = render(
      <ChargeRow
        charge={{ ...charge, paidAt: "2026-10-05", paymentMethod: "Pix", status: "paid" }}
        defaultOpen
        returnTo="/cobrancas"
        today={today}
      />,
    );

    expect(screen.queryByRole("button", { name: /receber/i })).not.toBeInTheDocument();
    expect(screen.getByText("05/10/2026 · Pix")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir paga" })).toBeInTheDocument();

    rerender(
      <ChargeRow
        charge={{
          ...charge,
          cancelReason: "Cliente pausou o contrato",
          cancelReasonCode: "client_withdrew",
          grossTotal: 0,
          status: "cancelled",
        }}
        defaultOpen
        returnTo="/cobrancas"
        today={today}
      />,
    );

    expect(screen.getByText("Cancelada")).toHaveClass("charge-status--cancelled");
    expect(screen.getByText("Cliente desistiu:")).toBeInTheDocument();
    expect(screen.getAllByText("Cortesia").length).toBeGreaterThan(0);
  });
});

describe("expense row", () => {
  it("avisa que pagar uma despesa mensal já agenda a próxima", () => {
    render(<ExpenseRow expense={expense} today={today} />);

    expect(screen.getByText("Vencida")).toBeInTheDocument();
    expect(screen.getByText("há 2 dias")).toBeInTheDocument();
    expect(screen.getByText("Mensal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Pagar ${expense.description}` }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/próxima ocorrência mensal é criada/i);
    expect(screen.getByRole("button", { name: "Marcar como paga" })).toBeEnabled();
  });

  it("oferece parar a série e excluir nos detalhes da despesa pendente", () => {
    render(<ExpenseRow defaultOpen expense={expense} today={today} />);

    expect(screen.getByText("Série mensal ativa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parar mensal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("troca pagar por excluir e notas fiscais quando a despesa já foi paga", () => {
    render(
      <ExpenseRow
        defaultOpen
        expense={{
          ...expense,
          clientName: "Padaria Pão Dourado",
          monthly: false,
          paidAt: "2026-10-06",
          recurrenceActive: false,
          status: "paid",
        }}
        today={today}
      />,
    );

    expect(screen.queryByRole("button", { name: /^pagar/i })).not.toBeInTheDocument();
    expect(screen.getByText("Ferramentas · Padaria Pão Dourado")).toBeInTheDocument();
    expect(screen.getByText("Avulsa")).toBeInTheDocument();
    expect(screen.getByText("Não se repete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir paga" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Parar mensal" })).not.toBeInTheDocument();
  });
});

describe("domain row", () => {
  const renderDomain = (cancelled = false) =>
    render(
      <DomainCard
        cancelled={cancelled}
        clientName="Padaria Pão Dourado"
        clients={[{ id: clientId, name: "Padaria Pão Dourado", status: "active" }]}
        defaultOpen
        domain={domain}
        today={today}
      />,
    );

  it("deixa abrir o site na linha e guarda as demais ações nos detalhes", () => {
    renderDomain();

    expect(
      screen.getByRole("link", { name: /abrir paodourado\.example em nova aba/i }),
    ).toHaveAttribute("href", "https://paodourado.example");
    expect(screen.getByText("Vence em até 7 dias")).toBeInTheDocument();
    expect(screen.getByText("Renovação combinada com o cliente.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /registro\.br/i })).toHaveAttribute(
      "href",
      "https://registro.br",
    );
    for (const name of ["Editar", "Parar de acompanhar", "Excluir"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("abre o formulário de edição no lugar da linha e volta ao cancelar", () => {
    renderDomain();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: `Editar ${domain.domain}` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByRole("button", { name: domain.domain })).toBeInTheDocument();
  });

  it("permite voltar a acompanhar um domínio cancelado", () => {
    renderDomain(true);

    expect(screen.getByText("Cancelado")).toHaveClass("charge-status--cancelled");
    expect(screen.getByRole("button", { name: "Voltar a acompanhar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Parar de acompanhar" })).not.toBeInTheDocument();
  });
});
