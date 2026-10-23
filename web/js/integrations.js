// Интеграции: настройки, GitHub, SonarCloud, Allure, Jira, данные сборки.
// Всё, что можно, читается вживую из публичных API (GitHub, SonarCloud — с CORS).
// Jira закрыта авторизацией и не пускает браузер с чужого сайта, поэтому её данные
// собирает конвейер в data/jira.json, а задачи создаются ссылкой с заполненными полями.

const KEY = 'qahub.settings.v1';

export const DEFAULTS = {
  owner: 'ravshanbekrakhmetullayev-ui',
  repo: 'java-calculator',
  branch: 'main',
  workflow: 'tests-allure.yml',
  githubToken: '',
  sonarProject: 'ravshanbekrakhmetullayev-ui_java-calculator',
  sonarOrg: 'ravshanbekrakhmetullayev-ui',
  jiraSite: 'https://ravshanbekrakhmetullayevqa.atlassian.net',
  jiraProject: 'CALC',
  jiraProjectId: '10001',
  jiraBugType: '10009',
  jiraTaskType: '10007',
  jiraBoard: '2',
  allureUrl: '',          // пусто — ./allure/ рядом с приложением
  jenkinsUrl: '',
  refreshSec: 60,
  groupDigits: true,
  sound: false,
  reduceMotion: false,
};

export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function resetSettings() { try { localStorage.removeItem(KEY); } catch { /* приватный режим */ } }

// ------------------------------------------------------------------ ссылки
export const links = (s) => {
  const repo = `https://github.com/${s.owner}/${s.repo}`;
  const pages = `https://${s.owner}.github.io/${s.repo}/`;
  const allure = s.allureUrl || new URL('allure/', location.href.replace(/[^/]*$/, '')).href;
  return {
    repo, pages, allure,
    coverage: new URL('coverage/', location.href.replace(/[^/]*$/, '')).href,
    actions: `${repo}/actions`,
    workflow: `${repo}/actions/workflows/${s.workflow}`,
    commits: `${repo}/commits/${s.branch}`,
    pulls: `${repo}/pulls`,
    newPr: `${repo}/compare`,
    secrets: `${repo}/settings/secrets/actions`,
    tokenNew: `https://github.com/settings/personal-access-tokens/new`,
    jenkinsfile: `${repo}/blob/${s.branch}/Jenkinsfile`,
    ciDoc: `${repo}/blob/${s.branch}/docs/ci.md`,
    jiraDoc: `${repo}/blob/${s.branch}/docs/jira.md`,
    cases: `${repo}/blob/${s.branch}/docs/test-cases.md`,
    casesCsv: `${repo}/blob/${s.branch}/docs/test-cases.csv`,
    sonar: `https://sonarcloud.io/summary/overall?id=${s.sonarProject}`,
    sonarIssues: `https://sonarcloud.io/project/issues?id=${s.sonarProject}&resolved=false`,
    sonarMethod: `https://sonarcloud.io/project/analysis_method?id=${s.sonarProject}`,
    sonarToken: `https://sonarcloud.io/account/security`,
    jiraBoard: `${s.jiraSite}/jira/software/projects/${s.jiraProject}/boards/${s.jiraBoard}`,
    jiraBacklog: `${s.jiraSite}/jira/software/projects/${s.jiraProject}/boards/${s.jiraBoard}/backlog`,
    jiraIssue: (k) => `${s.jiraSite}/browse/${k}`,
    jiraGuide: `${s.jiraSite}/browse/${s.jiraProject}-20`,
    jiraApiToken: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    qase: 'https://app.qase.io/signup',
    jenkins: s.jenkinsUrl || '',
  };
};

/** Ссылка «создать задачу в Jira» с заполненными полями (работает, если вы вошли в Jira). */
export function jiraCreateUrl(s, { summary, description = '', type = 'bug', labels = [] }) {
  const p = new URLSearchParams({
    pid: s.jiraProjectId,
    issuetype: type === 'bug' ? s.jiraBugType : s.jiraTaskType,
    summary,
    description,
  });
  if (labels.length) p.set('labels', labels.join(' '));
  return `${s.jiraSite}/secure/CreateIssueDetails!init.jspa?${p}`;
}

// ------------------------------------------------------------------ кэш запросов
const memo = new Map();
async function cached(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  memo.set(key, { t: Date.now(), v });
  return v;
}
export function dropCache() { memo.clear(); }

