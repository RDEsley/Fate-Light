import type { UIMessage } from "ai";

import {
  MAX_CONVERSATIONS,
  clearAssistantStorage,
  deriveTitle,
  formatRelative,
  groupByDay,
  previewOf,
  readConversations,
  removeConversation,
  sanitizeForStorage,
  upsertConversation,
  writeConversations,
  type StoredConversation,
} from "@/features/assistant/history";
import { parseInline, parseRichText, plainText } from "@/features/assistant/rich-text";
import {
  approvalTotal,
  describeToolResult,
  loadingLabel,
  maskMoney,
  parseApprovalLines,
} from "@/features/assistant/view";

const user = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ text, type: "text" }],
  role: "user",
});
const assistant = (id: string, text: string, tool?: { state: string }): UIMessage =>
  ({
    id,
    parts: [
      ...(tool
        ? [{ input: {}, state: tool.state, toolCallId: `${id}-t`, type: "tool-resumirMes" }]
        : []),
      { text, type: "text" },
    ],
    role: "assistant",
  }) as UIMessage;

const conversation = (id: string, updatedAt: number, text = "Oi"): StoredConversation => ({
  feedback: {},
  id,
  messages: [user(`${id}-u`, text), assistant(`${id}-a`, "Olá!")],
  title: text,
  updatedAt,
});

describe("texto formatado do assistente", () => {
  it("separa parágrafos, listas e negrito sem interpretar HTML", () => {
    const blocks = parseRichText(
      "Encontrei **2 clientes**:\n\n- Ana deve `R$ 10`\n- Bia deve <b>R$ 20</b>\n\n1. Primeiro\n2. Segundo",
    );

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      inline: [
        { text: "Encontrei ", type: "text" },
        { text: "2 clientes", type: "bold" },
        { text: ":", type: "text" },
      ],
      type: "paragraph",
    });
    expect(blocks[1]).toMatchObject({ ordered: false, type: "list" });
    expect(blocks[2]).toMatchObject({ ordered: true, type: "list" });
    // A marcação do modelo continua sendo só texto.
    expect(JSON.stringify(blocks[1])).toContain("<b>R$ 20</b>");
  });

  it("trata título como negrito e separa lista de tipo diferente", () => {
    expect(parseRichText("## Resumo\ntexto")[0]).toMatchObject({
      inline: [{ text: "Resumo", type: "bold" }],
    });
    expect(parseRichText("- a\n1. b")).toHaveLength(2);
    expect(parseRichText("   \n\n")).toEqual([]);
  });

  it("converte para texto puro ao copiar", () => {
    expect(plainText("## Título\n**forte** e `código`")).toBe("Título\nforte e código");
    expect(parseInline("sem marcação")).toEqual([{ text: "sem marcação", type: "text" }]);
  });
});

describe("histórico de conversas", () => {
  beforeEach(() => window.localStorage.clear());

  it("só guarda conversas em estado final", () => {
    const finished = [user("1", "Oi"), assistant("2", "Olá")];
    expect(sanitizeForStorage(finished)).toHaveLength(2);

    // Resposta cortada, aprovação pendente e pergunta sem resposta não voltam à tela.
    const pending = [
      ...finished,
      user("3", "Cria"),
      assistant("4", "Posso criar?", { state: "approval-requested" }),
    ];
    expect(sanitizeForStorage(pending)).toHaveLength(2);
    expect(sanitizeForStorage([...finished, user("5", "Pergunta solta")])).toHaveLength(2);
    expect(
      sanitizeForStorage([...finished, assistant("6", "ok", { state: "output-available" })]),
    ).toHaveLength(3);
    expect(sanitizeForStorage([user("1", "Oi")])).toEqual([]);
  });

  it("deriva título e prévia", () => {
    expect(deriveTitle([user("1", "  Quem   está me devendo?  ")])).toBe("Quem está me devendo?");
    expect(deriveTitle([user("1", "a".repeat(80))])).toHaveLength(56);
    expect(deriveTitle([])).toBe("Nova conversa");
    expect(previewOf([user("1", "Oi"), assistant("2", "**Dois** clientes")])).toBe("Dois clientes");
    expect(previewOf([user("1", "Oi")])).toBe("");
  });

  it("ordena, limita e remove", () => {
    let list: StoredConversation[] = [];
    for (let index = 0; index < MAX_CONVERSATIONS + 3; index += 1) {
      list = upsertConversation(list, conversation(`c${index}`, 1_000 + index));
    }
    expect(list).toHaveLength(MAX_CONVERSATIONS);
    expect(list[0]?.id).toBe(`c${MAX_CONVERSATIONS + 2}`);

    const updated = upsertConversation(list, conversation("c5", 9_999));
    expect(updated[0]?.id).toBe("c5");
    expect(removeConversation(updated, "c5").some((item) => item.id === "c5")).toBe(false);
  });

  it("lê e grava no armazenamento, ignorando dados inválidos", () => {
    const stored = [conversation("a", 10), conversation("b", 20)];
    writeConversations(window.localStorage, "guest:x", stored);
    expect(readConversations(window.localStorage, "guest:x").map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);
    expect(readConversations(window.localStorage, "outro")).toEqual([]);

    window.localStorage.setItem("fate-light:assistant:v1:ruim", "{nao é json");
    expect(readConversations(window.localStorage, "ruim")).toEqual([]);
    window.localStorage.setItem(
      "fate-light:assistant:v1:misto",
      JSON.stringify([
        { id: 1 },
        { ...conversation("ok", 5), feedback: { m1: { value: "up" }, m2: { value: "x" } } },
      ]),
    );
    const mixed = readConversations(window.localStorage, "misto");
    expect(mixed).toHaveLength(1);
    expect(mixed[0]?.feedback).toEqual({ m1: { value: "up" } });
    expect(readConversations(null, "x")).toEqual([]);

    writeConversations(window.localStorage, "guest:x", []);
    expect(window.localStorage.getItem("fate-light:assistant:v1:guest:x")).toBeNull();
  });

  it("apaga todo o histórico ao sair, sem tocar em outras chaves", () => {
    writeConversations(window.localStorage, "account:a", [conversation("a", 1)]);
    writeConversations(window.localStorage, "guest:b", [conversation("b", 1)]);
    window.localStorage.setItem("fate-light:sidebar", "collapsed");

    clearAssistantStorage(window.localStorage);

    expect(readConversations(window.localStorage, "account:a")).toEqual([]);
    expect(readConversations(window.localStorage, "guest:b")).toEqual([]);
    expect(window.localStorage.getItem("fate-light:sidebar")).toBe("collapsed");
  });

  it("descarta as mais antigas quando o navegador recusa por falta de espaço", () => {
    const calls: number[] = [];
    const storage = {
      removeItem: () => undefined,
      setItem: (_key: string, value: string) => {
        const size = (JSON.parse(value) as unknown[]).length;
        calls.push(size);
        if (size > 2) throw new DOMException("cheio", "QuotaExceededError");
      },
    } as unknown as Storage;

    writeConversations(
      storage,
      "x",
      [1, 2, 3, 4, 5].map((n) => conversation(`c${n}`, n)),
    );
    expect(calls).toEqual([5, 3, 2]);
  });

  it("formata o tempo e agrupa por dia", () => {
    const now = new Date(2026, 10, 23, 15, 0, 0).getTime();
    expect(formatRelative(now - 10_000, now)).toBe("agora");
    expect(formatRelative(now - 5 * 60_000, now)).toBe("há 5 min");
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe("há 3 h");
    expect(formatRelative(new Date(2026, 10, 1, 9).getTime(), now)).toBe("01/11");

    const groups = groupByDay(
      [
        conversation("hoje", now - 60_000),
        conversation("ontem", new Date(2026, 10, 22, 10).getTime()),
        conversation("antes", new Date(2026, 10, 10, 10).getTime()),
      ],
      now,
    );
    expect(groups.map((group) => group.label)).toEqual(["Hoje", "Ontem", "Anteriores"]);
  });
});

