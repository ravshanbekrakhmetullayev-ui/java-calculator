// Автотесты веб-калькулятора. Один и тот же набор запускается:
//  • в браузере — кнопкой «Запустить автотесты → В браузере»;
//  • в CI — node web/tests/run-node.mjs (результаты попадают в общий отчёт Allure).
// Сценарии «нажатия → экран» берутся из Java-тестов (web/tests/cases.json генерирует tools/extract_cases.py),
// поэтому веб и десктоп проверяются одними и теми же данными.

import { Engine, Dec, format, pretty, mapChar } from './engine.js';

class AssertionError extends Error {}
const eq = (actual, expected, msg) => {
  if (actual !== expected) throw new AssertionError(`${msg}: ожидалось «${expected}», получено «${actual}»`);
};

/** Ручные тесты для того, что не описывается строкой нажатий (память, кэш, история, формат). */
function extraTests() {
  const T = (feature, story, tms, severity, title, fn) => ({ feature, story, tms, severity, title, fn, cls: 'WebExtra' });
  return [
    T('Память, кэш и история', 'Память', 'TC-23', 'critical', 'M+ накапливает сумму, MR вставляет её', (s) => {
      const e = new Engine();
      s('Нажать: 5 M+ C 3 M+ C MR', () => e.press('5 M+ C 3 M+ C MR'));
      s('На экране: 8', () => eq(e.display(), '8', 'Экран'));
    }),
    T('Память, кэш и история', 'Память', 'TC-24', 'normal', 'M− вычитает из памяти', (s) => {
      const e = new Engine();
      s('Нажать: 1 0 M+ C 4 M− C MR', () => e.press('1 0 M+ C 4 M− C MR'));
      s('На экране: 6', () => eq(e.display(), '6', 'Экран'));
    }),
    T('Память, кэш и история', 'Память', 'TC-24', 'normal', 'MC очищает память', (s) => {
      const e = new Engine();
      s('Нажать: 5 M+ MC', () => e.press('5 M+ MC'));
      s('Память пуста', () => eq(e.memory, null, 'Память'));
    }),
    T('Память, кэш и история', 'Память', 'TC-23', 'normal', 'MR после числа подставляется через умножение', (s) => {
      const e = new Engine();
      s('Нажать: 3 M+ C 2 MR =', () => e.press('3 M+ C 2 MR ='));
      s('На экране: 6', () => eq(e.display(), '6', 'Экран'));
    }),
    T('Память, кэш и история', 'Предпросмотр', 'TC-25', 'critical', 'Результат виден во время ввода, до «=»', (s) => {
      const e = new Engine();
      s('Нажать: 2 + 3 ×', () => e.press('2 + 3 ×'));
      s('Подсказка «= 5»', () => eq(e.preview(), '5', 'Подсказка'));
      s('Нажать: 4', () => e.press('4'));
      s('Подсказка «= 14»', () => eq(e.preview(), '14', 'Подсказка'));
      s('Нажать: =', () => e.press('='));
      s('После «=» подсказка скрыта', () => eq(e.preview(), null, 'Подсказка'));
    }),
    T('Память, кэш и история', 'Кэш', 'TC-27', 'normal', 'Повторное выражение берётся из кэша', (s) => {
      const e = new Engine();
      s('Нажать: 1 2 3 × 4 5 6 =', () => e.press('1 2 3 × 4 5 6 ='));
      const before = e.cache.hits;
      s('Нажать: C 1 2 3 × 4 5 6 =', () => e.press('C 1 2 3 × 4 5 6 ='));
      s('На экране: 56088', () => eq(e.display(), '56088', 'Экран'));
      s('Кэш сработал', () => { if (!(e.cache.hits > before)) throw new AssertionError('попаданий в кэш нет'); });
    }),
    T('Память, кэш и история', 'Кэш', 'TC-27', 'minor', 'Кэш хранит не больше 256 выражений', (s) => {
      const e = new Engine();
      s('Посчитать 300 разных выражений', () => { for (let i = 1; i <= 300; i++) e.compute(i + '+1'); });
      s('Размер кэша 256', () => eq(e.cache.size, 256, 'Размер кэша'));
    }),
    T('Память, кэш и история', 'История', 'TC-28', 'normal', 'Каждое «=» добавляет запись в историю, новые сверху', (s) => {
      const e = new Engine();
      s('Нажать: 2 + 2 = C 3 × 3 =', () => e.press('2 + 2 = C 3 × 3 ='));
      s('В истории 2 записи', () => eq(e.history.length, 2, 'Записей'));
      s('Сверху 3×3 = 9', () => { eq(e.history[0][0], '3×3', 'Выражение'); eq(e.history[0][1], '9', 'Результат'); });
    }),
    T('Память, кэш и история', 'История', 'TC-28', 'normal', 'Ошибка и простое число в историю не попадают', (s) => {
      const e = new Engine();
      s('Нажать: 5 = C 1 ÷ 0 =', () => e.press('5 = C 1 ÷ 0 ='));
      s('История пуста', () => eq(e.history.length, 0, 'Записей'));
    }),
    T('Память, кэш и история', 'История', 'TC-28', 'minor', 'История ограничена 200 записями', (s) => {
      const e = new Engine();
      s('Сделать 210 вычислений', () => { for (let i = 0; i < 210; i++) e.press(`C ${String(i).split('').join(' ')} + 1 =`); });
      s('Записей 200', () => eq(e.history.length, 200, 'Записей'));
    }),
    ...[['123', '123'], ['1234', '1_234'], ['1234567', '1_234_567'], ['1234567.8901', '1_234_567.8901'], ['12+3456', '12+3_456'], ['1e15', '1e15']]
      .map(([inp, exp]) => T('Форматирование и буфер обмена', 'Разделение разрядов', 'TC-33', 'minor', `Разряды: ${inp} → ${exp}`, (s) => {
        s(`Отформатировать «${inp}»`, () => eq(pretty(inp, '_'), exp, 'Формат'));
      })),
    ...[['2.50', '2.5'], ['-7', '−7'], ['0.000', '0'], ['1234567890123456', '1.23456789012e15'], ['0.0000000001', '1e−10']]
      .map(([inp, exp]) => T('Форматирование и буфер обмена', 'Вывод результата', 'TC-19', 'normal', `Число ${inp} → ${exp}`, (s) => {
        s(`Отформатировать ${inp}`, () => eq(format(Dec.of(inp)), exp, 'Формат'));
      })),
    ...[['(12+8)*3', '60'], ['10/4', '2.5'], ['2x3', '6'], ['1,5+1,5', '3'], ['7-10', '−3']]
      .map(([text, exp]) => T('Форматирование и буфер обмена', 'Вставка из буфера', 'TC-32', 'normal', `Вставить «${text}» → ${exp}`, (s) => {
        const e = new Engine();
        s(`Вставить «${text}» и нажать «=»`, () => {
          for (const ch of text) { const k = mapChar(ch); if (k && k !== '=') e.input(k); }
          e.input('=');
        });
        s(`На экране: ${exp}`, () => eq(e.display(), exp, 'Экран'));
      })),
  ];
}