async function getJson(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    const err = new Error(`${r.status} ${r.statusText || ''}`.trim());
    err.status = r.status; err.body = text;
    throw err;
  }
  return r.status === 204 ? null : r.json();
}

// ------------------------------------------------------------------ GitHub
function ghInit(s, extra = {}) {
  const headers = { Accept: 'application/vnd.github+json', ...(extra.headers || {}) };
  if (s.githubToken) headers.Authorization = `Bearer ${s.githubToken}`;
  return { ...extra, headers };
}
const ghApi = (s, path) => `https://api.github.com/repos/${s.owner}/${s.repo}${path}`;

export const github = {
  repo: (s) => cached('gh:repo', 300e3, () => getJson(ghApi(s, ''), ghInit(s))),
  runs: (s, n = 8, fresh = false) => {
    if (fresh) memo.delete(`gh:runs:${n}`);
    return cached(`gh:runs:${n}`, s.refreshSec * 1000, () => getJson(ghApi(s, `/actions/runs?per_page=${n}`), ghInit(s)).then((j) => j.workflow_runs));
  },
  jobs: (s, runId) => getJson(ghApi(s, `/actions/runs/${runId}/jobs`), ghInit(s)).then((j) => j.jobs),
  commits: (s, n = 10) => cached(`gh:commits:${n}`, s.refreshSec * 1000, () => getJson(ghApi(s, `/commits?sha=${s.branch}&per_page=${n}`), ghInit(s))),
  pulls: (s) => cached('gh:pulls', s.refreshSec * 1000, () => getJson(ghApi(s, `/pulls?state=all&per_page=5`), ghInit(s))),
  rate: (s) => getJson('https://api.github.com/rate_limit', ghInit(s)).then((j) => j.resources.core),
  /** Запустить конвейер. Нужен токен с правом Actions: Read and write. */
  dispatch: async (s) => {
    if (!s.githubToken) throw Object.assign(new Error('Нет токена GitHub'), { code: 'no-token' });
    await getJson(ghApi(s, `/actions/workflows/${s.workflow}/dispatches`), ghInit(s, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: s.branch }),
    }));
    memo.delete('gh:runs:8');
  },
  rerun: (s, runId) => getJson(ghApi(s, `/actions/runs/${runId}/rerun`), ghInit(s, { method: 'POST' })),
};

// ------------------------------------------------------------------ SonarCloud
const SONAR_METRICS = 'alert_status,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,reliability_rating,security_rating,sqale_rating,security_hotspots';
export const sonar = {
  measures: (s) => cached('sonar:m', s.refreshSec * 1000, async () => {
    const j = await getJson(`https://sonarcloud.io/api/measures/component?component=${s.sonarProject}&metricKeys=${SONAR_METRICS}`);
    return Object.fromEntries(j.component.measures.map((m) => [m.metric, m.value]));
  }),
  gate: (s) => cached('sonar:qg', s.refreshSec * 1000, () =>
    getJson(`https://sonarcloud.io/api/qualitygates/project_status?projectKey=${s.sonarProject}`).then((j) => j.projectStatus)),
  issues: (s, n = 6) => cached('sonar:issues', s.refreshSec * 1000, () =>
    getJson(`https://sonarcloud.io/api/issues/search?componentKeys=${s.sonarProject}&resolved=false&ps=${n}&s=SEVERITY&asc=false`)),
  analyses: (s) => cached('sonar:an', s.refreshSec * 1000, () =>
    getJson(`https://sonarcloud.io/api/project_analyses/search?project=${s.sonarProject}&ps=1`).then((j) => j.analyses[0])),
};

// ------------------------------------------------------------------ Allure и данные сборки
export const allure = {
  summary: (s) => cached('allure:sum', s.refreshSec * 1000, () => getJson(new URL('widgets/summary.json', links(s).allure).href)),
  trend: (s) => cached('allure:trend', s.refreshSec * 1000, () => getJson(new URL('widgets/history-trend.json', links(s).allure).href).catch(() => [])),
  suites: (s) => cached('allure:suites', s.refreshSec * 1000, () => getJson(new URL('widgets/suites.json', links(s).allure).href).catch(() => null)),
};

