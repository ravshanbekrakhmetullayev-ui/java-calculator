"""Достаёт сценарии «нажатия → ожидаемый экран» из Java-тестов для веб-автотестов.
Источник правды один: src/test/java/*Test.java. Запуск: python3 tools/extract_cases.py"""
import re, json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
cases = []
for f in sorted((root / 'src/test/java').glob('*Test.java')):
    src = f.read_text(encoding='utf-8')
    feature = (re.search(r'@Feature\("([^"]+)"\)\s*@Owner', src) or re.search(r'@Feature\("([^"]+)"\)', src)).group(1)
    # разбиваем на методы: всё между концами методов = аннотации + сигнатура + тело
    for seg in re.split(r'\n    \}\n', src):
        m = re.search(r'void (\w+)\(([^)]*)\)\s*\{(.*)$', seg, re.S)
        if not m:
            continue
        name, params, body = m.groups()
        ann = seg[:m.start()]
        get = lambda a: (re.search(r'@' + a + r'\((?:SeverityLevel\.)?"?([^")]+)"?\)', ann) or [None, None])[1]
        meta = dict(cls=f.stem, method=name, feature=get('Feature') or feature, story=get('Story'),
                    severity=(get('Severity') or 'NORMAL').lower(), tms=get('TmsLink'), title=get('DisplayName') or name)
        rows = []
        csv = re.search(r"@CsvSource\(delimiter = '\|', value = \{(.*?)\}\)", ann, re.S)
        if csv and re.fullmatch(r'\s*CalcSteps\.calculate\(keys, expected\);\s*', body):
            for k, e in re.findall(r'"([^"|]+)\|\s*([^"]*)"', csv.group(1)):
                rows.append((k.strip(), e.strip()))
        else:
            calls = re.findall(r'CalcSteps\.calculate\("([^"]+)",\s*"([^"]*)"\)', body)
            if calls and len(re.findall(r';', body)) == len(calls):
                rows += calls
        for k, e in rows:
            cases.append(dict(meta, keys=k, expected=e))

out = root / 'web/tests/cases.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(cases, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{len(cases)} сценариев → {out.relative_to(root)}', file=sys.stderr)
