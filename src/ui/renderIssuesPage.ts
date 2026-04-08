import { IssueProject, IssueTopic } from "../domain/model";
import { escapeHtml } from "../utils/escapeHtml";

function renderCard(topic: IssueTopic): string {
  const snapshot = topic.viewpoints[0]?.snapshotBase64
    ? `data:image/png;base64,${topic.viewpoints[0].snapshotBase64}`
    : "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='#d9dde6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#56657a' font-family='Arial' font-size='16'>Нет снимка</text></svg>`);

  return `
    <article class="issue-card" data-guid="${escapeHtml(topic.guid)}">
      <img class="issue-card__img" src="${snapshot}" alt="snapshot" />
      <div class="issue-card__meta">
        <div class="issue-card__title">${topic.number}. ${escapeHtml(topic.title)}</div>
        <div class="issue-card__chips">
          <span class="chip chip--status">${escapeHtml(topic.status)}</span>
          <span class="chip">${escapeHtml(topic.priority)}</span>
          <span class="chip">${escapeHtml(topic.type)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderComments(topic: IssueTopic): string {
  if (topic.comments.length === 0) {
    return `<div class="comment-empty">Комментариев пока нет</div>`;
  }
  return topic.comments.map(comment => `
    <div class="comment-item">
      <div class="comment-item__head">
        <strong>${escapeHtml(comment.author)}</strong>
        <span>${escapeHtml(comment.date)}</span>
      </div>
      <div class="comment-item__body">${escapeHtml(comment.message)}</div>
    </div>
  `).join("");
}

export function renderIssuesPage(project: IssueProject): string {
  const selected = project.topics[0];
  const cards = project.topics.map(renderCard).join("");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Замечания BCF</title>
<style>
:root { --blue:#1a73e8; --line:#d7dde6; --muted:#64748b; --bg:#f4f6fa; --panel:#fff; --chip:#eef3fb; }
* { box-sizing:border-box; }
body { margin:0; font-family:Segoe UI, Arial, sans-serif; background:var(--bg); color:#1f2937; }
.page { display:grid; grid-template-rows:auto 1fr; height:100vh; }
.toolbar { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fff; border-bottom:1px solid var(--line); }
.toolbar__title { font-size:18px; font-weight:600; margin-right:auto; }
.btn { border:1px solid var(--line); background:#fff; color:#111827; border-radius:6px; padding:8px 12px; cursor:pointer; }
.btn--primary { background:var(--blue); color:#fff; border-color:var(--blue); }
.content { display:grid; grid-template-columns: 1.2fr 1fr; gap:0; min-height:0; }
.browser { border-right:1px solid var(--line); display:grid; grid-template-rows:auto 1fr; min-height:0; }
.browser__head { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#fff; border-bottom:1px solid var(--line); }
.browser__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; padding:14px; overflow:auto; }
.issue-card { background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.issue-card__img { width:100%; height:150px; object-fit:cover; display:block; background:#dfe5ee; }
.issue-card__meta { padding:10px; }
.issue-card__title { font-size:14px; line-height:1.35; min-height:38px; }
.issue-card__chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.chip { padding:4px 8px; border-radius:999px; background:var(--chip); color:#28415f; font-size:12px; }
.chip--status { background:#dbeafe; color:#11427d; }
.details { display:grid; grid-template-rows:auto auto 1fr; min-height:0; }
.details__head { background:#fff; border-bottom:1px solid var(--line); padding:14px; }
.details__title { font-size:18px; font-weight:600; margin-bottom:10px; }
.details__grid { display:grid; grid-template-columns:1fr 180px; gap:12px; }
.preview { width:100%; height:120px; border:1px solid var(--line); border-radius:8px; object-fit:cover; background:#dfe5ee; }
.field { margin-bottom:10px; }
.field label { display:block; font-size:12px; color:var(--muted); margin-bottom:4px; }
.input, .textarea, .select { width:100%; padding:8px 10px; border:1px solid var(--line); border-radius:6px; background:#fff; }
.textarea { min-height:86px; resize:vertical; }
.actions { display:flex; gap:8px; padding:10px 14px; background:#fff; border-bottom:1px solid var(--line); }
.tabs { display:grid; grid-template-rows:auto 1fr; min-height:0; }
.tabs__bar { display:flex; background:#fff; border-bottom:1px solid var(--line); }
.tabs__bar button { flex:1; padding:10px 12px; border:0; background:#fff; cursor:pointer; }
.tabs__bar button.active { color:var(--blue); box-shadow: inset 0 -2px 0 var(--blue); font-weight:600; }
.tabs__body { overflow:auto; padding:14px; }
.comment-item { background:#fff; border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:10px; }
.comment-item__head { display:flex; justify-content:space-between; gap:12px; font-size:12px; color:var(--muted); margin-bottom:8px; }
.quick-comment { display:grid; grid-template-columns:1fr auto; gap:8px; }
.comment-empty { color:var(--muted); }
.kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; font-size:14px; }
.kv div:nth-child(odd) { color:var(--muted); }
</style>
</head>
<body>
<div class="page">
  <header class="toolbar">
    <div class="toolbar__title">Замечания BCF — ${escapeHtml(project.name)}</div>
    <button class="btn">Импорт BCFZIP</button>
    <button class="btn">Экспорт BCFZIP</button>
    <button class="btn btn--primary">Создать замечание</button>
  </header>

  <section class="content">
    <section class="browser">
      <div class="browser__head">
        <strong>Все замечания</strong>
        <span>Всего: ${project.topics.length}</span>
      </div>
      <div class="browser__grid">${cards || '<div class="comment-empty">Замечаний пока нет</div>'}</div>
    </section>

    <section class="details">
      <div class="details__head">
        ${selected ? `
        <div class="details__title">${selected.number}. ${escapeHtml(selected.title)}</div>
        <div class="details__grid">
          <div>
            <div class="field"><label>Описание</label><div class="textarea">${escapeHtml(selected.description || '—')}</div></div>
            <div class="kv">
              <div>Статус</div><div>${escapeHtml(selected.status)}</div>
              <div>Назначено</div><div>${escapeHtml(selected.assignedTo || 'Unassigned')}</div>
              <div>Приоритет</div><div>${escapeHtml(selected.priority)}</div>
              <div>Тип</div><div>${escapeHtml(selected.type)}</div>
              <div>Срок</div><div>${escapeHtml(selected.deadline || '—')}</div>
            </div>
          </div>
          <div>
            <img class="preview" src="${selected.viewpoints[0]?.snapshotBase64 ? `data:image/png;base64,${selected.viewpoints[0].snapshotBase64}` : 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120"><rect width="100%" height="100%" fill="#d9dde6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#56657a" font-family="Arial" font-size="14">Нет снимка</text></svg>`)}" />
          </div>
        </div>` : '<div class="comment-empty">Выберите замечание</div>'}
      </div>

      <div class="actions">
        <button class="btn">Перейти к виду</button>
        <button class="btn">Изменить</button>
        <button class="btn">Устранить</button>
        <button class="btn">Переоткрыть</button>
      </div>

      <div class="tabs">
        <div class="tabs__bar">
          <button class="active">Комментарии</button>
          <button>Подробности</button>
          <button>Компоненты</button>
          <button>Видовая точка</button>
        </div>
        <div class="tabs__body">
          ${selected ? `
            <div class="field">
              <label>Быстрый комментарий</label>
              <div class="quick-comment">
                <input class="input" placeholder="Введите комментарий" />
                <button class="btn btn--primary">Отправить</button>
              </div>
            </div>
            ${renderComments(selected)}
          ` : '<div class="comment-empty">Нет данных</div>'}
        </div>
      </div>
    </section>
  </section>
</div>
</body>
</html>`;
}
