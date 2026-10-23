// Станции карты и связи между ними. Каждая станция знает:
//  • откуда к ней приходят данные (входящие линии),
//  • что она делает и какие у неё данные сейчас (render),
//  • куда можно пойти дальше (исходящие линии + действия).

import {
  github, sonar, allure, site, links, jiraCreateUrl, statusRu, runTone, ago, rating, jiraKeys, explain, dropCache,
} from './integrations.js';
import { buildSuite, runSuite, summarize } from './suite.js';

export const STATIONS = {
  jira:     { name: 'Jira',            code: 'JR', color: 'var(--c-jira)',    x: 90,  y: 110, desc: 'Задачи и баги проекта CALC. С ключа задачи начинается любая работа.' },
  github:   { name: 'GitHub',          code: 'GH', color: 'var(--c-github)',  x: 340, y: 110, desc: 'Код, коммиты и pull request. Каждый push запускает проверки.' },
  ci:       { name: 'GitHub Actions',  code: 'CI', color: 'var(--c-ci)',      x: 610, y: 110, desc: 'Конвейер: сборка, автотесты, покрытие и публикация отчётов.' },
  sonar:    { name: 'SonarCloud',      code: 'SQ', color: 'var(--c-sonar)',   x: 880, y: 110, desc: 'Анализ кода: баги, уязвимости, code smells и Quality Gate.' },
  jenkins:  { name: 'Jenkins',         code: 'JK', color: 'var(--c-jenkins)', x: 340, y: 330, desc: 'Тот же конвейер для своего сервера — по Jenkinsfile из репозитория.' },
  tests:    { name: 'Автотесты',       code: 'AT', color: 'var(--c-tests)',   x: 610, y: 330, desc: 'Java: 114 тестов JUnit 5. Веб: те же сценарии на JavaScript.' },
  allure:   { name: 'Allure',          code: 'AL', color: 'var(--c-allure)',  x: 880, y: 330, desc: 'Отчёт по тестам: шаги, вложения, история прогонов.' },
  calc:     { name: 'Калькулятор',     code: '=',  color: 'var(--c-calc)',    x: 90,  y: 520, desc: 'Продукт, который мы тестируем. Слева — живая веб-версия.' },
  cases:    { name: 'Тест-кейсы',      code: 'TC', color: 'var(--c-cases)',   x: 610, y: 520, desc: '34 ручных сценария, 30 из них покрыты автотестами.' },
  settings: { name: 'Настройки',       code: '⚙',  color: 'var(--c-settings)', x: null, y: null, desc: 'Адреса, ключи проектов и токены. Хранятся только в этом браузере.' },
};

// [откуда, куда, что передаётся, обратная связь?]
export const EDGES = [
  ['jira', 'github', 'Ключ CALC-N в ветке, коммите и PR'],
  ['calc', 'github', 'Исходный код приложения'],
  ['github', 'ci', 'Push и pull request запускают конвейер'],
  ['github', 'sonar', 'Автоанализ каждого push'],
  ['github', 'jenkins', 'Jenkinsfile из репозитория'],
  ['ci', 'tests', 'mvn verify и node: Java и веб-тесты'],
  ['ci', 'sonar', 'Покрытие JaCoCo для анализа'],
  ['calc', 'tests', 'Движок калькулятора под тестом'],
  ['cases', 'tests', 'Сценарии для автотестов'],
  ['jenkins', 'tests', 'Тот же mvn verify'],
  ['tests', 'allure', 'Результаты с шагами и вложениями'],
  ['allure', 'jira', 'Баг из упавшего теста', true],
  ['sonar', 'jira', 'Задача из замечания анализа', true],
  ['ci', 'jira', 'Статус сборки в карточке задачи', true],
];

export const incoming = (id) => EDGES.filter((e) => e[1] === id);
export const outgoing = (id) => EDGES.filter((e) => e[0] === id);

