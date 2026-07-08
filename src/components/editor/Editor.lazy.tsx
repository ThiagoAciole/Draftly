import { lazy } from "react";

export const MarkdownEditor = lazy(() =>
  import("./MarkdownEditor").then((m) => ({ default: m.MarkdownEditor })),
);

export const StatusBar = lazy(() =>
  import("../layout/StatusBar").then((m) => ({ default: m.StatusBar })),
);
