import type { CreateIssueInput } from "../application/issue-service";
import type { TopomaticContext } from "./albatros-types";

export interface IssueDialogInitialData {
  title?: string;
  description?: string;
  status?: string;
  type?: string;
  priority?: string;
  assignedTo?: string;
  author?: string;
}

export async function showCreateIssueDialog(ctx: TopomaticContext, initial: IssueDialogInitialData = {}): Promise<CreateIssueInput | undefined> {
  if (!ctx.showDefinedDialog) {
    ctx.showMessage("Ошибка: пользовательское окно создания замечания недоступно в Albatros SDK", "error");
    return undefined;
  }

  const draft: Required<IssueDialogInitialData> = {
    title: initial.title ?? "",
    description: initial.description ?? "",
    status: initial.status ?? "Active",
    type: initial.type ?? "Issue",
    priority: initial.priority ?? "Medium",
    assignedTo: initial.assignedTo ?? "Unassigned",
    author: initial.author ?? "Topomatic 360 User"
  };

  try {
    await ctx.showDefinedDialog({
      title: "Создать BCF-замечание",
      modal: true,
      resolveTitle: "Создать",
      rejectTitle: "Отмена",
      mount(el) {
        mountIssueForm(el, draft);
      }
    });
  } catch {
    return undefined;
  }

  if (!draft.title.trim()) {
    ctx.showMessage("Замечание не создано: заполните Title", "warning");
    return undefined;
  }

  return {
    title: draft.title,
    description: draft.description,
    author: draft.author.trim() || "Topomatic 360 User",
    status: draft.status,
    type: draft.type,
    priority: draft.priority === "Undefined" ? undefined : draft.priority,
    assignedTo: draft.assignedTo === "Unassigned" ? undefined : draft.assignedTo
  };
}

function mountIssueForm(root: HTMLElement, draft: Required<IssueDialogInitialData>): void {
  root.innerHTML = "";
  const style = document.createElement("style");
  style.textContent = `
    .bcf-create-form {
      min-width: 760px;
      display: grid;
      grid-template-columns: 120px minmax(260px, 1fr) 120px 220px;
      gap: 10px 12px;
      align-items: start;
      padding: 14px;
      font: 12px/1.4 "Segoe UI", system-ui, sans-serif;
    }
    .bcf-create-form label {
      padding-top: 5px;
      text-align: right;
      color: #1f2937;
    }
    .bcf-create-form input,
    .bcf-create-form textarea,
    .bcf-create-form select {
      box-sizing: border-box;
      width: 100%;
      min-height: 26px;
      border: 1px solid #aeb7c2;
      border-radius: 2px;
      padding: 4px 6px;
      font: inherit;
      background: #fff;
    }
    .bcf-create-form textarea {
      min-height: 92px;
      resize: vertical;
    }
    .bcf-wide {
      grid-column: span 3;
    }
    .bcf-create-note {
      grid-column: 2 / span 3;
      color: #6b7280;
      padding-top: 2px;
    }
  `;

  const form = document.createElement("div");
  form.className = "bcf-create-form";
  form.append(
    label("Title"),
    input(draft.title, (value) => {
      draft.title = value;
    }, "bcf-wide"),
    label("Description"),
    textarea(draft.description, (value) => {
      draft.description = value;
    }, "bcf-wide"),
    label("Assigned to"),
    input(draft.assignedTo, (value) => {
      draft.assignedTo = value;
    }),
    label("Status"),
    select(["Active", "Resolved", "Открыто", "В работе", "Решено", "Закрыто"], draft.status, (value) => {
      draft.status = value;
    }),
    label("Type"),
    select(["Issue", "Remark", "Clash", "Замечание", "Коллизия", "Информация"], draft.type, (value) => {
      draft.type = value;
    }),
    label("Priority"),
    select(["Undefined", "Low", "Medium", "High", "Низкий", "Средний", "Высокий"], draft.priority, (value) => {
      draft.priority = value;
    }),
    label("Author"),
    input(draft.author, (value) => {
      draft.author = value;
    }),
    note("Selection, текущий вид и snapshot будут сохранены вместе с замечанием, если они доступны через Topomatic API.")
  );

  root.append(style, form);
}

function label(text: string): HTMLLabelElement {
  const element = document.createElement("label");
  element.textContent = text;
  return element;
}

function input(value: string, onInput: (value: string) => void, className = ""): HTMLInputElement {
  const element = document.createElement("input");
  element.className = className;
  element.value = value;
  element.addEventListener("input", () => onInput(element.value));
  return element;
}

function textarea(value: string, onInput: (value: string) => void, className = ""): HTMLTextAreaElement {
  const element = document.createElement("textarea");
  element.className = className;
  element.value = value;
  element.addEventListener("input", () => onInput(element.value));
  return element;
}

function select(options: string[], value: string, onInput: (value: string) => void): HTMLSelectElement {
  const element = document.createElement("select");
  for (const option of options) {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    element.append(item);
  }
  element.value = value;
  element.addEventListener("change", () => onInput(element.value));
  return element;
}

function note(text: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "bcf-create-note";
  element.textContent = text;
  return element;
}
