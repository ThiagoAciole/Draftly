import { lazy } from "react";

export const MarkdownEditor = lazy(() =>
  import("./MarkdownEditor").then((m) => ({ default: m.MarkdownEditor })),
);

export const PlainTextEditor = lazy(() =>
  import("./PlainTextEditor").then((m) => ({ default: m.PlainTextEditor })),
);

export const StatusBar = lazy(() =>
  import("../layout/StatusBar").then((m) => ({ default: m.StatusBar })),
);