// ------------------------------------------------------------------ helpers
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stat = (value, label, tone = '') => `<div class="stat ${tone}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
const btn = (label, { href, act, primary, id, disabled } = {}) => href
  ? `<a class="btn ${primary ? 'primary' : ''}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`
  : `<button class="btn ${primary ? 'primary' : ''}" data-act="${esc(act)}" ${id ? `id="${id}"` : ''} ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
const note = (html, tone = '') => `<div class="note ${tone}">${html}</div>`;
const failBox = (what, e) => note(`<b>${esc(what)}: не удалось получить данные.</b> ${esc(explain(e))}.`, 'bad');
const keyChips = (text, s) => jiraKeys(text, s.jiraProject).map((k) => `<a class="key-chip" href="${esc(links(s).jiraIssue(k))}" target="_blank" rel="noopener">${k}</a>`).join('');
const tone2dot = (t) => `<span class="dot ${t}"></span>`;
const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(1).replace('.0', '')}%`);

// ------------------------------------------------------------------ «куда дальше» для каждой станции
// Кроме линий карты у станции есть действия: внешние ссылки и шаги внутри приложения.
export function nextChoices(id, ctx) {
  const L = links(ctx.s);
  const toStation = outgoing(id).map(([, to, why]) => ({ to, title: STATIONS[to].name, hint: why }));
  const ext = (title, href, hint) => ({ href, title, hint });
  const go = (to, hint, title) => ({ to, title: title || STATIONS[to].name, hint });
  const extra = {
    jira: [go('github', 'Посмотреть коммиты с ключами задач', 'Коммиты с ключами'), ext('Доска CALC', L.jiraBoard, 'Текущий спринт и статусы'), ext('Инструкция CALC-20', L.jiraGuide, 'Как работать с задачами и PR')],
    github: [ext('Открыть репозиторий', L.repo, 'Код, README, документация'), ext('Создать pull request', L.newPr, 'Не забудьте ключ CALC-N в названии')],
    ci: [ext('Все запуски в GitHub', L.actions, 'Логи каждого шага'), go('settings', 'Токен нужен, чтобы запускать конвейер отсюда', 'Настроить запуск')],
    sonar: [ext('Открыть SonarCloud', L.sonar, 'Полный отчёт по коду'), go('github', 'Исправить код и отправить push', 'Исправить в коде')],
    jenkins: [ext('Jenkinsfile', L.jenkinsfile, 'Описание конвейера'), ext('Как настроить Jenkins', L.ciDoc + '#jenkins', 'Плагины, инструменты, Sonar')],
    tests: [go('cases', 'Какие сценарии покрыты', 'Тест-кейсы'), go('ci', 'Запуск Java-тестов в облаке', 'Запустить в CI')],
    allure: [ext('Открыть отчёт Allure', L.allure, 'Шаги, вложения, графики'), go('tests', 'Прогнать тесты ещё раз', 'Перезапустить тесты')],
    calc: [ext('Код калькулятора', `${L.repo}/blob/${ctx.s.branch}/src/main/java/Calculator.java`, 'Java Swing, движок и интерфейс')],
    cases: [ext('Все тест-кейсы', L.cases, 'Шаги и ожидаемые результаты'), ext('CSV для импорта в TMS', L.casesCsv, 'Qase, TestIT, TestRail'), ext('Создать проект в Qase', L.qase, 'Бесплатная TMS, вход через Google')],
    settings: [go('ci', 'Проверить, что токен работает'), go('sonar', 'Проверить ключ проекта'), go('jira', 'Проверить адрес Jira')],
  }[id] || [];
  // без повторов: если к станции уже ведёт линия карты, лишний переход с тем же названием не нужен
  const have = new Set(toStation.map((c) => c.to));
  const rest = extra.filter((c) => !(c.to && have.has(c.to) && c.title === STATIONS[c.to].name));
  return [...toStation, ...rest].slice(0, 9);
}

