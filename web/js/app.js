import { Engine, format, pretty, mapChar } from './engine.js';
import {
  loadSettings, saveSettings, resetSettings, DEFAULTS, links, checkAll, github, sonar, allure, site,
  statusRu, runTone, ago, dropCache,
} from './integrations.js';
import { STATIONS, EDGES, incoming, nextChoices, mapStat, RENDER, runInBrowser, runInCi } from './stations.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ctx = {
  s: loadSettings(),
  engine: new Engine(),
  runnerHtml: '',
  lastRun: null,
  fmtMem: () => (ctx.engine.memory ? show(format(ctx.engine.memory)) : ''),
};
const show = (t) => (ctx.s.groupDigits ? pretty(t) : t);
document.documentElement.classList.toggle('reduce-motion', !!ctx.s.reduceMotion);

// ================================================================== уведомления
let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
ctx.toast = toast;

// ================================================================== калькулятор
const KEYS = [
  ['MC', 'fn'], ['MR', 'fn'], ['M+', 'fn'], ['M−', 'fn'], ['C', 'fn'],
  ['(', 'fn'], [')', 'fn'], ['%', 'fn'], ['√', 'fn'], ['⌫', 'fn'],
  ['7'], ['8'], ['9'], ['÷', 'op'], ['x²', 'fn'],
  ['4'], ['5'], ['6'], ['×', 'op'], ['1/x', 'fn'],
  ['1'], ['2'], ['3'], ['−', 'op'], ['±', 'fn'],
  ['0', 'wide'], ['.'], ['+', 'op'], ['=', 'eq'],
];
const LABELS = { '⌫': 'Стереть последний символ', C: 'Очистить', MC: 'Очистить память', MR: 'Вставить из памяти', 'M+': 'Прибавить к памяти', 'M−': 'Вычесть из памяти', '√': 'Квадратный корень', 'x²': 'Квадрат', '1/x': 'Обратное число', '±': 'Сменить знак', '%': 'Процент' };

const keysEl = $('#keys');
keysEl.innerHTML = KEYS.map(([k, cls = '']) =>
  `<button class="key ${cls}" data-key="${esc(k)}" ${LABELS[k] ? `aria-label="${esc(LABELS[k])}" title="${esc(LABELS[k])}"` : ''}>${esc(k)}</button>`).join('');
keysEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-key]');
  if (b) press(b.dataset.key);
});

const HKEY = 'qahub.history.v1';
try { ctx.engine.history = JSON.parse(localStorage.getItem(HKEY) || '[]').slice(0, 200); } catch { /* пусто */ }

let audio;
function click() {
  if (!ctx.s.sound) return;
  try {
    audio ||= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 520; g.gain.value = 0.04;
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.03);
  } catch { /* без звука */ }
}

function press(k) {
  const before = ctx.engine.history.length;
  const top = ctx.engine.history[0];
  ctx.engine.input(k);
  click();
  const btnEl = keysEl.querySelector(`[data-key="${CSS.escape(k === '²' ? 'x²' : k)}"]`);
  if (btnEl) { btnEl.classList.add('hit'); setTimeout(() => btnEl.classList.remove('hit'), 90); }
  if (ctx.engine.history.length !== before || ctx.engine.history[0] !== top) {
    try { localStorage.setItem(HKEY, JSON.stringify(ctx.engine.history)); } catch { /* приватный режим */ }
    renderHistory();
  }
  renderDisplay();
}

function renderDisplay() {
  const e = ctx.engine;
  $('#d-mem').textContent = e.memory ? `M ${show(format(e.memory))}` : '';
  const main = $('#d-main');
  if (e.error) {
    $('#d-top').textContent = `${show(e.lastExpr)} =`;
    main.textContent = e.error;
    main.classList.add('error');
    $('#d-preview').textContent = '';
  } else {
    main.classList.remove('error');
    $('#d-top').textContent = e.justEvaluated && e.lastExpr ? `${show(e.lastExpr)} =` : '';
    main.textContent = e.expr ? show(e.expr) : '0';
    const p = e.preview();
    $('#d-preview').textContent = p ? `= ${show(p)}` : '';
    const len = main.textContent.length;
    main.style.fontSize = len > 22 ? '28px' : len > 16 ? '36px' : len > 12 ? '44px' : '';
  }
}

