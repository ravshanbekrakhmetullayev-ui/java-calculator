// Запуск автотестов веб-калькулятора в Node (CI) с записью результатов в формате Allure.
// node web/tests/run-node.mjs [папка-результатов]   (по умолчанию target/allure-results)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSuite, runSuite, summarize } from '../js/suite.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || join(here, '../../target/allure-results');
mkdirSync(outDir, { recursive: true });

const cases = JSON.parse(readFileSync(join(here, 'cases.json'), 'utf8'));
const results = await runSuite(buildSuite(cases), { yieldEvery: 0 });

for (const r of results) {
  const fullName = `web.${r.cls}.${r.title}`;
  const labels = [
    ['epic', 'Веб-калькулятор'], ['feature', r.feature], ['story', r.story], ['severity', r.severity],
    ['suite', 'Веб-калькулятор (JS)'], ['subSuite', r.feature], ['framework', 'node'], ['language', 'javascript'],
    ['owner', 'Ravshanbek Rakhmetullayev'], ['tag', 'web'],
  ].filter(([, v]) => v).map(([name, value]) => ({ name, value }));
  const links = r.tms ? [{ type: 'tms', name: r.tms, url: `https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/blob/main/docs/test-cases.md#${r.tms.toLowerCase()}` }] : [];
  const res = {
    uuid: randomUUID(),
    historyId: createHash('md5').update(fullName).digest('hex'),
    fullName, name: r.title, status: r.status, stage: 'finished',
    statusDetails: r.message ? { message: r.message } : {},
    start: r.start, stop: r.stop, labels, links,
    parameters: r.keys ? [{ name: 'Нажатия', value: r.keys }, { name: 'Ожидается', value: r.expected }] : [],
    steps: r.steps.map((s) => ({ name: s.name, status: s.status, stage: 'finished', start: s.start, stop: s.stop, steps: [] })),
  };
  writeFileSync(join(outDir, `${res.uuid}-result.json`), JSON.stringify(res));
}

const s = summarize(results);
console.log(`Веб-автотесты: ${s.passed}/${s.total} прошли, упало ${s.failed}, сломано ${s.broken}`);
for (const r of results.filter((x) => x.status !== 'passed')) console.log(`  ✗ ${r.title}\n    ${r.message}`);
process.exitCode = s.failed + s.broken > 0 ? 1 : 0;
