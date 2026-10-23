# Jira: задачи, ветки, коммиты и тесты

Проект Jira: **CALC** — https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2
Эта же инструкция в Jira: https://ravshanbekrakhmetullayevqa.atlassian.net/browse/CALC-20

## Что связано с чем

| Где | Что видно | Как работает |
|---|---|---|
| Карточка задачи Jira → **Development** | Ветки, коммиты, pull request'ы, сборки GitHub Actions | Приложение **GitHub for Jira** находит ключ `CALC-N` в имени ветки, коммите или PR |
| Pull request на GitHub | Ссылка на задачу | Проверка **«Проверка ключа Jira»** не даёт слить PR без ключа |
| Отчёт Allure → карточка теста | Ссылка на задачу или баг | Аннотация `@Issue("CALC-N")` |
| Доска Jira | Задача сама переходит по статусам | Правила Jira Automation (раздел 3) |

---

## 1. Настройка (один раз)

### 1.1. Проект Jira (уже создан)

Проект **Java Calculator**, ключ **`CALC`**, доска Scrum. Ключ важен: он прописан в проверке PR.

| Эпик | Что внутри |
|---|---|
| CALC-1 Приложение калькулятор | Движок, кэш, история, сборка .app |
| CALC-6 Автотесты и Allure | 114 автотестов, отчёт, тест-кейсы, импорт в TMS |
| CALC-11 CI/CD и качество кода | GitHub Actions, JaCoCo, Jenkins, SonarCloud |
| CALC-16 Интеграция с Jira | Проверка ключа, GitHub for Jira, Automation |

Статусы: **К выполнению → В работе → Готово**. Если нужен отдельный статус ревью, добавьте колонку «На проверке» в **Настройки проекта → Доска → Колонки**.

### 1.2. Приложение GitHub for Jira

1. В Jira: **⚙ → Apps → Explore more apps** → найдите **GitHub for Jira** (разработчик Atlassian) → **Get app**.
2. **Get started → GitHub Cloud → Continue** → войдите в GitHub.
3. **Connect GitHub organization** → выберите аккаунт `ravshanbekrakhmetullayev-ui`.
4. GitHub спросит, к каким репозиториям дать доступ: **Only select repositories → java-calculator → Install**.
5. Вернитесь в Jira → статус синхронизации должен стать **Finished**. Старые коммиты подтянутся (backfill) за несколько минут.

Проверка: откройте любую задачу с ключом, упомянутым в коммите, справа появится блок **Development**.

### 1.3. Smart Commits

**⚙ → Products → DVCS accounts** (или настройки GitHub for Jira) → включите **Smart Commits**.
Условие: email в `git config user.email` должен совпадать с email вашего аккаунта Jira.

### 1.4. Сборки и деплой в Jira

Ничего настраивать не нужно: GitHub for Jira сам отправляет в задачу статусы GitHub Actions (**Builds**) и публикацию отчёта Allure на GitHub Pages (**Deployments**), если ключ задачи есть в коммите.

---

## 2. Ежедневная работа (порядок действий)

### Шаг 1. Взять задачу

На доске Jira перетащите задачу в **В работе** и назначьте на себя. Ключ задачи, например `CALC-12`, понадобится дальше.

### Шаг 2. Создать ветку с ключом

Из карточки задачи: **Development → Create branch** (Jira сама подставит ключ). Или в терминале:

```bash
git checkout main && git pull
git checkout -b feature/CALC-12-cube-function     # новая функция
git checkout -b bugfix/CALC-99-division-precision # исправление бага
git checkout -b test/CALC-20-memory-tests         # автотесты
```

Формат: `тип/CALC-N-кратко-латиницей`.

### Шаг 3. Коммиты с ключом

```bash
git commit -m "CALC-12 Добавить функцию x³ в Engine"
```

Smart Commits — команды прямо в сообщении коммита:

| Команда | Что делает | Пример |
|---|---|---|
| `#comment` | Добавляет комментарий в задачу | `CALC-12 #comment Готово, нужен ревью` |
| `#time` | Списывает время | `CALC-12 #time 1h 30m Написал тесты` |
| `#<переход>` | Переводит задачу | `CALC-12 #в-работе` или `CALC-12 #готово` |

Команды можно сочетать: `CALC-12 #time 2h #comment Тесты готовы`.
Имя перехода пишется как на доске, пробелы заменяются дефисом. Надёжнее переводить задачи правилами Automation (раздел 3).

### Шаг 4. Pull request

```bash
git push -u origin feature/CALC-12-cube-function
```

На GitHub: **Compare & pull request**. Название начинайте с ключа: `CALC-12 Функция x³`. Шаблон PR откроется сам, заполните чек-лист.

Что запустится автоматически:

| Проверка | Что должно быть |
|---|---|
| Проверка ключа Jira | ✅ ключ `CALC-N` найден |
| Автотесты + Allure + SonarCloud | ✅ 114+ тестов, Quality Gate зелёный |

Без ключа PR будет красным с подсказкой, что исправить. Исправьте название PR, и проверка перезапустится сама.

### Шаг 5. Слияние

После ревью нажмите **Squash and merge** (сообщение коммита должно начинаться с ключа). Задача переходит в **Готово** правилом Automation.

---

## 3. Автоматические переходы (Jira Automation)

**Настройки проекта (Project settings) → Автоматизация → Создать правило**. Три правила:

| Когда (Trigger) | Условие | Действие |
|---|---|---|
| **Branch created** | — | Transition issue → **В работе** |
| **Commit created** | Статус = К выполнению | Transition issue → **В работе** |
| **Pull request merged** | — | Transition issue → **Готово** |

Для каждого правила: **Trigger** → раздел **Development** → выберите событие → **Then: Transition issue** → статус → **Turn on rule**.

---

## 4. Баги из автотестов

Когда тест упал в отчёте Allure:

1. Откройте упавший тест в https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/allure/ → скопируйте шаги, параметры и сообщение об ошибке.
2. В Jira: **Create → Bug**. Шаблон бага:

```
Summary:      [Арифметика] 0.1 + 0.2 показывает 0.30000000000000004
Environment:  main @ <commit>, Java 21, GitHub Actions run #<номер>
Steps:        1. Нажать: 0 . 1 + 0 . 2 =
Expected:     0.3
Actual:       0.30000000000000004
Severity:     Critical (из @Severity теста)
Attachments:  ссылка на тест в Allure, скриншот
Test case:    TC-03
```

3. Свяжите тест с багом аннотацией, чтобы в Allure появилась ссылка на задачу:

```java
@Test
@Issue("CALC-99")
@TmsLink("TC-03")
void decimalPrecision() { ... }
```

4. Исправление делайте в ветке `bugfix/CALC-99-...`. Когда тест позеленеет, баг закроется при слиянии PR.

---

## 5. Jenkins (если используется)

Установите плагин **Atlassian Jira Software Cloud** → **Manage Jenkins → System → Jira Software Cloud integration** → добавьте сайт `ravshanbekrakhmetullayevqa.atlassian.net` с ключами из **Jira → ⚙ → Apps → OAuth credentials**. Сборки Jenkins с ключом задачи в коммите появятся в блоке **Development → Builds**.

---

## 6. Частые проблемы

| Проблема | Решение |
|---|---|
| В задаче нет блока Development | Проверьте, что ключ в коммите написан заглавными (`CALC-12`, не `calc-12`) и приложение GitHub for Jira подключено к репозиторию |
| Smart Commit не сработал | Email коммита не совпадает с email в Jira, или Smart Commits выключены |
| `#готово` не переводит задачу | Имя перехода отличается. Посмотрите точное название статуса на доске |
| Проверка ключа Jira красная | Добавьте `CALC-N` в название PR или имя ветки |
| Ссылка `@Issue` в Allure ведёт не туда | Поправьте `allure.link.issue.pattern` в `src/test/resources/allure.properties` |