function renderHistory() {
  const h = ctx.engine.history;
  $('#history-list').innerHTML = h.length
    ? h.slice(0, 50).map(([ex, r], i) => `<li><button data-h="${i}" title="Вставить результат"><span class="h-expr">${esc(show(ex))} =</span><span class="h-res">${esc(show(r))}</span></button></li>`).join('')
    : '<li class="empty">Здесь появятся ваши вычисления.</li>';
}
$('#history-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-h]');
  if (!b) return;
  const [, r] = ctx.engine.history[Number(b.dataset.h)];
  ctx.engine.clear();
  for (const ch of r.replace('−', '-')) { const k = mapChar(ch); if (k && k !== '=') ctx.engine.input(k); }
  renderDisplay();
});
$('#toggle-history').addEventListener('click', (e) => {
  const h = $('#history');
  h.hidden = !h.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!h.hidden));
});
$('#clear-history').addEventListener('click', () => {
  ctx.engine.history = [];
  try { localStorage.removeItem(HKEY); } catch { /* */ }
  renderHistory();
  toast('История очищена');
});

async function copyResult() {
  const v = ctx.engine.currentValue();
  const text = v ? format(v).replaceAll('−', '-') : '0';
  try { await navigator.clipboard.writeText(text); toast(`Скопировано: ${text}`); }
  catch { toast('Браузер не дал доступ к буферу обмена'); }
}
async function pasteExpression(text) {
  try {
    text ??= await navigator.clipboard.readText();
    let n = 0;
    for (const ch of text) { const k = mapChar(ch); if (k && k !== '=') { ctx.engine.input(k); n++; } }
    renderDisplay();
    toast(n ? 'Вставлено' : 'В буфере нет выражения');
  } catch { toast('Браузер не дал доступ к буферу обмена — нажмите ⌘V / Ctrl+V'); }
}
$('#copy').addEventListener('click', copyResult);
$('#paste').addEventListener('click', () => pasteExpression());
document.addEventListener('paste', (e) => {
  if (overlayOpen() || e.target.closest('input')) return;
  e.preventDefault();
  pasteExpression(e.clipboardData.getData('text'));
});

// ================================================================== карта
const map = $('#map');
const VB = { w: 1000, h: 620 };

// Линии, которые нельзя провести напрямую, не задев другую станцию, — объездом.
const DETOURS = {
  'github>sonar': 'M340 110 L430 200 H790 L880 110',
  'allure>jira': 'M880 364 V598 H40 V110 H56',
  'sonar>jira': 'M880 76 V30 H96 V76',
  'ci>jira': 'M610 76 V48 H112 V80',
};

function edgePath([from, to]) {
  const custom = DETOURS[`${from}>${to}`];
  if (custom) return custom;
  const a = STATIONS[from], b = STATIONS[to];
  const dx = b.x - a.x, dy = b.y - a.y;
  if (!dx || !dy) return `M${a.x} ${a.y} L${b.x} ${b.y}`;
  // как на схеме метро: прямой участок и диагональ под 45°
  const run = Math.abs(dx) - Math.abs(dy);
  if (run >= 0) return `M${a.x} ${a.y} H${a.x + Math.sign(dx) * run} L${b.x} ${b.y}`;
  return `M${a.x} ${a.y} V${a.y + Math.sign(dy) * (Math.abs(dy) - Math.abs(dx))} L${b.x} ${b.y}`;
}

