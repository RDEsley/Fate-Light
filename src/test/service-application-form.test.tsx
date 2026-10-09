import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

type ServiceAction = (state: unknown, formData: FormData) => Promise<unknown>;

const actions = vi.hoisted(() => ({
  applyServiceToClient: vi.fn<ServiceAction>(async (state) => state),
  editClientService: vi.fn<ServiceAction>(async (state) => state),
}));

vi.mock("@/app/_actions/client-services", () => actions);

import { ServiceApplicationForm } from "@/app/clientes/[clientId]/service-application-form";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const catalog = [
  {
    adjustmentIntervalMonths: 12,
    adjustmentRate: 5.5,
    billingType: "monthly" as const,
    defaultPrice: 1500,
    description: "Gestão mensal das campanhas",
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Gestão de Google Ads",
  },
];

const service = {
  additionalFee: 0,
  additionalFeeIsRevenue: true,
  adjustmentIntervalMonths: null,
  adjustmentRate: null,
  billingType: "single" as const,
  description: null,
  discountType: "none" as const,
  discountValue: 0,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  installmentCount: 3,
  listPrice: 5990,
  mediaBudget: 0,
  name: "Site Institucional",
  nextDueDate: "2026-09-20",
  notes: null,
  promotionalCycles: null,
  promotionalPrice: null,
  startDate: "2026-07-20",
};

describe("formulário de serviço do cliente", () => {
  beforeEach(() => Object.values(actions).forEach((action) => action.mockClear()));

  it("mantém todo campo obrigatório fora do bloco recolhido", () => {
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    const advanced = screen.getByText("Personalizar preço e agenda").closest("details")!;
    expect(advanced).not.toHaveAttribute("open");

    // "Início do serviço" morava dentro do bloco fechado: o envio travava sem nenhum
    // aviso, porque o navegador não consegue apontar um campo que não está visível.
    const required = Array.from(document.querySelectorAll<HTMLElement>("[required]"));
    expect(required).toHaveLength(4);
    for (const field of required) expect(advanced.contains(field)).toBe(false);
    expect(screen.getByLabelText("Início do serviço")).toBeVisible();
    expect(screen.getByLabelText("Primeiro vencimento")).toBeVisible();
  });

  it("aponta cada campo que falta em vez de falhar em silêncio", async () => {
    const user = userEvent.setup();
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    expect(actions.applyServiceToClient).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome exibido no cliente")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Valor cheio" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getAllByText("Informe a data.")).toHaveLength(2);
  });

  it("recusa vencimento anterior ao início antes de ir ao servidor", async () => {
    const user = userEvent.setup();
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    await user.type(screen.getByLabelText("Nome exibido no cliente"), "Gestão de tráfego");
    await user.click(screen.getByRole("textbox", { name: "Valor cheio" }));
    await user.keyboard("150000");
    await user.type(screen.getByLabelText("Início do serviço"), "10082026");
    await user.type(screen.getByLabelText("Primeiro vencimento"), "05082026");
    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    expect(actions.applyServiceToClient).not.toHaveBeenCalled();
    expect(
      screen.getByText("O vencimento não pode ser anterior ao início do serviço."),
    ).toBeInTheDocument();
  });

  it("envia quando o essencial está preenchido, sem abrir a personalização", async () => {
    const user = userEvent.setup();
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    await user.type(screen.getByLabelText("Nome exibido no cliente"), "Gestão de tráfego");
    await user.click(screen.getByRole("textbox", { name: "Valor cheio" }));
    await user.keyboard("150000");
    await user.type(screen.getByLabelText("Início do serviço"), "01082026");
    await user.type(screen.getByLabelText("Primeiro vencimento"), "10082026");
    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    expect(actions.applyServiceToClient).toHaveBeenCalledTimes(1);
    const formData = actions.applyServiceToClient.mock.calls[0]![1];
    expect(formData.get("listPrice")).toBe("1500.00");
    expect(formData.get("startDate")).toBe("2026-08-01");
    expect(formData.get("nextDueDate")).toBe("2026-08-10");
    expect(formData.get("installmentCount")).toBe("1");
    expect(formData.get("discountValue")).toBe("0");
  });

  it("preenche pelo catálogo e mostra o reajuste herdado no resumo", async () => {
    const user = userEvent.setup();
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    await user.click(screen.getByRole("combobox", { name: /Partir do catálogo/ }));
    await user.click(screen.getByRole("option", { name: /Gestão de Google Ads/ }));

    expect(screen.getByLabelText("Nome exibido no cliente")).toHaveValue("Gestão de Google Ads");
    expect(screen.getByRole("textbox", { name: "Valor cheio" })).toHaveValue("R$ 1.500,00");
    // O lembrete vem ligado dentro do bloco recolhido; o resumo o deixa à vista.
    expect(screen.getByText("Reajuste a cada 12 meses")).toBeInTheDocument();
  });

  it("não oferece na edição o que a edição não altera", () => {
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} service={service} />);

    expect(screen.queryByLabelText("Início do serviço")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Quantidade de parcelas" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('input[name="startDate"]')).toHaveValue("2026-07-20");
    expect(document.querySelector('input[name="installmentCount"]')).toHaveValue("3");
    expect(screen.getByLabelText("Próximo vencimento")).toHaveValue("20/09/2026");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
    // Sem pagamento, as parcelas podem mudar; o resumo mostra a fatia e o total.
    expect(screen.getByRole("textbox", { name: "Parcelas" })).toBeEnabled();
    const summary = document.querySelector(".price-summary")!;
    expect(summary).toHaveTextContent(/3x de\s*R\$\s1\.996,67/);
    expect(summary).toHaveTextContent(/total R\$\s5\.990,00/);
  });

  it("trava as parcelas quando o serviço já tem pagamento", () => {
    render(
      <ServiceApplicationForm
        catalog={catalog}
        clientId={clientId}
        service={{ ...service, hasPayments: true }}
      />,
    );

    expect(screen.getByLabelText("Parcelas")).toBeDisabled();
    expect(screen.getByLabelText("Parcelas")).toHaveValue("3 parcelas · travado após pagamento");
    expect(document.querySelector('input[name="installmentCount"]')).toHaveValue("3");
  });

  it("mostra no resumo o preço promocional e o valor que vem depois", () => {
    render(
      <ServiceApplicationForm
        catalog={catalog}
        clientId={clientId}
        service={{
          ...service,
          billingType: "monthly",
          installmentCount: 1,
          listPrice: 700,
          promotionalCycles: 2,
          promotionalPrice: 500,
        }}
      />,
    );

    const summary = document.querySelector(".price-summary")!;
    expect(summary.querySelector(".price-summary__value")).toHaveTextContent(/R\$\s500,00/);
    expect(summary.querySelector(".price-summary__then")).toHaveTextContent(/depois R\$\s700,00/);
  });

  it("deixa as parcelas à vista na criação quando a cobrança é única", async () => {
    const user = userEvent.setup();
    render(<ServiceApplicationForm catalog={catalog} clientId={clientId} />);

    expect(screen.queryByRole("textbox", { name: "Parcelas" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Periodicidade" }));
    await user.click(screen.getByRole("option", { name: /uma única vez/i }));

    const more = screen.getByText("Personalizar preço e agenda").closest("details")!;
    const installments = screen.getByRole("textbox", { name: "Parcelas" });
    expect(more).not.toContainElement(installments);
    expect(installments).toHaveValue("1");
  });
});
