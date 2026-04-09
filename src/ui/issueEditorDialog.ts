import { IssueEditorOptions } from "../domain/contracts";
import { IssueTopic } from "../domain/model";
import { escapeHtml } from "../utils/escapeHtml";

export function mountIssueEditorDialog(
  el: HTMLElement,
  initialTopic: IssueTopic,
  options: IssueEditorOptions,
  onSubmit: (topic: IssueTopic) => void,
  onCancel: () => void
): void {
  const topic = structuredClone(initialTopic);

  const render = () => {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;width:960px;max-width:92vw;height:86vh;font-family:Inter,Segoe UI,Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <div style="font-size:24px;font-weight:700;">${options.mode === "create" ? "Создание замечания" : "Редактирование замечания"}</div>
            <div style="color:#64748b;font-size:13px;">BCF issue editor в логике BIMcollab</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button data-cmd="cancel">Отмена</button>
            <button data-cmd="save">Сохранить</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;min-height:0;flex:1;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start;overflow:auto;padding-right:4px;">
            <label style="grid-column:1 / span 2;display:flex;flex-direction:column;gap:6px;">Название<input data-field="title" value="${escapeHtml(topic.title)}"></label>
            <label style="grid-column:1 / span 2;display:flex;flex-direction:column;gap:6px;">Описание<textarea data-field="description" rows="8">${escapeHtml(topic.description)}</textarea></label>
            <label style="display:flex;flex-direction:column;gap:6px;">Назначено<input data-field="assignedTo" value="${escapeHtml(topic.assignedTo || "")}"></label>
            <label style="display:flex;flex-direction:column;gap:6px;">Область<input data-field="area" value="${escapeHtml(topic.area || "")}"></label>
            <label style="display:flex;flex-direction:column;gap:6px;">Этап<input data-field="milestone" value="${escapeHtml(topic.milestone || "")}"></label>
            <label style="display:flex;flex-direction:column;gap:6px;">Срок<input data-field="deadline" value="${escapeHtml(topic.deadline || "")}" placeholder="YYYY-MM-DD"></label>
            <label style="display:flex;flex-direction:column;gap:6px;">Тип
              <select data-field="type">
                ${["Замечание","Коллизия","Проверка","Вопрос","Предложение"].map((item) => `<option ${item === topic.type ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px;">Приоритет
              <select data-field="priority">
                ${["Низкий","Обычный","Высокий","Критический"].map((item) => `<option ${item === topic.priority ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px;">Статус
              <select data-field="status">
                ${["Новая","Активно","В работе","Устранено","Закрыто","Переоткрыто"].map((item) => `<option ${item === topic.status ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px;">Метки<input data-field="labels" value="${escapeHtml(topic.labels.join(", "))}"></label>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;">
            <div style="font-weight:700;">Viewpoint</div>
            ${topic.viewpoints[0]?.snapshotBase64 ? `<img src="${topic.viewpoints[0].snapshotBase64}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid #cbd5e1;">` : `<div style="height:180px;border:1px dashed #cbd5e1;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#64748b;">Нет snapshot</div>`}
            <div style="font-size:13px;color:#475569;">Связанные элементы: ${topic.viewpoints[0]?.components.length ?? 0}</div>
            <div style="font-size:13px;color:#475569;">Комментариев: ${topic.comments.length}</div>
            <div style="font-size:13px;color:#475569;">GUID: ${escapeHtml(topic.guid)}</div>
          </div>
        </div>
      </div>`;

    el.querySelector<HTMLButtonElement>("[data-cmd='cancel']")!.onclick = () => onCancel();
    el.querySelector<HTMLButtonElement>("[data-cmd='save']")!.onclick = () => {
      topic.title = (el.querySelector<HTMLInputElement>("[data-field='title']")!.value || "").trim();
      topic.description = el.querySelector<HTMLTextAreaElement>("[data-field='description']")!.value;
      topic.assignedTo = el.querySelector<HTMLInputElement>("[data-field='assignedTo']")!.value || undefined;
      topic.area = el.querySelector<HTMLInputElement>("[data-field='area']")!.value || undefined;
      topic.milestone = el.querySelector<HTMLInputElement>("[data-field='milestone']")!.value || undefined;
      topic.deadline = el.querySelector<HTMLInputElement>("[data-field='deadline']")!.value || undefined;
      topic.type = el.querySelector<HTMLSelectElement>("[data-field='type']")!.value as IssueTopic["type"];
      topic.priority = el.querySelector<HTMLSelectElement>("[data-field='priority']")!.value as IssueTopic["priority"];
      topic.status = el.querySelector<HTMLSelectElement>("[data-field='status']")!.value as IssueTopic["status"];
      topic.labels = el.querySelector<HTMLInputElement>("[data-field='labels']")!.value.split(",").map((x) => x.trim()).filter(Boolean);
      if (!topic.title) {
        alert("Укажите название замечания");
        return;
      }
      onSubmit(topic);
    };
  };

  render();
}