function drawMap() {
  $('#map-lines').innerHTML = EDGES.map((e) => {
    const back = !!e[3];
    const color = back ? 'var(--c-jira)' : STATIONS[e[0]].color;
    return `<path d="${edgePath(e)}" class="${back ? 'back' : ''}" data-from="${e[0]}" data-to="${e[1]}" style="stroke:${color};color:${color}"><title>${esc(STATIONS[e[0]].name)} → ${esc(STATIONS[e[1]].name)}: ${esc(e[2])}</title></path>`;
  }).join('');
  map.querySelectorAll('.station').forEach((n) => n.remove());
  for (const [id, st] of Object.entries(STATIONS)) {
    if (st.x == null) continue;
    const b = document.createElement('button');
    b.className = 'station';
    b.dataset.station = id;
    b.style.left = `${(st.x / VB.w) * 100}%`;
    b.style.top = `${(st.y / VB.h) * 100}%`;
    b.style.setProperty('--c', st.color);
    b.innerHTML = `<span class="ring">${esc(st.code)}<span class="dot" id="dot-${id}"></span></span>
      <span class="st-text"><span class="st-name">${esc(st.name)}</span><span class="st-stat" id="stat-${id}"><span class="skeleton" style="width:90px;display:inline-block"></span></span></span>`;
    b.setAttribute('aria-label', `${st.name}: открыть маршрут`);
    map.append(b);
  }
}
drawMap();

map.addEventListener('click', (e) => {
  const b = e.target.closest('.station');
  if (b) openRoute(b.dataset.station);
});
map.addEventListener('pointerover', (e) => {
  const b = e.target.closest('.station');
  const id = b?.dataset.station;
  map.querySelectorAll('.map-lines path').forEach((p) => {
    const on = id && (p.dataset.from === id || p.dataset.to === id);
    p.classList.toggle('lit', !!on);
    p.classList.toggle('dim', !!id && !on);
  });
});
map.addEventListener('pointerleave', () => map.querySelectorAll('.map-lines path').forEach((p) => p.classList.remove('lit', 'dim')));

async function refreshMap() {
  await Promise.all(Object.keys(STATIONS).filter((id) => STATIONS[id].x != null).map(async (id) => {
    const r = await mapStat(id, ctx);
    const st = $(`#stat-${id}`), dot = $(`#dot-${id}`);
    if (st) st.textContent = r.text;
    if (dot) dot.className = `dot ${r.tone}`;
  }));
}

// ================================================================== пульс в шапке
async function refreshPulse() {
  const s = ctx.s;
  const pill = (id, tone, label, value) => `<button class="pill" data-station="${id}"><span class="dot ${tone}"></span>${esc(label)} <b>${esc(value)}</b></button>`;
  const parts = await Promise.all([
    github.runs(s).then(([r]) => pill('ci', runTone(r), 'Сборка', statusRu(r))).catch(() => pill('ci', 'bad', 'Сборка', 'нет связи')),
    allure.summary(s).then((j) => pill('allure', j.statistic.failed + j.statistic.broken ? 'bad' : 'ok', 'Тесты', `${j.statistic.passed}/${j.statistic.total}`)).catch(() => pill('allure', 'idle', 'Тесты', '—')),
    sonar.gate(s).then((g) => pill('sonar', g.status === 'OK' ? 'ok' : g.status === 'ERROR' ? 'bad' : 'idle', 'Quality Gate', g.status === 'OK' ? 'пройден' : g.status === 'ERROR' ? 'не пройден' : '—')).catch(() => pill('sonar', 'idle', 'Quality Gate', '—')),
    site.build().then((b) => pill('github', 'ok', 'Версия', `${b.sha.slice(0, 7)} · ${ago(b.time)}`)).catch(() => ''),
  ]);
  $('#pulse').innerHTML = parts.join('');
}
$('#pulse').addEventListener('click', (e) => {
  const b = e.target.closest('[data-station]');
  if (b) openRoute(b.dataset.station);
});

// ================================================================== экран маршрута
const route = $('#route');
let trail = [];
let lastFocus = null;
const overlayOpen = () => !route.hidden || !$('#settings').hidden || !$('#install-help').hidden;

function openRoute(id, { push = true } = {}) {
  if (route.hidden) { lastFocus = document.activeElement; trail = []; route.hidden = false; document.body.style.overflow = 'hidden'; }
  if (push) {
    const at = trail.indexOf(id);
    trail = at >= 0 ? trail.slice(0, at + 1) : [...trail, id];
  }
  renderRoute(id);
}

