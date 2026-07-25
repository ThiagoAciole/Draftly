import { createReactBlockSpec } from "@blocknote/react";
import { Lightbulb } from "lucide-react";

const CALLOUT_MARKER = /^\s*💡\s*/;

export function isCalloutElement(element: HTMLElement) {
  const hasMarker = CALLOUT_MARKER.test(element.textContent ?? "");
  const isCallout =
    element.getAttribute("data-draftly-callout") === "true" ||
    (element.tagName === "BLOCKQUOTE" && hasMarker);

  if (isCallout && hasMarker) {
    const walker = element.ownerDocument.createTreeWalker(element, 4);
    const firstTextNode = walker.nextNode();
    if (firstTextNode?.textContent) {
      firstTextNode.textContent = firstTextNode.textContent.replace(
        CALLOUT_MARKER,
        "",
      );
    }
  }

  return isCallout;
}

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "inline" as const,
  },
  {
    meta: {
      isolating: false,
    },
    parse(element) {
      if (isCalloutElement(element)) {
        return {};
      }

      return undefined;
    },
    render: (props) => (
      <div className="draftly-callout">
        <span aria-hidden="true" contentEditable={false}>
          <Lightbulb className="draftly-callout-icon" size={18} />
        </span>
        <div className="draftly-callout-content" ref={props.contentRef} />
      </div>
    ),
    toExternalHTML: (props) => (
      <blockquote data-draftly-callout="true">
        <span aria-hidden="true" contentEditable={false}>💡 </span>
        <span ref={props.contentRef} />
      </blockquote>
    ),
  },
);
