export interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "meeting-notes",
    name: "Meeting notes",
    content:
      "# Meeting notes\n\n" +
      "**Date:** \n\n" +
      "## Attendees\n\n- \n\n" +
      "## Agenda\n\n1. \n\n" +
      "## Decisions\n\n- \n\n" +
      "## Action items\n\n- [ ] \n",
  },
  {
    id: "project-brief",
    name: "Project brief",
    content:
      "# Project brief\n\n" +
      "## Problem\n\n\n" +
      "## Goal\n\n\n" +
      "## Scope\n\n### Included\n\n- \n\n### Not included\n\n- \n\n" +
      "## Success criteria\n\n- \n",
  },
  {
    id: "daily-note",
    name: "Daily note",
    content:
      "# Daily note\n\n" +
      "## Priorities\n\n- [ ] \n- [ ] \n- [ ] \n\n" +
      "## Notes\n\n\n" +
      "## Reflection\n\n",
  },
];