function closeRoute() {
  route.hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus?.();
  refreshMap();
}

let renderToken = 0;
async function renderRoute(id) {
  const st = STATIONS[id];
  const token = ++renderToken;
  route.style.setProperty('--c', st.color);
  const card = $('#station-card');
  card.style.setProperty('--c', st.color);
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';

  $('#trail').innerHTML = `<li><button data-trail="-1">Карта</button></li>` +
    trail.map((t, i) => `<li><button data-trail="${i}">${esc(STATIONS[t].name)}</button></li>`).join('');

  $('#sc-badge').textContent = st.code;
  $('#sc-badge').style.setProperty('--c', st.color);
  $('#route-title').textContent = st.name;
  $('#sc-desc').textContent = st.desc;

  const ins = id === 'settings' ? [['calc', 'settings', 'Вы задаёте адреса и токены']] : incoming(id);
  $('#route-from').innerHTML = ins.length
    ? ins.map(([f, , why]) => `<li><button class="from-item" data-go="${f}" style="--c:${STATIONS[f].color}"><span class="mini-ring">${esc(STATIONS[f].code)}</span><span>${esc(STATIONS[f].name)}<small>${esc(why)}</small></span></button></li>`).join('')
    : `<li class="from-item" style="cursor:default"><span class="mini-ring" style="--c:var(--amber)">★</span><span>Начало пути<small>Здесь начинается любая работа</small></span></li>`;

  const choices = nextChoices(id, ctx);
  $('#route-next').innerHTML = choices.map((c, i) => {
    const color = c.to ? STATIONS[c.to].color : st.color;
    return c.to
      ? `<li><button class="choice" data-go="${c.to}" data-n="${i + 1}" style="--c:${color}"><kbd>${i + 1}</kbd><b>${esc(c.title)}</b><small>${esc(c.hint)}</small></button></li>`
      : `<li><a class="choice ext" href="${esc(c.href)}" target="_blank" rel="noopener" data-n="${i + 1}" style="--c:${color}"><kbd>${i + 1}</kbd><b>${esc(c.title)}</b><small>${esc(c.hint)}</small></a></li>`;
  }).join('');

  const body = $('#sc-body');
  body.innerHTML = '<div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:40%"></div>';
  requestAnimationFrame(drawRouteLines);
  (route.querySelector('.choice') || $('#route-close')).focus({ preventScroll: true });

  const html = await RENDER[id](ctx).catch((e) => `<div class="note bad"><b>Ошибка:</b> ${esc(e.message)}</div>`);
  if (token !== renderToken) return;
  body.innerHTML = html;
  requestAnimationFrame(drawRouteLines);
  if (id === 'ci' && ctx.watchRuns) watchCi(token);
}

function drawRouteLines() {
  const stage = $('#route-stage');
  const svg = $('#route-lines');
  if (getComputedStyle(svg).display === 'none') return;
  const box = stage.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const card = $('#station-card').getBoundingClientRect();
  const cy = Math.min(card.top + 80, card.top + card.height / 2) - box.top;
  const paths = [];
  route.querySelectorAll('#route-from .from-item').forEach((el) => {
    const r = el.getBoundingClientRect();
    const x1 = r.right - box.left, y1 = r.top + r.height / 2 - box.top, x2 = card.left - box.left;
    const color = getComputedStyle(el).getPropertyValue('--c') || 'var(--rail)';
    paths.push(`<path class="flow" d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${cy} ${x2} ${cy}" style="stroke:${color}"/>`);
  });
  route.querySelectorAll('#route-next .choice').forEach((el) => {
    const r = el.getBoundingClientRect();
    const x1 = card.right - box.left, x2 = r.left - box.left, y2 = r.top + r.height / 2 - box.top;
    const color = getComputedStyle(el).getPropertyValue('--c');
    paths.push(`<path data-n="${el.dataset.n}" d="M${x1} ${cy} C${(x1 + x2) / 2} ${cy} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" style="stroke:${color}"/>`);
  });
  svg.innerHTML = paths.join('');
}
window.addEventListener('resize', () => { if (!route.hidden) drawRouteLines(); });
$('#station-card').addEventListener('scroll', () => drawRouteLines(), { passive: true });

