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
  const titles = {
    error: "Vamos corrigir isso",
    info: "Para você saber",
    success: "Tudo certo!",
    warning: "Vale conferir",
  };

  return (
    <div
      className={`${styles[tone]} feedback-banner mb-5 rounded-xl border-2 px-4 py-3 text-sm leading-5`}
      role={tone === "error" ? "alert" : "status"}
    >
      <strong className="block font-black">{titles[tone]}</strong>
      <span className="mt-0.5 block font-semibold opacity-85">{message}</span>
    </div>
  );
}
