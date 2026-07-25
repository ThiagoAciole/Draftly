import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

const appWindow = getCurrentWindow();

type ResizeDirection =
  | "north"
  | "south"
  | "east"
  | "west"
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest";

function useResize(direction: ResizeDirection) {
  const trackingRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      void appWindow.outerSize().then((size) => {
        const factor = window.devicePixelRatio || 1;
        trackingRef.current = {
          startX: event.screenX,
          startY: event.screenY,
          startW: size.width / factor,
          startH: size.height / factor,
        };
      });
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    trackingRef.current = null;
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const tracking = trackingRef.current;
      if (!tracking) return;

      const dx = event.screenX - tracking.startX;
      const dy = event.screenY - tracking.startY;

      let newW = tracking.startW;
      let newH = tracking.startH;

      if (direction.includes("east")) newW = tracking.startW + dx;
      if (direction.includes("west")) newW = tracking.startW - dx;
      if (direction.includes("south")) newH = tracking.startH + dy;
      if (direction.includes("north")) newH = tracking.startH - dy;

      void appWindow.setSize(
        new LogicalSize(Math.round(Math.max(400, newW)), Math.round(Math.max(560, newH))),
      );
    },
    [direction],
  );

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

type HandleDef = { dir: ResizeDirection; cls: string };

const HANDLES: HandleDef[] = [
  { dir: "north", cls: "resize-handle resize-handle-n" },
  { dir: "south", cls: "resize-handle resize-handle-s" },
  { dir: "east", cls: "resize-handle resize-handle-e" },
  { dir: "west", cls: "resize-handle resize-handle-w" },
  { dir: "northeast", cls: "resize-handle resize-handle-ne" },
  { dir: "northwest", cls: "resize-handle resize-handle-nw" },
  { dir: "southeast", cls: "resize-handle resize-handle-se" },
  { dir: "southwest", cls: "resize-handle resize-handle-sw" },
];

function ResizeHandle({ dir, cls }: HandleDef) {
  const { handleMouseDown, handleMouseUp, handleMouseMove } = useResize(dir);
  const listenerRef = useRef(false);

  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    handleMouseDown(e);

    if (!listenerRef.current) {
      listenerRef.current = true;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", () => {
        handleMouseUp();
        document.removeEventListener("mousemove", handleMouseMove);
        listenerRef.current = false;
      }, { once: true });
    }
  };

  return <div className={cls} onMouseDown={onMouseDown} />;
}

export function WindowResizeHandles() {
  return (
    <>
      {HANDLES.map((handle) => (
        <ResizeHandle key={handle.dir} {...handle} />
      ))}
    </>
  );
}
