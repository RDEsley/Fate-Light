import type { ReactNode } from "react";

import { getAttentionItems } from "@/features/alerts/attention";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { AppFrame } from "./app-frame";

type AccountShellProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export async function AccountShell({ children, description, title }: AccountShellProps) {
  const context = await requireWorkspaceContext();
  const attentionItems = await getAttentionItems(context);

  return (
    <AppFrame
      attentionItems={attentionItems}
      description={description}
      fullName={context.fullName}
      title={title}
      workspaceName={context.workspaceName}
    >
      {children}
    </AppFrame>
  );
}
