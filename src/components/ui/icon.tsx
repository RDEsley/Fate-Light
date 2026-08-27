import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "accessibility"
  | "alert"
  | "archive"
  | "arrow-down"
  | "arrow-up"
  | "bell"
  | "briefcase"
  | "building"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "dashboard"
  | "download"
  | "edit"
  | "eye"
  | "eye-off"
  | "file"
  | "filter"
  | "globe"
  | "help"
  | "history"
  | "info"
  | "link"
  | "logout"
  | "menu"
  | "pause"
  | "paperclip"
  | "play"
  | "plus"
  | "receipt"
  | "refresh"
  | "search"
  | "settings"
  | "sliders"
  | "sparkles"
  | "user"
  | "users"
  | "upload"
  | "trash"
  | "wallet"
  | "x";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ className = "size-5", name, ...properties }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    accessibility: (
      <>
        <circle cx="12" cy="4.25" r="2.1" />
        <path d="M4.5 8.5c2.35 1 4.85 1.5 7.5 1.5s5.15-.5 7.5-1.5M12 10v4m0 0-4.25 6.5M12 14l4.25 6.5" />
      </>
    ),
    alert: (
      <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
    ),
    archive: <path d="M3 7h18v3H3V7Zm2 3v10h14V10M9.5 14h5" />,
    "arrow-down": <path d="m6 9 6 6 6-6" />,
    "arrow-up": <path d="m18 15-6-6-6 6" />,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />,
    briefcase: <path d="M9 6V4h6v2m-11 0h16v14H4V6Zm0 5h16M9 11v2h6v-2" />,
    building: (
      <path d="M4 21h16M6 21V5l6-2 6 2v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
    ),
    calendar: <path d="M6 2v3m12-3v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    "chevron-down": <path d="m7 10 5 5 5-5" />,
    "chevron-up": <path d="m7 14 5-5 5 5" />,
    dashboard: <path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" />,
    download: <path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14" />,
    edit: <path d="M12 20h8M4 20h3l10-10a2.1 2.1 0 0 0-3-3L4 17v3Z" />,
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    "eye-off": (
      <>
        <path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.2 2.8M6.3 6.3C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    ),
    file: <path d="M6 2h8l4 4v16H6V2Zm8 0v5h5M9 12h6m-6 4h6" />,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
    globe: (
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0 0c2.2-2.2 3.3-5.5 3.3-10S14.2 4.2 12 2m0 20c-2.2-2.2-3.3-5.5-3.3-10S9.8 4.2 12 2M2 12h20" />
    ),
    help: (
      <path d="M9.3 9.3a2.8 2.8 0 1 1 3.7 2.6c-.7.3-1 .9-1 1.6v.5m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
    ),
    history: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-2v6l4 2" />,
    info: <path d="M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
    link: (
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4m-.4 4.6a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    ),
    logout: <path d="M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    pause: <path d="M9 5v14M15 5v14" />,
    paperclip: (
      <path d="m20.5 11.5-8.7 8.7a5.3 5.3 0 0 1-7.5-7.5l9.1-9.1a3.6 3.6 0 0 1 5.1 5.1l-9.1 9.1a1.9 1.9 0 0 1-2.7-2.7l8.4-8.4" />
    ),
    play: <path d="M7 4.5v15l12-7.5-12-7.5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3" />,
    refresh: (
      <path d="M20 6v5h-5M4 18v-5h5m9.6-3A8 8 0 0 0 5.3 6.7L4 11m16 2-1.3 4.3A8 8 0 0 1 5.4 14" />
    ),
    search: <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
    settings: (
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13 1.2 2.1 2.4.5.3 2.5 1.8 1.6 2.3-.8 1.2 2.1-1.8 1.7.3 2.5 2.4.5L12 21.5l-1.2-2.1-2.4-.5-.3-2.5-1.8-1.6-2.3.8-1.2-2.1 1.8-1.7-.3-2.5-2.4-.5L3 6.5l2.3.8 1.8-1.6.3-2.5 2.4-.5L12 2.5Z" />
    ),
    sliders: <path d="M4 6h6m4 0h6M4 12h10m4 0h2M4 18h4m4 0h8M12 3.5v5M16 9.5v5M10 15.5v5" />,
    sparkles: (
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z" />
    ),
    user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0" />,
    users: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    ),
    upload: <path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v6h14v-6" />,
    trash: <path d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m3 0-1 14H7L6 7" />,
    wallet: <path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Zm0 0 13-3v3m1 6h4m-4 0h.01" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-icon={name}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      shapeRendering="geometricPrecision"
      {...properties}
    >
      {paths[name]}
    </svg>
  );
}
