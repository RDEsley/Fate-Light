import { Icon } from "@/components/ui/icon";
import { buildSupportWhatsAppUrl, supportContact } from "@/lib/support/contact";

export function SupportContactPanel() {
  const whatsappHref = buildSupportWhatsAppUrl();

  return (
    <section className="panel-card" id="suporte">
      <div className="section-heading mb-4">
        <span className="section-heading__icon bg-positive-soft text-positive">
          <Icon name="phone" />
        </span>
        <div>
          <h2>Suporte Fate Eight</h2>
          <p>Fale com a equipe pelo WhatsApp com uma mensagem pronta.</p>
        </div>
      </div>

      <div className="support-contact">
        <p className="text-muted text-sm leading-6">
          Abre o WhatsApp da Fate Eight Tech ({supportContact.phoneDisplay}) com um texto inicial
          pronto para você só completar o que precisa.
        </p>
        <blockquote className="support-contact__preview">
          {supportContact.whatsappMessage}
        </blockquote>
        <a
          className="bg-brand text-brand-contrast border-brand-strong inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-bold"
          href={whatsappHref}
          rel="noreferrer noopener"
          target="_blank"
        >
          <Icon className="size-4" name="phone" />
          Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}