// ------------------------------------------------------------------ короткая подпись на карте
export async function mapStat(id, ctx) {
  const s = ctx.s;
  try {
    switch (id) {
      case 'ci': { const [r] = await github.runs(s); return { text: r ? `${statusRu(r)}, ${ago(r.updated_at)}` : 'запусков нет', tone: runTone(r) }; }
      case 'sonar': { const g = await sonar.gate(s); const m = await sonar.measures(s); return { text: `Gate ${g.status === 'OK' ? 'пройден' : g.status === 'ERROR' ? 'не пройден' : '—'}, багов ${m.bugs ?? '—'}`, tone: g.status === 'OK' ? 'ok' : g.status === 'ERROR' ? 'bad' : 'idle' }; }
      case 'allure': { const j = await allure.summary(s); const st = j.statistic; const bad = st.failed + st.broken; return { text: `${st.passed} из ${st.total} прошли`, tone: bad ? 'bad' : 'ok' }; }
      case 'tests': {
        if (ctx.lastRun) { const r = ctx.lastRun; return { text: `в браузере: ${r.passed}/${r.total}`, tone: r.failed + r.broken ? 'bad' : 'ok' }; }
        const j = await allure.summary(s); return { text: `${j.statistic.total} тестов в последнем прогоне`, tone: j.statistic.failed + j.statistic.broken ? 'bad' : 'ok' };
      }
      case 'github': { const [c] = await github.commits(s, 1); return { text: `коммит ${ago(c.commit.committer.date)}`, tone: 'ok' }; }
      case 'jira': { const j = await site.jira().catch(() => null); if (j?.configured) { const open = j.issues.filter((i) => i.category !== 'done').length; return { text: `открыто задач: ${open}`, tone: 'ok' }; } return { text: 'задачи — по ссылке', tone: 'idle' }; }
      case 'jenkins': return { text: s.jenkinsUrl ? 'сервер подключён' : 'Jenkinsfile готов', tone: s.jenkinsUrl ? 'ok' : 'idle' };
      case 'cases': { const j = await site.cases().catch(() => null); return { text: j ? `${j.cases.length} кейсов, ${j.cases.filter((c) => c.automated).length} авто` : '34 кейса', tone: 'ok' }; }
      case 'calc': return { text: `в истории ${ctx.engine.history.length}`, tone: 'ok' };
      default: return { text: '', tone: 'idle' };
    }
  } catch (e) {
    return { text: e?.status === 403 ? 'лимит запросов' : e?.status === 404 ? 'не найдено' : 'нет связи', tone: 'bad' };
  }
}

