"""Готовит данные для веб-приложения: site/data/*.json.

Запускается в конвейере перед публикацией на GitHub Pages:
    python3 tools/build_site_data.py <папка-сайта>

  build.json       — какой коммит и какой запуск собрал сайт
  test-cases.json  — тест-кейсы из docs/test-cases.csv
  jenkins.json     — этапы из Jenkinsfile
  jira.json        — задачи проекта, если заданы секреты JIRA_EMAIL и JIRA_API_TOKEN
                     (браузер не может читать Jira напрямую, поэтому снимок делает конвейер)
"""
import base64, csv, json, os, pathlib, re, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / 'web') / 'data'
out.mkdir(parents=True, exist_ok=True)
now = datetime.now(timezone.utc).isoformat(timespec='seconds')


def write(name, data):
    (out / name).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'  data/{name}', file=sys.stderr)


# --- сборка
write('build.json', {
    'sha': os.environ.get('GITHUB_SHA', 'local000'),
    'ref': os.environ.get('GITHUB_REF_NAME', 'local'),
    'run': os.environ.get('GITHUB_RUN_NUMBER'),
    'runUrl': (f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{os.environ['GITHUB_RUN_ID']}"
               if os.environ.get('GITHUB_RUN_ID') else None),
    'time': now,
})

# --- тест-кейсы
with open(root / 'docs/test-cases.csv', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))
write('test-cases.json', {'cases': [{
    'id': r['id'], 'suite': r['suite'], 'title': r['title'], 'priority': r['priority'],
    'severity': r['severity'], 'automated': r['automation'] == 'automated',
} for r in rows]})

# --- Jenkins
jf = (root / 'Jenkinsfile').read_text(encoding='utf-8')
write('jenkins.json', {'stages': re.findall(r"stage\('([^']+)'\)", jf)})

# --- Jira
email, token = os.environ.get('JIRA_EMAIL'), os.environ.get('JIRA_API_TOKEN')
site = os.environ.get('JIRA_SITE', 'https://ravshanbekrakhmetullayevqa.atlassian.net')
project = os.environ.get('JIRA_PROJECT', 'CALC')
jira = {'configured': False, 'updatedAt': now, 'issues': []}
if email and token:
    try:
        q = urllib.parse.urlencode({
            'jql': f'project = {project} ORDER BY updated DESC',
            'fields': 'summary,status,issuetype,assignee,updated,parent', 'maxResults': 100,
        })
        req = urllib.request.Request(f'{site}/rest/api/3/search/jql?{q}', headers={
            'Accept': 'application/json',
            'Authorization': 'Basic ' + base64.b64encode(f'{email}:{token}'.encode()).decode(),
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        jira = {'configured': True, 'updatedAt': now, 'issues': [{
            'key': i['key'],
            'summary': i['fields']['summary'],
            'status': i['fields']['status']['name'],
            'category': i['fields']['status']['statusCategory']['key'],
            'type': i['fields']['issuetype']['name'],
            'parent': (i['fields'].get('parent') or {}).get('key'),
            'updated': i['fields']['updated'],
        } for i in data.get('issues', [])]}
    except Exception as e:  # сайт не должен падать из-за Jira
        jira['error'] = str(e)[:200]
        print(f'  Jira недоступна: {e}', file=sys.stderr)
write('jira.json', jira)

# --- покрытие JaCoCo (если тесты уже прошли)
jc = root / 'target/site/jacoco/jacoco.csv'
if jc.exists():
    tot = {'LINE': [0, 0], 'BRANCH': [0, 0], 'INSTRUCTION': [0, 0], 'METHOD': [0, 0]}
    with open(jc, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            for k in tot:
                tot[k][0] += int(r[f'{k}_COVERED']); tot[k][1] += int(r[f'{k}_MISSED'])
    write('coverage.json', {k.lower(): {'covered': c, 'missed': m, 'pct': round(c / (c + m) * 100, 1) if c + m else None}
                            for k, (c, m) in tot.items()} | {'updatedAt': now})