describe("cartão de aprovação e resultados", () => {
  const reason =
    "Studio Movimento: R$ 1.350,00, venceu em 06/10/2026 (47 dias)\nAuto Center: R$ 780,00, venceu em 18/10/2026 (1 dia)";

  it("lê as linhas do servidor e soma o total em centavos", () => {
    const rows = parseApprovalLines(reason);
    expect(rows).toEqual([
      {
        cents: 135_000,
        client: "Studio Movimento",
        days: 47,
        dueDate: "06/10/2026",
        value: "R$ 1.350,00",
      },
      { cents: 78_000, client: "Auto Center", days: 1, dueDate: "18/10/2026", value: "R$ 780,00" },
    ]);
    expect(approvalTotal(rows).replace(/\s/g, " ")).toBe("R$ 2.130,00");
    expect(parseApprovalLines("texto livre")).toEqual([]);
    expect(parseApprovalLines("Fulano: R$ 100,00, venceu em 01/01/2026 (3 dias)")).toHaveLength(1);
  });

  it("resume o resultado de cada ferramenta", () => {
    expect(
      describeToolResult("listarClientesEmAtraso", {
        dados: { clientes: [{}, {}], totalCobrancas: 3 },
      }),
    ).toBe("2 clientes · 3 cobranças");
    expect(
      describeToolResult("listarClientesEmAtraso", { dados: { clientes: [], totalCobrancas: 0 } }),
    ).toBe("Nenhuma cobrança nesse critério");
    expect(
      describeToolResult("resumirMes", {
        dados: {
          pendente: { total: "200.00" },
          recebido: { total: "1500.50" },
          vencido: { total: "0" },
        },
      }).replace(/\s/g, " "),
    ).toBe("Recebido R$ 1.500,50 · Pendente R$ 200,00 · Vencido R$ 0,00");
    expect(
      describeToolResult("criarLembreteCobranca", {
        dados: { criados: ["A", "B"], simulado: true },
      }),
    ).toBe("2 lembretes criados (simulado)");
    expect(describeToolResult("criarLembreteCobranca", { dados: { criados: ["A"] } })).toBe(
      "1 lembrete criado",
    );
    expect(
      describeToolResult("criarLembreteCobranca", { dados: { criados: [], jaExistiam: ["A"] } }),
    ).toBe("Os lembretes já existiam");
  });

  it("escolhe a frase de carregamento e oculta valores", () => {
    expect(loadingLabel("listarClientesEmAtraso", 0)).toMatch(/atraso/);
    expect(loadingLabel(null, 0)).not.toBe(loadingLabel(null, 1));
    expect(loadingLabel(null, 3)).toBe(loadingLabel(null, 0));
    expect(maskMoney("Total R$ 1.350,00")).toBe("Total R$ ••••");
  });
});