// ------------------------------------------------------------------ содержимое станций
export const RENDER = {
  async calc(ctx) {
    const e = ctx.engine;
    return `
      <div class="stats">
        ${stat(e.history.length, 'вычислений в истории')}
        ${stat(e.cache.size, 'выражений в кэше')}
        ${stat(e.cache.hits, 'попаданий в кэш')}
        ${stat(e.memory ? ctx.fmtMem() : 'пусто', 'память')}
      </div>
      ${note('<b>Точная арифметика:</b> 0.1 + 0.2 = 0.3, деление и корень — 34 значащие цифры, вывод — 12. Тот же движок, что в десктопной версии на Java: на 3000 случайных выражений результаты совпадают.')}
      <div class="actions">${btn('Вернуться к калькулятору', { act: 'focus-calc', primary: true })}${btn('Скопировать результат', { act: 'copy' })}</div>`;
  },

  async tests(ctx) {
    const s = ctx.s;
    let ci = '';
    try {
      const j = await allure.summary(s);
      const st = j.statistic;
      ci = `<div class="stats">${stat(st.total, 'тестов в последнем прогоне CI')}${stat(st.passed, 'прошли', 'ok')}${stat(st.failed + st.broken, 'упали', st.failed + st.broken ? 'bad' : '')}${stat(((j.time?.duration || 0) / 1000).toFixed(1) + ' с', 'длительность')}</div>`;
    } catch (e) { ci = failBox('Отчёт Allure', e); }
    let cov = '';
    try {
      const c = await site.coverage();
      cov = `<div><h4>Покрытие кода Java-тестами (JaCoCo)</h4><div class="stats">${stat(pct(c.line.pct), 'строк')}${stat(pct(c.branch.pct), 'ветвлений')}${stat(pct(c.method.pct), 'методов')}</div>
        <p style="margin:8px 0 0;font-size:13.5px;color:var(--dim)">Считается по всему Calculator.java, включая окно Swing, которое юнит-тесты не открывают. <a href="${esc(links(s).coverage)}" target="_blank" rel="noopener">Подробный отчёт по строкам</a></p></div>`;
    } catch { /* покрытие появится после первого запуска конвейера */ }
    const tokenOk = !!s.githubToken;
    return `
      <div>
        <h4>Где запустить</h4>
        <div class="actions">
          ${btn('В браузере — сейчас', { act: 'run-browser', primary: true, id: 'run-browser' })}
          ${btn(tokenOk ? 'В CI — Java + веб' : 'В CI — нужен токен', { act: tokenOk ? 'run-ci' : 'go-settings', id: 'run-ci' })}
        </div>
      </div>
      <div id="runner">${ctx.runnerHtml || note('В браузере проверяется веб-движок калькулятора: сценарии из Java-тестов и проверки памяти, кэша, истории и формата. В CI запускаются все 114 Java-тестов и эти же веб-тесты, результат — в Allure.')}</div>
      <div><h4>Последний прогон в CI</h4>${ci}</div>${cov}`;
  },

  async ci(ctx) {
    const s = ctx.s; const L = links(s);
    let list;
    try {
      const runs = await github.runs(s, 8, true);
      list = `<ul class="list">${runs.map((r) => `
        <li>${tone2dot(runTone(r))}
          <span class="title"><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${keyChips(r.head_commit?.message || '', s)}${esc((r.head_commit?.message || r.name).split('\n')[0])}</a></span>
          <span class="meta">${esc(statusRu(r))} · ${esc(ago(r.updated_at))}</span></li>`).join('')}</ul>`;
      ctx.watchRuns = runs.some((r) => r.status !== 'completed');
    } catch (e) { list = failBox('GitHub Actions', e); }
    return `
      <div class="actions">
        ${s.githubToken ? btn('Запустить конвейер', { act: 'run-ci', primary: true, id: 'run-ci' }) : btn('Добавить токен для запуска', { act: 'go-settings', primary: true })}
        ${btn('Открыть в GitHub', { href: L.workflow })}
      </div>
      <div id="ci-status"></div>
      <div><h4>Последние запуски</h4>${list}</div>
      ${note('Конвейер: <b>сборка → 114 Java-тестов + веб-тесты → JaCoCo → SonarCloud → Allure → GitHub Pages</b>. Запускается при каждом push, pull request и вручную.')}`;
  },

  async allure(ctx) {
    const s = ctx.s; const L = links(s);
    try {
      const [j, trend] = await Promise.all([allure.summary(s), allure.trend(s)]);
      const st = j.statistic;
      const bars = (trend || []).slice(0, 20).reverse().map((t) => {
        const d = t.data; const tot = d.total || 1; const f = ((d.failed + d.broken) / tot) * 100;
        return `<i class="${f ? 'f' : ''}" style="height:${Math.max(8, Math.min(100, tot / (st.total || 1) * 100))}%;--f:${f}%" title="${d.passed}/${d.total}"></i>`;
      }).join('');
      return `
        <div class="stats">
          ${stat(st.total, 'всего')}${stat(st.passed, 'прошли', 'ok')}${stat(st.failed, 'упали', st.failed ? 'bad' : '')}${stat(st.broken, 'сломаны', st.broken ? 'warn' : '')}${stat(st.skipped, 'пропущены')}
        </div>
        ${bars ? `<div><h4>История прогонов</h4><div class="bars">${bars}</div></div>` : ''}
        <div class="actions">${btn('Открыть отчёт', { href: L.allure, primary: true })}${btn('Завести баг в Jira', { href: jiraCreateUrl(s, { summary: '[Автотесты] ', description: `Отчёт Allure: ${L.allure}\n\nШаги:\n1. \n\nОжидается:\n\nФактически:\n`, labels: ['autotest'] }) })}</div>
        ${note('В отчёте: Java-тесты (эпик «Калькулятор») и веб-тесты (эпик «Веб-калькулятор»). У каждого теста — шаги, параметры и ссылка на тест-кейс.')}`;
    } catch (e) {
      return failBox('Отчёт Allure', e) + `<div class="actions">${btn('Открыть отчёт', { href: L.allure })}</div>`;
    }
  },

  async sonar(ctx) {
    const s = ctx.s; const L = links(s);
    try {
      const [m, g, iss, an] = await Promise.all([sonar.measures(s), sonar.gate(s), sonar.issues(s), sonar.analyses(s).catch(() => null)]);
      const gateTone = g.status === 'OK' ? 'ok' : g.status === 'ERROR' ? 'bad' : '';
      const sev = { BLOCKER: 'блокер', CRITICAL: 'критично', MAJOR: 'важно', MINOR: 'мелочь', INFO: 'инфо' };
      return `
        <div class="stats">
          ${stat(g.status === 'OK' ? 'Пройден' : g.status === 'ERROR' ? 'Не пройден' : 'Не посчитан', 'Quality Gate', gateTone)}
          ${stat(m.bugs ?? '—', 'баги', Number(m.bugs) ? 'bad' : 'ok')}
          ${stat(m.vulnerabilities ?? '—', 'уязвимости', Number(m.vulnerabilities) ? 'bad' : 'ok')}
          ${stat(m.code_smells ?? '—', 'code smells')}
          ${stat(m.coverage != null ? pct(m.coverage) : 'нет', 'покрытие')}
          ${stat(pct(m.duplicated_lines_density), 'дублирование')}
        </div>
        <div class="actions" style="align-items:center;gap:16px">
          <span>Надёжность <span class="grade g-${rating(m.reliability_rating)}">${rating(m.reliability_rating)}</span></span>
          <span>Безопасность <span class="grade g-${rating(m.security_rating)}">${rating(m.security_rating)}</span></span>
          <span>Поддерживаемость <span class="grade g-${rating(m.sqale_rating)}">${rating(m.sqale_rating)}</span></span>
        </div>
        <div><h4>Главные замечания (${iss.total})</h4>
          <ul class="list">${iss.issues.map((i) => {
            const file = i.component.split(':').pop();
            const jira = jiraCreateUrl(s, { type: 'task', summary: `[Sonar] ${i.message}`.slice(0, 250), description: `${file}:${i.line ?? ''}\nПравило: ${i.rule}\n${L.sonarIssues}&open=${i.key}`, labels: ['sonar'] });
            return `<li><span class="meta">${esc(sev[i.severity] || i.severity)}</span>
              <span class="title"><a href="${esc(L.sonarIssues + '&open=' + i.key)}" target="_blank" rel="noopener" title="${esc(i.message)}">${esc(i.message)}</a><br><span class="meta">${esc(file)}:${esc(i.line ?? '')}</span></span>
              <a class="key-chip" href="${esc(jira)}" target="_blank" rel="noopener">в Jira</a></li>`;
          }).join('')}</ul></div>
        ${m.coverage == null ? note(`<b>Покрытие не видно:</b> сейчас включён автоанализ SonarCloud. Чтобы видеть покрытие JaCoCo, выключите его на <a href="${esc(L.sonarMethod)}" target="_blank" rel="noopener">странице способа анализа</a> и добавьте секрет <a href="${esc(L.secrets)}" target="_blank" rel="noopener">SONAR_TOKEN</a>.`, 'warn') : ''}
        <p class="meta" style="margin:0;color:var(--dim);font-size:13px">Последний анализ: ${esc(ago(an?.date))}</p>`;
    } catch (e) {
      return failBox('SonarCloud', e) + `<div class="actions">${btn('Открыть SonarCloud', { href: L.sonar })}</div>`;
    }
  },

  async jira(ctx) {
    const s = ctx.s; const L = links(s);
    let snap = '';
    try {
      const j = await site.jira();
      if (j.configured) {
        const by = {};
        for (const i of j.issues) by[i.status] = (by[i.status] || 0) + 1;
        snap = `
          <div class="stats">${Object.entries(by).map(([k, v]) => stat(v, k)).join('')}</div>
          <div><h4>Задачи (обновлено ${esc(ago(j.updatedAt))})</h4><ul class="list">${j.issues.slice(0, 12).map((i) => `
            <li><a class="key-chip" href="${esc(L.jiraIssue(i.key))}" target="_blank" rel="noopener">${esc(i.key)}</a>
              <span class="title">${esc(i.summary)}</span><span class="meta">${esc(i.status)}</span></li>`).join('')}</ul></div>`;
      } else throw new Error('not configured');
    } catch {
      snap = note(`<b>Список задач появится здесь</b>, когда конвейер получит доступ к Jira: создайте <a href="${esc(L.jiraApiToken)}" target="_blank" rel="noopener">API-токен Atlassian</a> и добавьте в <a href="${esc(L.secrets)}" target="_blank" rel="noopener">секреты репозитория</a> <b>JIRA_EMAIL</b> и <b>JIRA_API_TOKEN</b>. Браузер напрямую в Jira не пускают — это защита Atlassian.`, 'warn');
    }
    let commits = '';
    try {
      const cs = await github.commits(s, 10);
      const withKeys = cs.filter((c) => jiraKeys(c.commit.message, s.jiraProject).length);
      commits = `<div><h4>Коммиты с ключами задач</h4>${withKeys.length ? `<ul class="list">${withKeys.slice(0, 6).map((c) => `
        <li>${keyChips(c.commit.message, s)}<span class="title"><a href="${esc(c.html_url)}" target="_blank" rel="noopener">${esc(c.commit.message.split('\n')[0].replace(new RegExp(`${s.jiraProject}-\\d+\\s*`, 'g'), ''))}</a></span><span class="meta">${esc(ago(c.commit.committer.date))}</span></li>`).join('')}</ul>` : note('В последних коммитах нет ключей задач.')}</div>`;
    } catch (e) { commits = failBox('Коммиты GitHub', e); }
    return `
      <div class="actions">
        ${btn('Открыть доску', { href: L.jiraBoard, primary: true })}
        ${btn('Создать задачу', { href: jiraCreateUrl(s, { type: 'task', summary: '' }) })}
        ${btn('Создать баг', { href: jiraCreateUrl(s, { type: 'bug', summary: '', description: 'Шаги:\n1. \n\nОжидается:\n\nФактически:\n' }) })}
      </div>
      ${snap}${commits}`;
  },

  async github(ctx) {
    const s = ctx.s; const L = links(s);
    try {
      const [repo, cs, prs] = await Promise.all([github.repo(s), github.commits(s, 8), github.pulls(s).catch(() => [])]);
      return `
        <div class="stats">${stat(repo.default_branch, 'основная ветка')}${stat(ago(repo.pushed_at), 'последний push')}${stat(prs.filter((p) => p.state === 'open').length, 'открытых PR')}${stat(repo.visibility === 'public' ? 'публичный' : 'закрытый', 'доступ')}</div>
        <div><h4>Последние коммиты</h4><ul class="list">${cs.map((c) => `
          <li>${tone2dot('ok')}<span class="title">${keyChips(c.commit.message, s)}<a href="${esc(c.html_url)}" target="_blank" rel="noopener">${esc(c.commit.message.split('\n')[0])}</a></span><span class="meta">${esc(ago(c.commit.committer.date))}</span></li>`).join('')}</ul></div>
        <div class="actions">${btn('Открыть репозиторий', { href: L.repo, primary: true })}${btn('Pull requests', { href: L.pulls })}</div>
        ${note('Правило: ветка <b>feature/CALC-N-описание</b>, коммит и PR начинаются с <b>CALC-N</b>. Без ключа проверка PR не пройдёт.')}`;
    } catch (e) { return failBox('GitHub', e); }
  },

  async jenkins(ctx) {
    const s = ctx.s; const L = links(s);
    let stages = ['Checkout', 'Сборка', 'Автотесты и покрытие', 'Анализ кода (Sonar)', 'Quality Gate'];
    try { const j = await site.jenkins(); if (j.stages?.length) stages = j.stages; } catch { /* берём по умолчанию */ }
    return `
      <div><h4>Этапы Jenkinsfile</h4><div class="pipeline">${stages.map((x) => `<span>${esc(x)}</span>`).join('')}<span>Allure</span></div></div>
      ${s.jenkinsUrl
        ? `<div class="actions">${btn('Открыть Jenkins', { href: s.jenkinsUrl, primary: true })}${btn('Jenkinsfile', { href: L.jenkinsfile })}</div>`
        : note(`<b>Своего сервера Jenkins пока нет</b> — те же этапы выполняет GitHub Actions. Когда появится сервер, укажите его адрес в настройках, и станция станет активной. Как подключить: <a href="${esc(L.ciDoc)}#jenkins" target="_blank" rel="noopener">docs/ci.md</a>.`)}
      ${s.jenkinsUrl ? '' : `<div class="actions">${btn('Указать адрес сервера', { act: 'go-settings', primary: true })}${btn('Jenkinsfile', { href: L.jenkinsfile })}</div>`}`;
  },

  async cases(ctx) {
    const L = links(ctx.s);
    try {
      const j = await site.cases();
      const bySuite = {};
      for (const c of j.cases) (bySuite[c.suite] ||= { all: 0, auto: 0 }), bySuite[c.suite].all++, c.automated && bySuite[c.suite].auto++;
      const auto = j.cases.filter((c) => c.automated).length;
      return `
        <div class="stats">${stat(j.cases.length, 'тест-кейсов')}${stat(auto, 'автоматизированы', 'ok')}${stat(j.cases.length - auto, 'только вручную')}${stat(Math.round(auto / j.cases.length * 100) + '%', 'покрытие автотестами')}</div>
        <div><h4>По разделам</h4><ul class="list">${Object.entries(bySuite).map(([k, v]) => `<li>${tone2dot(v.auto === v.all ? 'ok' : 'busy')}<span class="title">${esc(k)}</span><span class="meta">${v.auto} из ${v.all} авто</span></li>`).join('')}</ul></div>
        <div class="actions">${btn('Открыть тест-кейсы', { href: L.cases, primary: true })}${btn('CSV для TMS', { href: L.casesCsv })}</div>`;
    } catch (e) {
      return `<div class="actions">${btn('Открыть тест-кейсы', { href: L.cases, primary: true })}${btn('CSV для TMS', { href: L.casesCsv })}</div>`;
    }
  },

  async settings(ctx) {
    return `${note('Здесь задаются адреса GitHub, SonarCloud, Jira и Jenkins, токен для запуска конвейера и поведение приложения.')}
      <div class="actions">${btn('Открыть настройки', { act: 'go-settings', primary: true })}${btn('Проверить подключения', { act: 'check' })}</div>
      <div id="check-out"></div>`;
  },
};

