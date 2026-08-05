import { Icon } from "./icon";

export function FeedbackBanner({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "error" | "info" | "success" | "warning";
}) {
  const styles = {
    error: "border-negative/25 bg-negative-soft text-negative",
    info: "border-violet/25 bg-violet-soft text-violet",
    success: "border-positive/25 bg-positive-soft text-positive",
    warning: "border-warning/25 bg-warning-soft text-warning",
  };
  const icon =
    tone === "error" || tone === "warning" ? "alert" : tone === "success" ? "check" : "sparkles";
  const titles = {
    error: "Vamos corrigir isso",
    info: "Para você saber",
    success: "Tudo certo!",
    warning: "Vale conferir",
  };

  return (
    <div
      className={`${styles[tone]} feedback-banner mb-5 flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="feedback-banner__icon">
        <Icon className="size-4" name={icon} />
      </span>
      <span className="leading-5">
        <strong className="block font-black">{titles[tone]}</strong>
        <span className="mt-0.5 block font-semibold opacity-85">{message}</span>
      </span>
    </div>
  );
}