route.addEventListener('pointerover', (e) => {
  const c = e.target.closest('.choice');
  $('#route-lines').querySelectorAll('path[data-n]').forEach((p) => p.classList.toggle('hot', !!c && p.dataset.n === c.dataset.n));
});
route.addEventListener('focusin', (e) => {
  const c = e.target.closest('.choice');
  $('#route-lines').querySelectorAll('path[data-n]').forEach((p) => p.classList.toggle('hot', !!c && p.dataset.n === c.dataset.n));
});

route.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-trail]');
  if (t) {
    const i = Number(t.dataset.trail);
    if (i < 0) return closeRoute();
    trail = trail.slice(0, i + 1);
    return renderRoute(trail[i]);
  }
  const go = e.target.closest('[data-go]');
  if (go) {
    if (go.dataset.go === 'settings') { openSettings(); return; }
    return openRoute(go.dataset.go);
  }
  const act = e.target.closest('[data-act]');
  if (act) handleAction(act.dataset.act, act);
});
$('#route-close').addEventListener('click', closeRoute);

async function handleAction(act, el) {
  switch (act) {
    case 'focus-calc': closeRoute(); keysEl.querySelector('[data-key="="]').focus(); break;
    case 'copy': copyResult(); break;
    case 'go-settings': openSettings(); break;
    case 'check': {
      const out = $('#check-out');
      out.innerHTML = '<div class="skeleton" style="width:70%"></div>';
      out.innerHTML = renderChecks(await checkAll(ctx.s));
      break;
    }
    case 'run-browser': {
      el.disabled = true;
      el.textContent = 'Выполняется…';
      await runInBrowser(ctx, $('#runner'), (sum) => {
        el.disabled = false;
        el.textContent = 'Запустить ещё раз';
        toast(sum.failed + sum.broken ? `Упало тестов: ${sum.failed + sum.broken}` : `Все ${sum.total} тестов прошли`);
        refreshMap();
      });
      break;
    }
    case 'run-ci': {
      el.disabled = true;
      const mount = $('#ci-status') || $('#runner');
      ctx.onCiDone = () => { dropCache(); refreshPulse(); refreshMap(); el.disabled = false; };
      await runInCi(ctx, mount, toast);
      el.disabled = false;
      break;
    }
    default: break;
  }
}

async function watchCi(token) {
  while (!route.hidden && token === renderToken && trail.at(-1) === 'ci') {
    await new Promise((r) => setTimeout(r, 10000));
    if (token !== renderToken || route.hidden) return;
    dropCache();
    renderRoute('ci');
    return;
  }
}

// ================================================================== настройки
const FIELDS = [
  { group: 'GitHub', st: 'github', items: [
    ['owner', 'Владелец (аккаунт)'], ['repo', 'Репозиторий'], ['branch', 'Ветка'], ['workflow', 'Файл конвейера'],
    ['githubToken', 'Токен GitHub для запуска конвейера', 'password',
      'Fine-grained token: доступ только к java-calculator, права Actions — Read and write, Contents — Read. Хранится только в этом браузере. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Создать токен</a>'],
  ] },
  { group: 'SonarCloud', st: 'sonar', items: [['sonarProject', 'Ключ проекта'], ['sonarOrg', 'Организация']] },
  { group: 'Jira', st: 'jira', items: [
    ['jiraSite', 'Адрес сайта', 'url'], ['jiraProject', 'Ключ проекта'], ['jiraBoard', 'Номер доски'],
    ['jiraProjectId', 'ID проекта', 'text', 'Нужны для кнопок «Создать баг/задачу» с заполненными полями.'], ['jiraBugType', 'ID типа «Баг»'], ['jiraTaskType', 'ID типа «Задача»'],
  ] },
  { group: 'Allure и Jenkins', st: 'allure', items: [
    ['allureUrl', 'Адрес отчёта Allure', 'url', 'Пусто — отчёт рядом с приложением, в папке allure/.'],
    ['jenkinsUrl', 'Адрес сервера Jenkins', 'url', 'Пусто — конвейер работает в GitHub Actions.'],
  ] },
  { group: 'Приложение', st: 'calc', items: [
    ['refreshSec', 'Обновлять данные, секунд', 'number'],
    ['groupDigits', 'Разделять разряды: 1 234 567', 'check'],
    ['sound', 'Звук нажатия клавиш', 'check'],
    ['reduceMotion', 'Без анимации', 'check'],
  ] },
];