// ------------------------------------------------------------------ запуск тестов в браузере
export async function runInBrowser(ctx, mount, onDone) {
  const cases = await site.webCases();
  const tests = buildSuite(cases);
  let passed = 0, failed = 0;
  const fails = [];
  const paint = (done, total) => {
    const okw = total ? (passed / Math.max(done, 1)) * 100 : 100;
    const html = `
      <div class="progress ${failed ? 'has-fail' : ''}" style="--okw:${okw}%"><i style="width:${(done / total) * 100}%"></i></div>
      <div class="stats" style="margin-top:12px">${stat(`${done}/${total}`, 'выполнено')}${stat(passed, 'прошли', 'ok')}${stat(failed, 'упали', failed ? 'bad' : '')}</div>
      ${fails.length ? `<ul class="list" style="margin-top:10px">${fails.map((r) => `
        <li>${tone2dot('bad')}<span class="title" title="${esc(r.message)}">${esc(r.title)}<br><span class="meta">${esc(r.message)}</span></span>
        <a class="key-chip" target="_blank" rel="noopener" href="${esc(jiraCreateUrl(ctx.s, { summary: `[Веб-калькулятор] ${r.title}`.slice(0, 250), description: `Тест: ${r.title}\nНажатия: ${r.keys || '—'}\nОжидается: ${r.expected || '—'}\n${r.message}\n\nЗапуск: в браузере, ${new Date().toLocaleString('ru')}`, labels: ['autotest', 'web'] }))}">баг в Jira</a></li>`).join('')}</ul>` : ''}`;
    ctx.runnerHtml = html;
    if (mount.isConnected) mount.innerHTML = html;
  };
  paint(0, tests.length);
  const results = await runSuite(tests, {
    onResult: (r, i, total) => {
      if (r.status === 'passed') passed++; else { failed++; fails.push(r); }
      if (i % 4 === 0 || i === total - 1) paint(i + 1, total);
    },
  });
  const sum = summarize(results);
  ctx.lastRun = sum;
  const verdict = sum.failed + sum.broken
    ? note(`<b>Упало тестов: ${sum.failed + sum.broken}.</b> Нажмите «баг в Jira» рядом с тестом — задача откроется с заполненными шагами.`, 'bad')
    : note(`<b>Все ${sum.total} тестов прошли</b> за ${sum.duration} мс. Чтобы прогнать ещё и 114 Java-тестов, запустите тесты в CI.`);
  ctx.runnerHtml += verdict;
  if (mount.isConnected) mount.insertAdjacentHTML('beforeend', verdict);
  onDone?.(sum);
}

