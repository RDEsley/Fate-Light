import { RecordCell, RecordList, RecordRow, type RecordTone } from "@/components/ui/record-row";
import { Icon } from "@/components/ui/icon";
import { formatDatePtBr, formatDateTimePtBr } from "@/features/mvp/format";
import { formatWhatsAppPhone } from "@/features/whatsapp/phone";
import { reminderKindLabels, type ReminderKind } from "@/features/whatsapp/template";

export type DeliveryItem = {
  clientName: string;
  contactName: string;
  createdAt: string;
  dueDate: string;
  error: string | null;
  id: string;
  kind: string;
  phone: string;
  status: string;
  statusAt: string;
};

const statusView: Record<string, { className: string; label: string; tone: RecordTone }> = {
  delivered: { className: "paid", label: "Entregue", tone: "positive" },
  failed: { className: "overdue", label: "Falhou", tone: "danger" },
  read: { className: "paid", label: "Lida", tone: "positive" },
  sending: { className: "pending", label: "Enviando", tone: "warning" },
  sent: { className: "pending", label: "Enviada", tone: "neutral" },
};

// Mesma grade das outras listas: principal, células, status, valor, ação rápida e seta.
const deliveryColumns = "minmax(0, 1fr) 10rem 7.5rem 6.5rem 0 0 1rem";
const deliveryLabels = ["Cliente", "Momento", "Vencimento", "Status", "", "", ""];

const fallbackStatus = { className: "pending", label: "Enviando", tone: "warning" as const };

function isReminderKind(kind: string): kind is ReminderKind {
  return kind in reminderKindLabels;
}

function kindLabel(kind: string) {
  return isReminderKind(kind) ? reminderKindLabels[kind] : kind;
}

export function DeliveryList({
  deliveries,
  timeZone,
}: {
  deliveries: DeliveryItem[];
  timeZone: string;
}) {
  return (
    <section className="panel-card" aria-labelledby="whatsapp-deliveries-title">
      <div className="section-heading mb-5">
        <span className="section-heading__icon bg-warning-soft text-warning">
          <Icon name="history" />
        </span>
        <div>
          <h2 id="whatsapp-deliveries-title">Últimos envios</h2>
          <p>Status atualizado pela Meta: enviada, entregue, lida ou falhou.</p>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <Icon name="phone" />
          </span>
          <strong>Nenhum lembrete enviado ainda</strong>
          <p>Ligue a automação e ative os clientes na ficha de cada um.</p>
        </div>
      ) : (
        <RecordList columns={deliveryColumns} head={deliveryLabels}>
          {deliveries.map((delivery) => {
            const view = statusView[delivery.status] ?? fallbackStatus;
            return (
              <RecordRow
                cells={
                  <>
                    <RecordCell label="Momento">{kindLabel(delivery.kind)}</RecordCell>
                    <RecordCell label="Vencimento">{formatDatePtBr(delivery.dueDate)}</RecordCell>
                  </>
                }
                headingLevel={3}
                key={delivery.id}
                status={
                  <span className={`charge-status charge-status--${view.className}`}>
                    {view.label}
                  </span>
                }
                subtitle={delivery.contactName}
                title={delivery.clientName}
                tone={view.tone}
              >
                <dl className="record-facts">
                  <div>
                    <dt>Enviado para</dt>
                    <dd>{formatWhatsAppPhone(delivery.phone)}</dd>
                  </div>
                  <div>
                    <dt>Registrado em</dt>
                    <dd>{formatDateTimePtBr(delivery.createdAt, timeZone)}</dd>
                  </div>
                  <div>
                    <dt>Última atualização</dt>
                    <dd>{formatDateTimePtBr(delivery.statusAt, timeZone)}</dd>
                  </div>
                  {delivery.error ? (
                    <div>
                      <dt>Motivo da falha</dt>
                      <dd>{delivery.error}</dd>
                    </div>
                  ) : null}
                </dl>
              </RecordRow>
            );
          })}
        </RecordList>
      )}
    </section>
  );
}
