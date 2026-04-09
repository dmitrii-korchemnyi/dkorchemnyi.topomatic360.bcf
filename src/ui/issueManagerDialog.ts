import { IssueManagerController } from "../domain/contracts";
import { IssueTopic } from "../domain/model";
import { escapeHtml } from "../utils/escapeHtml";

function statusBadge(status: string): string {
  return `<span style="padding:2px 8px;border-radius:12px;background:#eef2ff;font-size:12px;">${escapeHtml(status)}</span>`;
}

function priorityBadge(priority: string): string {
  return `<span style="padding:2px 8px;border-radius:12px;background:#f3f4f6;font-size:12px;">${escapeHtml(priority)}</span>`;
}

function snapshot(topic?: IssueTopic): string {
  const img = topic?.viewpoints[0]?.snapshotBase64;
  if (!img) return `<div style="height:180px;border:1px dashed #cbd5e1;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#64748b;">Нет snapshot</div>`;
  return `<img src="${img}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid #cbd5e1;"/>`;
}

function detail(topic?: IssueTopic): string {
  if (!topic) return `<div style="padding:16px;color:#64748b;">Выберите замечание</div>`;
  const comments = topic.comments.slice().reverse().map((comment) => `
    <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#64748b;">${escapeHtml(comment.author)} · ${escapeHtml(comment.date)}</div>
      <div style="margin-top:4px;white-space:pre-wrap;">${escapeHtml(comment.message)}</div>
    </div>`).join("");
  return `
    <div style="display:grid;grid-template-columns:320px 1fr;gap:16px;height:100%;">
      <div>
        ${snapshot(topic)}
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(topic.status)} ${priorityBadge(topic.priority)}</div>
        <div style="margin-top:12px;font-size:13px;color:#475569;line-height:1.5;white-space:pre-wrap;">${escapeHtml(topic.description || "Описание отсутствует")}</div>
      </div>
      <div style="display:flex;flex-direction:column;min-height:0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
          <div><b>Назначено:</b> ${escapeHtml(topic.assignedTo || "—")}</div>
          <div><b>Тип:</b> ${escapeHtml(topic.type)}</div>
          <div><b>Область:</b> ${escapeHtml(topic.area || "—")}</div>
          <div><b>Этап:</b> ${escapeHtml(topic.milestone || topic.stage || "—")}</div>
          <div><b>Срок:</b> ${escapeHtml(topic.deadline || "—")}</div>
          <div><b>Viewpoints:</b> ${topic.viewpoints.length}</div>
        </div>
        <div style="margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;overflow:auto;min-height:0;flex:1;">
          <div style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;background:#f8fafc;">Комментарии</div>
          ${comments || `<div style="padding:16px;color:#64748b;">Комментариев пока нет</div>`}
        </div>
      </div>
    </div>`;
}

export function mountIssueManagerDialog(el: HTMLElement, controller: IssueManagerController): void {
  const state = { selectedGuid: "" };

  const render = async () => {
    const snapshotData = await controller.getSnapshot();
    const project = snapshotData.project;
    state.selectedGuid = snapshotData.selectedGuid ?? state.selectedGuid ?? project.topics[0]?.guid ?? "";
    const selected = project.topics.find((topic) => topic.guid === state.selectedGuid) ?? project.topics[0];
    if (selected) state.selectedGuid = selected.guid;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;height:86vh;width:1240px;max-width:95vw;font-family:Inter,Segoe UI,Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">
          <div>
            <div style="font-size:24px;font-weight:700;">Менеджер BCF</div>
            <div style="color:#64748b;font-size:13px;">Импорт, просмотр, редактирование и экспорт замечаний</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button data-cmd="import">Импорт BCF</button>
            <button data-cmd="export">Экспорт BCF</button>
            <button data-cmd="create">Создать замечание</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:360px 1fr;gap:16px;min-height:0;flex:1;">
          <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:auto;background:#fff;">
            ${project.topics.map((topic) => `
              <div data-topic="${topic.guid}" style="padding:12px 14px;border-bottom:1px solid #e5e7eb;cursor:pointer;background:${topic.guid === state.selectedGuid ? '#eff6ff' : '#fff'};">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                  <div style="font-weight:600;">#${topic.number} ${escapeHtml(topic.title)}</div>
                  ${statusBadge(topic.status)}
                </div>
                <div style="margin-top:6px;color:#64748b;font-size:12px;display:flex;justify-content:space-between;gap:8px;">
                  <span>${escapeHtml(topic.assignedTo || 'Unassigned')}</span>
                  <span>${escapeHtml(topic.priority)}</span>
                </div>
              </div>`).join("") || `<div style="padding:16px;color:#64748b;">Замечаний пока нет</div>`}
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;min-height:0;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">
              <div style="font-size:20px;font-weight:700;">${escapeHtml(selected?.title || 'Замечание')}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button data-action="open">Перейти к виду</button>
                <button data-action="edit">Изменить</button>
                <button data-action="comment">Комментарий</button>
                <button data-action="resolve">Устранить</button>
                <button data-action="close">Закрыть</button>
                <button data-action="reopen">Переоткрыть</button>
                <button data-action="delete">Удалить</button>
              </div>
            </div>
            <div style="min-height:0;flex:1;">${detail(selected)}</div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll<HTMLElement>("[data-topic]").forEach((node) => {
      node.onclick = async () => {
        const guid = node.dataset.topic!;
        await controller.selectTopic(guid);
        await render();
      };
      node.ondblclick = async () => {
        await controller.openTopic(node.dataset.topic!);
      };
    });

    const selectedGuid = selected?.guid;
    el.querySelector<HTMLButtonElement>("[data-cmd='import']")!.onclick = async () => { await controller.importArchive(); await render(); };
    el.querySelector<HTMLButtonElement>("[data-cmd='export']")!.onclick = async () => { await controller.exportArchive(); };
    el.querySelector<HTMLButtonElement>("[data-cmd='create']")!.onclick = async () => { await controller.createTopic(); await render(); };

    if (selectedGuid) {
      el.querySelector<HTMLButtonElement>("[data-action='open']")!.onclick = async () => controller.openTopic(selectedGuid);
      el.querySelector<HTMLButtonElement>("[data-action='edit']")!.onclick = async () => { await controller.editTopic(selectedGuid); await render(); };
      el.querySelector<HTMLButtonElement>("[data-action='comment']")!.onclick = async () => { await controller.addComment(selectedGuid); await render(); };
      el.querySelector<HTMLButtonElement>("[data-action='resolve']")!.onclick = async () => { await controller.resolveTopic(selectedGuid); await render(); };
      el.querySelector<HTMLButtonElement>("[data-action='close']")!.onclick = async () => { await controller.closeTopic(selectedGuid); await render(); };
      el.querySelector<HTMLButtonElement>("[data-action='reopen']")!.onclick = async () => { await controller.reopenTopic(selectedGuid); await render(); };
      el.querySelector<HTMLButtonElement>("[data-action='delete']")!.onclick = async () => { await controller.deleteTopic(selectedGuid); await render(); };
    }
  };

  render().catch((error) => {
    el.innerHTML = `<pre style="white-space:pre-wrap;color:#991b1b;">${escapeHtml(String(error))}</pre>`;
  });
}