function caseTest(c) {
  return {
    ...c,
    title: c.keys ? `${c.title}: ${c.keys} → ${c.expected}` : c.title,
    fn: (s) => {
      const e = new Engine();
      s('Открыть калькулятор', () => {});
      s(`Нажать: ${c.keys}`, () => e.press(c.keys));
      s(`На экране: ${c.expected}`, () => eq(e.display(), c.expected, 'Неверное значение на экране'));
    },
  };
}

/** Собрать список тестов. cases — содержимое web/tests/cases.json. */
export function buildSuite(cases) {
  return [...cases.map(caseTest), ...extraTests()];
}

/** Запустить тесты. onResult вызывается после каждого теста (для живого прогресса в UI). */
export async function runSuite(tests, { onResult = () => {}, yieldEvery = 10 } = {}) {
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const steps = [];
    const start = Date.now();
    let status = 'passed', message = null;
    const step = (name, fn) => {
      const st = { name, status: 'passed', start: Date.now() };
      steps.push(st);
      try { fn(); } catch (ex) { st.status = ex instanceof AssertionError ? 'failed' : 'broken'; throw ex; } finally { st.stop = Date.now(); }
    };
    try { t.fn(step); }
    catch (ex) { status = ex instanceof AssertionError ? 'failed' : 'broken'; message = ex.message; }
    const r = { ...t, fn: undefined, status, message, steps, start, stop: Date.now(), index: i };
    results.push(r);
    onResult(r, i, tests.length);
    if (yieldEvery && i % yieldEvery === yieldEvery - 1) await new Promise((res) => setTimeout(res, 0));
  }
  return results;
}

export function summarize(results) {
  const s = { total: results.length, passed: 0, failed: 0, broken: 0, duration: 0 };
  for (const r of results) { s[r.status]++; s.duration += r.stop - r.start; }
  return s;
}