function renderSettings() {
  const s = ctx.s;
  $('#settings-body').innerHTML = FIELDS.map((g) => `
    <fieldset><legend><span class="mini-ring" style="--c:${STATIONS[g.st].color}">${esc(STATIONS[g.st].code)}</span>${esc(g.group)}</legend>
      ${g.items.map(([k, label, type = 'text', hint]) => type === 'check'
        ? `<label class="check"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}>${esc(label)}</label>`
        : `<div class="field"><label for="f-${k}">${esc(label)}</label>
            ${type === 'password'
              ? `<div class="pw"><input id="f-${k}" name="${k}" type="password" autocomplete="off" spellcheck="false" value="${esc(s[k])}" placeholder="github_pat_…"><button type="button" data-reveal="f-${k}">Показать</button></div>`
              : `<input id="f-${k}" name="${k}" type="${type}" value="${esc(s[k])}" placeholder="${esc(DEFAULTS[k])}" ${type === 'number' ? 'min="15" step="5"' : ''} spellcheck="false">`}
            ${hint ? `<span class="hint">${hint}</span>` : ''}</div>`).join('')}
    </fieldset>`).join('') + `
    <ul class="checks" id="settings-checks"></ul>
    <div class="settings-tools">
      <button type="button" class="link-btn" id="settings-export">Скачать настройки (без токена)</button>
      <label class="link-btn" style="cursor:pointer">Загрузить настройки<input type="file" accept="application/json" id="settings-import" hidden></label>
      <button type="button" class="link-btn" id="settings-reset">Сбросить к стандартным</button>
    </div>`;
}

function readForm() {
  const f = $('#settings-form');
  const next = { ...ctx.s };
  for (const g of FIELDS) for (const [k, , type] of g.items) {
    const el = f.elements[k];
    if (type === 'check') next[k] = el.checked;
    else if (type === 'number') next[k] = Math.max(15, Number(el.value) || DEFAULTS[k]);
    else next[k] = el.value.trim() || (k === 'githubToken' || k === 'allureUrl' || k === 'jenkinsUrl' ? '' : DEFAULTS[k]);
  }
  return next;
}

function renderChecks(list) {
  return `<ul class="checks">${list.map((c) => `<li><span class="dot ${c.ok ? 'ok' : 'bad'}"></span><b>${esc(c.name)}</b><small>${esc(c.detail)}${c.ok ? ` · ${c.ms} мс` : ''}</small></li>`).join('')}</ul>`;
}