export const site = {
  build: () => cached('data:build', 60e3, () => getJson('data/build.json')),
  jira: () => cached('data:jira', 60e3, () => getJson('data/jira.json')),
  cases: () => cached('data:cases', 300e3, () => getJson('data/test-cases.json')),
  jenkins: () => cached('data:jenkins', 300e3, () => getJson('data/jenkins.json')),
  coverage: () => cached('data:coverage', 60e3, () => getJson('data/coverage.json')),
  webCases: () => cached('web:cases', 300e3, () => getJson('tests/cases.json')),
};

// ------------------------------------------------------------------ проверка подключений
export async function checkAll(s) {
  const L = links(s);
  const probe = async (name, fn, okText) => {
    const t = performance.now();
    try { const detail = await fn(); return { name, ok: true, detail: detail ?? okText, ms: Math.round(performance.now() - t) }; }
    catch (e) { return { name, ok: false, detail: explain(e), ms: Math.round(performance.now() - t) }; }
  };
  return Promise.all([
    probe('GitHub API', async () => { const r = await github.rate(s); return `${s.githubToken ? 'с токеном' : 'без токена'}, осталось ${r.remaining} из ${r.limit} запросов в час`; }),
    probe('Запуск конвейера', async () => {
      if (!s.githubToken) throw Object.assign(new Error(), { code: 'no-token' });
      const r = await getJson(ghApi(s, ''), ghInit(s));
      if (!r.permissions?.push) throw new Error('у токена нет права записи в репозиторий');
      return 'токен может запускать конвейер';
    }),
    probe('GitHub Actions', async () => { const [r] = await github.runs(s, 8, true); return r ? `последний запуск: ${statusRu(r)}` : 'запусков ещё не было'; }),
    probe('SonarCloud', async () => { const g = await sonar.gate(s); return `Quality Gate: ${g.status === 'OK' ? 'пройден' : g.status === 'ERROR' ? 'не пройден' : 'не посчитан'}`; }),
    probe('Отчёт Allure', async () => { const j = await allure.summary(s); return `${j.statistic.passed} из ${j.statistic.total} тестов прошли`; }),
    probe('Данные Jira', async () => {
      const j = await site.jira();
      if (!j.configured) throw new Error('конвейер ещё не получил доступ к Jira (секреты JIRA_EMAIL и JIRA_API_TOKEN)');
      return `${j.issues.length} задач, обновлено ${ago(j.updatedAt)}`;
    }),
    probe('Jenkins', async () => {
      if (!L.jenkins) throw new Error('адрес сервера не указан — используется GitHub Actions');
      await fetch(L.jenkins, { mode: 'no-cors' });
      return 'сервер отвечает';
    }),
  ]);
}

export function explain(e) {
  if (e?.code === 'no-token') return 'нужен токен GitHub — добавьте его в настройках';
  if (e?.status === 401) return 'токен не подходит или истёк';
  if (e?.status === 403) return e.body?.includes('rate limit') ? 'лимит GitHub API исчерпан — добавьте токен или подождите час' : 'нет прав на это действие';
  if (e?.status === 404) return 'не найдено — проверьте названия в настройках';
  if (e instanceof TypeError) return 'нет ответа: сеть или сервис недоступен';
  return e?.message || 'неизвестная ошибка';
}

// ------------------------------------------------------------------ мелочи
export function statusRu(run) {
  if (!run) return '—';
  if (run.status !== 'completed') return { queued: 'в очереди', in_progress: 'выполняется', waiting: 'ждёт', requested: 'запрошен', pending: 'ожидает' }[run.status] || run.status;
  return { success: 'успешно', failure: 'упал', cancelled: 'отменён', skipped: 'пропущен', timed_out: 'превышено время', action_required: 'нужно действие' }[run.conclusion] || run.conclusion;
}
export function runTone(run) {
  if (!run) return 'idle';
  if (run.status !== 'completed') return 'busy';
  return run.conclusion === 'success' ? 'ok' : run.conclusion === 'cancelled' || run.conclusion === 'skipped' ? 'idle' : 'bad';
}
export function ago(iso) {
  if (!iso) return '—';
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'только что';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}
export const rating = (v) => (v ? 'ABCDE'[Math.round(Number(v)) - 1] || '—' : '—');
export const jiraKeys = (text, project) => [...new Set((text.match(new RegExp(`\\b${project}-\\d+\\b`, 'g')) || []))];