// ------------------------------------------------------------------ запуск конвейера и слежение
export async function runInCi(ctx, mount, toast) {
  const s = ctx.s;
  const paint = (html) => { if (mount?.isConnected) mount.innerHTML = html; };
  const started = Date.now();
  try {
    paint(note('Отправляю команду в GitHub Actions…'));
    await github.dispatch(s);
    toast('Конвейер запущен');
  } catch (e) {
    paint(failBox('Запуск конвейера', e));
    return;
  }
  // ждём, пока запуск появится и закончится
  let run = null;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, i < 3 ? 3000 : 8000));
    try {
      dropCache();
      const runs = await github.runs(s, 8, true);
      run = runs.find((r) => r.event === 'workflow_dispatch' && new Date(r.created_at).getTime() > started - 60e3) || run;
      if (!run) { paint(note('Запуск поставлен в очередь, ждём, когда GitHub его покажет…')); continue; }
      let jobs = [];
      try { jobs = await github.jobs(s, run.id); } catch { /* шаги покажем позже */ }
      const steps = jobs.flatMap((j) => j.steps.map((st) => ({ ...st, job: j.name })));
      paint(`
        <div class="note"><b>${esc(statusRu(run))}</b> · <a href="${esc(run.html_url)}" target="_blank" rel="noopener">запуск #${run.run_number}</a> · ${Math.round((Date.now() - started) / 1000)} с</div>
        <div class="pipeline" style="margin-top:10px">${steps.filter((x) => !/^(Set up job|Complete job|Post )/.test(x.name)).map((x) => `<span title="${esc(x.job)}">${tone2dot(x.status !== 'completed' ? (x.status === 'in_progress' ? 'busy' : 'idle') : x.conclusion === 'success' ? 'ok' : x.conclusion === 'skipped' ? 'idle' : 'bad')} ${esc(x.name)}</span>`).join('')}</div>`);
      if (run.status === 'completed') {
        toast(run.conclusion === 'success' ? 'Конвейер прошёл, отчёт Allure обновлён' : `Конвейер: ${statusRu(run)}`);
        ctx.onCiDone?.(run);
        return;
      }
    } catch (e) { paint(failBox('GitHub Actions', e)); return; }
  }
}