let settingsReturn = null;
function openSettings() {
  settingsReturn = document.activeElement;
  renderSettings();
  $('#settings').hidden = false;
  $('#settings-form').elements[0]?.focus();
}
function closeSettings() {
  $('#settings').hidden = true;
  settingsReturn?.focus?.();
}
$('#open-settings').addEventListener('click', openSettings);
$('#settings-close').addEventListener('click', closeSettings);
$('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') closeSettings(); });
$('#settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  ctx.s = readForm();
  const ok = saveSettings(ctx.s);
  document.documentElement.classList.toggle('reduce-motion', !!ctx.s.reduceMotion);
  dropCache();
  closeSettings();
  toast(ok ? 'Настройки сохранены' : 'Браузер не разрешил сохранить настройки — они действуют до перезагрузки');
  renderDisplay(); renderHistory(); refreshAll();
  if (!route.hidden) renderRoute(trail.at(-1));
});
$('#settings-check').addEventListener('click', async () => {
  const out = $('#settings-checks');
  out.outerHTML = '<ul class="checks" id="settings-checks"><li><span class="dot busy"></span><b>Проверяю подключения…</b></li></ul>';
  dropCache();
  const list = await checkAll(readForm());
  $('#settings-checks').outerHTML = renderChecks(list).replace('<ul class="checks">', '<ul class="checks" id="settings-checks">');
});
$('#settings-body').addEventListener('click', (e) => {
  const r = e.target.closest('[data-reveal]');
  if (r) { const i = $(`#${r.dataset.reveal}`); i.type = i.type === 'password' ? 'text' : 'password'; r.textContent = i.type === 'password' ? 'Показать' : 'Скрыть'; }
  if (e.target.id === 'settings-reset') { resetSettings(); ctx.s = loadSettings(); renderSettings(); toast('Стандартные настройки восстановлены'); }
  if (e.target.id === 'settings-export') {
    const { githubToken, ...safe } = readForm();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' }));
    a.download = 'qa-hub-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
});
$('#settings-body').addEventListener('change', async (e) => {
  if (e.target.id !== 'settings-import') return;
  try {
    const data = JSON.parse(await e.target.files[0].text());
    ctx.s = { ...ctx.s, ...data, githubToken: ctx.s.githubToken };
    renderSettings();
    toast('Настройки загружены — нажмите «Сохранить»');
  } catch { toast('Файл не похож на настройки приложения'); }
});

// ================================================================== клавиатура
document.addEventListener('keydown', (e) => {
  if (!$('#install-help').hidden) { if (e.key === 'Escape') $('#install-help').hidden = true; return; }
  if (!$('#settings').hidden) { if (e.key === 'Escape') closeSettings(); return; }
  if (!route.hidden) {
    if (e.key === 'Escape') { e.preventDefault(); closeRoute(); return; }
    if (e.target.closest('input')) return;
    if (/^[1-9]$/.test(e.key)) {
      const c = route.querySelector(`.choice[data-n="${e.key}"]`);
      if (c) { e.preventDefault(); c.click(); }
      return;
    }
    if (e.key === 'Backspace' && trail.length > 1) { e.preventDefault(); trail.pop(); renderRoute(trail.at(-1)); }
    return;
  }
  if (e.target.closest('input, textarea, select')) return;
  const cmd = e.metaKey || e.ctrlKey;
  if (cmd && e.key.toLowerCase() === 'c' && !getSelection().toString()) { e.preventDefault(); copyResult(); return; }
  if (cmd) return;
  if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') { e.preventDefault(); openSettings(); return; }
  if (e.key === 'h' || e.key === 'р') { $('#toggle-history').click(); return; }
  const keyMap = { Backspace: '⌫', Delete: 'C', Escape: 'C', Enter: '=' };
  const k = keyMap[e.key] || mapChar(e.key);
  if (k) {
    if (e.key === 'Enter' && e.target.closest('button') && !e.target.closest('.key')) return;
    e.preventDefault();
    press(k);
  }
});

// ================================================================== старт
async function refreshAll() {
  await Promise.all([refreshPulse(), refreshMap()]);
}
renderDisplay();
renderHistory();
refreshAll();
let timer = setInterval(() => { if (!document.hidden && route.hidden) { dropCache(); refreshAll(); } }, Math.max(15, ctx.s.refreshSec) * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAll(); });

// ================================================================== отдельное приложение (PWA)
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installPrompt = null;
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайна */ });
}
if (!standalone) $('#install').hidden = false;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { $('#install').hidden = true; toast('Приложение установлено — оно в Dock и Launchpad'); });
$('#install').addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    if (outcome === 'accepted') $('#install').hidden = true;
    return;
  }
  $('#install-help').hidden = false;
  $('#install-close').focus();
});
$('#install-close').addEventListener('click', () => { $('#install-help').hidden = true; });
$('#install-help').addEventListener('click', (e) => { if (e.target.id === 'install-help') $('#install-help').hidden = true; });

// ссылка вида #route=sonar открывает станцию сразу
const hash = new URLSearchParams(location.hash.slice(1)).get('route');
if (hash && STATIONS[hash]) openRoute(hash);
