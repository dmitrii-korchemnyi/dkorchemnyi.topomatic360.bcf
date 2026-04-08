const test = require('node:test');
const assert = require('node:assert/strict');

let renderIssuesPage, escapeHtml;
test.before(async () => {
  ({ renderIssuesPage } = await import('../.tmp-build/src/ui/renderIssuesPage.js'));
  ({ escapeHtml } = await import('../.tmp-build/src/utils/escapeHtml.js'));
});

test('escapeHtml neutralizes dangerous characters', () => {
  assert.equal(escapeHtml(`<script>"'&</script>`), '&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;');
});

test('renderIssuesPage renders escaped project and topic fields', () => {
  const html = renderIssuesPage({
    projectId: 'p1',
    name: 'Project <A>',
    topics: [{ guid: 'g1', number: 1, title: '<Danger>', description: 'Desc & more', status: 'Открыто', priority: 'Обычный', type: 'Замечание', labels: [], assignedTo: 'Ivan', creationAuthor: 'A', creationDate: '2026-01-01', comments: [{ guid: 'c1', author: 'U', date: '2026-01-01', message: '<b>hello</b>' }], viewpoints: [] }]
  });
  assert.match(html, /Project &lt;A&gt;/);
  assert.match(html, /&lt;Danger&gt;/);
  assert.match(html, /&lt;b&gt;hello&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
