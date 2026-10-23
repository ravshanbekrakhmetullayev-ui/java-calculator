# CI: GitHub Actions, SonarCloud и Jenkins

## Как устроен конвейер

| Этап | Что делает | Где смотреть результат |
|---|---|---|
| Сборка и автотесты | `mvn clean verify`: 114 тестов JUnit 5 | Вкладка **Actions** |
| Веб-автотесты | `node web/tests/run-node.mjs`: 104 теста JS-движка, в том же отчёте Allure | Allure → эпик «Веб-калькулятор» |
| Сверка сценариев | Сценарии веб-тестов должны совпадать с Java-тестами (`tools/extract_cases.py`) | Шаг падает, если `web/tests/cases.json` устарел |
| Покрытие кода | JaCoCo считает, какие строки выполнены тестами | SonarCloud и артефакт `reports` |
| Анализ кода | SonarCloud ищет баги, уязвимости, дублирование и code smells | https://sonarcloud.io/project/overview?id=ravshanbekrakhmetullayev-ui_java-calculator |
| Quality Gate | Проверка проходит, только если код соответствует правилам качества | Значок в README, статус в SonarCloud |
| Веб-приложение | Калькулятор и пульт интеграций, данные в `data/*.json` | https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/ |
| Отчёт Allure | Шаги, вложения, история прогонов, ссылки на тест-кейсы | https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/allure/ |

Конвейер запускается сам при каждом push в `main` и на каждый pull request. Вручную: **Actions → «Автотесты + Allure + SonarCloud» → Run workflow**.

## Подключение SonarCloud (один раз)

1. Зайдите на https://sonarcloud.io и нажмите **Log in → GitHub**.
2. **+ → Analyze new project → Import an organization from GitHub**. Выберите свой аккаунт и дайте доступ к репозиторию `java-calculator`.
3. Ключ организации: `ravshanbekrakhmetullayev-ui`. План: **Free**.
4. Отметьте проект `java-calculator` и нажмите **Set Up**. Определение нового кода: **Previous version**.
5. **Analysis Method → With GitHub Actions**. SonarCloud покажет токен (`SONAR_TOKEN`).
6. В GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Имя `SONAR_TOKEN`, значение — токен из шага 5.
7. Запустите конвейер: **Actions → Run workflow**.

Если ключ организации или проекта получился другим, поправьте `sonar.organization` и `sonar.projectKey` в `pom.xml`.

Ошибка «You are running CI analysis while Automatic Analysis is enabled»: в SonarCloud откройте **Administration → Analysis Method** и выключите **Automatic Analysis**.

## Данные Jira в веб-приложении (по желанию)

Браузер не может читать Jira напрямую — Atlassian это запрещает. Поэтому список задач для приложения получает конвейер:

1. Создайте API-токен: https://id.atlassian.com/manage-profile/security/api-tokens → **Create API token**.
2. В GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `JIRA_EMAIL` — почта, с которой вы входите в Jira;
   - `JIRA_API_TOKEN` — токен из шага 1.
3. Запустите конвейер. Задачи появятся на станции Jira в приложении.

## Jenkins

В корне репозитория лежит `Jenkinsfile` с теми же этапами: сборка → автотесты и покрытие → Sonar → Quality Gate → Allure.

Что нужно настроить в Jenkins (**Manage Jenkins**):

| Раздел | Настройка |
|---|---|
| Plugins | Pipeline, Git, JUnit, JaCoCo, SonarQube Scanner, Allure Jenkins Plugin |
| Tools | JDK с именем `jdk21`, Maven с именем `maven3`, Allure Commandline с именем `allure` |
| Credentials | Secret text с токеном SonarCloud или SonarQube |
| System → SonarQube servers | Имя `SonarCloud`, URL `https://sonarcloud.io` (или адрес вашего SonarQube), токен из Credentials |

Создание задачи: **New Item → Pipeline → Pipeline script from SCM → Git**. Репозиторий `https://github.com/ravshanbekrakhmetullayev-ui/java-calculator.git`, ветка `main`, Script Path `Jenkinsfile`.

Для корпоративного SonarQube вместо SonarCloud укажите его URL в настройках Jenkins и удалите строку `sonar.organization` из `pom.xml`.

## Локальная проверка

```bash
mvn clean verify          # тесты + покрытие, HTML-отчёт: target/site/jacoco/index.html
mvn allure:serve          # отчёт Allure в браузере
mvn org.sonarsource.scanner.maven:sonar-maven-plugin:sonar -Dsonar.token=ВАШ_ТОКЕН   # анализ в SonarCloud
```
