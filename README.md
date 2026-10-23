# 🧮 Java Calculator

Оконный калькулятор на Java Swing с автотестами на JUnit 5, отчётами Allure, анализом кода в SonarCloud и задачами в Jira.

[![CI](https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions/workflows/tests-allure.yml/badge.svg)](https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions/workflows/tests-allure.yml)
[![PR: ключ Jira](https://img.shields.io/badge/PR-ключ_CALC--N_обязателен-0052CC?logo=jira&logoColor=white)](docs/jira.md)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Security](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Reliability](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=bugs)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Allure Report](https://img.shields.io/badge/Allure-отчёт-FF6B6B?logo=qameta&logoColor=white)](https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/)
[![Jira](https://img.shields.io/badge/Jira-CALC-0052CC?logo=jira&logoColor=white)](https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2)

![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?logo=openjdk&logoColor=white)
![JUnit 5](https://img.shields.io/badge/JUnit-5-25A162?logo=junit5&logoColor=white)
![Tests](https://img.shields.io/badge/автотесты-114-25A162)
![Test cases](https://img.shields.io/badge/тест--кейсы-34-0052CC)

## 🔌 Интеграции

| Сервис | Что делает | Где смотреть | Настройка |
|---|---|---|---|
| ⚙️ **GitHub Actions** | Сборка, 114 автотестов, покрытие, публикация отчётов на каждый push и PR | [Actions](https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions) | [`tests-allure.yml`](.github/workflows/tests-allure.yml) |
| 📊 **Allure Report** | Отчёт по тестам: шаги, вложения, история, ссылки на тест-кейсы и задачи Jira | [Отчёт на GitHub Pages](https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/) | [`allure.properties`](src/test/resources/allure.properties) |
| 🔍 **SonarCloud** | Статический анализ: баги, уязвимости, code smells, дублирование, Quality Gate | [Проект в SonarCloud](https://sonarcloud.io/summary/new_code?id=ravshanbekrakhmetullayev-ui_java-calculator) | [`pom.xml`](pom.xml), [docs/ci.md](docs/ci.md) |
| 🧪 **JaCoCo** | Покрытие кода тестами (HTML и XML для Sonar) | Артефакт `reports` в каждом запуске Actions | [`pom.xml`](pom.xml) |
| 📋 **Jira** | Задачи, спринты, связь ветки → коммиты → PR → сборки | [Доска CALC](https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2) · [Инструкция CALC-20](https://ravshanbekrakhmetullayevqa.atlassian.net/browse/CALC-20) | [docs/jira.md](docs/jira.md), [`jira-key-check.yml`](.github/workflows/jira-key-check.yml) |
| 🏗️ **Jenkins** | Тот же конвейер для своего сервера: сборка → тесты → Sonar → Quality Gate → Allure | — | [`Jenkinsfile`](Jenkinsfile), [docs/ci.md](docs/ci.md#jenkins) |
| 🗂️ **Тест-кейсы (TMS)** | 34 тест-кейса, 30 автоматизированы, CSV для импорта в Qase / TestIT / TestRail | [docs/test-cases.md](docs/test-cases.md) | [`test-cases.csv`](docs/test-cases.csv) |

### Как всё связано

```mermaid
flowchart LR
    J[📋 Jira<br/>задача CALC-N] -->|ветка, коммит, PR с ключом| G[GitHub]
    G -->|push / PR| A[⚙️ GitHub Actions]
    A -->|mvn verify| T[🧪 JUnit 5 + JaCoCo]
    T -->|результаты| R[📊 Allure → GitHub Pages]
    T -->|покрытие| S[🔍 SonarCloud<br/>Quality Gate]
    A -->|статус сборки| J
    R -->|@Issue / @TmsLink| J
    G -.->|тот же Jenkinsfile| K[🏗️ Jenkins]
```

### Порядок работы

1. Взять задачу на [доске Jira](https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2), например `CALC-30`.
2. Ветка `feature/CALC-30-описание`, коммиты `CALC-30 ...`, PR `CALC-30 ...` (шаблон PR подставится сам).
3. Дождаться зелёных проверок: **Проверка ключа Jira**, **автотесты**, **SonarCloud Quality Gate**.
4. Слить PR. Задача в Jira переходит в «Готово», отчёт Allure обновляется.

Подробно: [docs/jira.md](docs/jira.md) · [docs/ci.md](docs/ci.md)

## Возможности калькулятора

- Порядок операций, скобки, `√`, `x²`, `1/x`, `%`, `±`
- Точная арифметика на `BigDecimal`: `0.1 + 0.2 = 0.3`
- Результат виден во время ввода
- История вычислений между запусками, LRU-кэш, память `MC MR M+ M−`
- Копирование и вставка через буфер обмена, полное управление с клавиатуры

## Структура проекта

```
java-calculator/
├── pom.xml                          Maven: JUnit 5, Allure, JaCoCo, Sonar
├── Jenkinsfile                      конвейер для Jenkins
├── .github/workflows/               GitHub Actions: тесты + Allure + Sonar, проверка ключа Jira
├── .github/pull_request_template.md шаблон PR
├── run-tests.sh                     автотесты + отчёт Allure одной командой
├── build-app.sh                     сборка Calculator.app для macOS
├── src/main/java/Calculator.java    приложение
├── src/test/java/                   автотесты
│   ├── CalcSteps.java               шаги для Allure (нажать, проверить экран)
│   ├── ArithmeticTest.java          арифметика, приоритеты, точность
│   ├── FunctionsTest.java           √, x², %, 1/x, ±, скобки
│   ├── ErrorHandlingTest.java       деление на ноль, ошибки разбора, восстановление
│   ├── InputRulesTest.java          правила ввода, лимиты, ⌫, продолжение после «=»
│   ├── MemoryAndHistoryTest.java    память, предпросмотр, кэш, история
│   └── FormattingTest.java          разряды, формат чисел, вставка из буфера
├── src/test/resources/allure.properties
└── docs/
    ├── ci.md                        CI, SonarCloud, Jenkins
    ├── jira.md                      работа с Jira
    ├── test-cases.md                34 тест-кейса (ссылки из Allure ведут сюда)
    └── test-cases.csv               те же кейсы для импорта в TMS
```

---

## Как запустить автотесты и открыть отчёт Allure

### Шаг 1. Установите Java (если ещё нет)

Проверьте в Терминале:

```bash
java -version
```

Если версия 17 или выше, переходите к шагу 2. Если нет, установите JDK без прав администратора:

```bash
# Apple Silicon (M1–M4). Для Intel замените aarch64 на x64
mkdir -p ~/jdk && cd ~/jdk
curl -L -o jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse"
tar -xzf jdk.tar.gz && rm jdk.tar.gz
echo 'export JAVA_HOME=$(ls -d ~/jdk/jdk-21*/Contents/Home)' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Шаг 2. Скачайте проект

Без git:

```bash
cd ~/Documents
curl -L -o java-calculator.zip https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/archive/refs/heads/main.zip
unzip -o java-calculator.zip && mv java-calculator-main java-calculator 2>/dev/null; rm java-calculator.zip
cd java-calculator
```

Или через git: `git clone https://github.com/ravshanbekrakhmetullayev-ui/java-calculator.git && cd java-calculator`

### Шаг 3. Запустите тесты и отчёт

```bash
zsh run-tests.sh
```

Что делает скрипт:

1. Если Maven не установлен, скачивает его в `~/maven`. Права администратора не нужны, это происходит один раз.
2. Запускает все автотесты: `mvn clean test`.
3. Собирает отчёт Allure и открывает его в браузере: `mvn allure:serve`.

Первый запуск занимает 2–4 минуты, потому что Maven скачивает JUnit, Allure и плагины. Следующие запуски проходят за 20–30 секунд.

Отчёт открывается на локальном адресе вида `http://192.168.x.x:xxxxx`. Чтобы остановить сервер отчёта, нажмите **Ctrl+C** в Терминале.

### Что смотреть в отчёте Allure

| Раздел | Что там |
|---|---|
| **Overview** | Сводка: сколько тестов прошло и упало, длительность |
| **Behaviors** | Тесты по функциям: Эпик → Фича → История (`@Epic`, `@Feature`, `@Story`) |
| **Suites** | Тесты по классам |
| **Graphs** | Распределение по статусам и серьёзности (`@Severity`) |
| Карточка теста | Шаги («Нажать: 2 + 3 × 4 =», «На экране: 14»), вложение с состоянием экрана, параметры, ссылка на тест-кейс в TMS (`@TmsLink`) |

### Другие команды

```bash
mvn test                                  # только тесты, без отчёта
mvn test -Dtest=ArithmeticTest            # один класс
mvn test -Dtest='ArithmeticTest#operatorPrecedence'   # один тест
zsh run-tests.sh --no-open                # отчёт в файлы target/site/allure-maven-plugin
```

Если Maven был скачан скриптом, вместо `mvn` пишите `~/maven/apache-maven-3.9.9/bin/mvn`.

### Если что-то не так

| Сообщение | Что делать |
|---|---|
| `Unable to locate a Java Runtime` | Выполните `source ~/.zshrc` или установите Java (шаг 1) |
| `curl: (6) Could not resolve host` или ошибки скачивания Maven | Нет доступа к интернету или его блокирует корпоративная сеть. Подключитесь к другой сети или попросите у администратора адрес внутреннего зеркала Maven |
| `Could not transfer artifact ... from/to central` | Корпоративная сеть блокирует Maven Central. Нужен `~/.m2/settings.xml` с адресом внутреннего зеркала (Nexus или Artifactory) |
| Браузер не открылся | Откройте вручную адрес, который `allure:serve` напечатал в Терминале |
| `zsh: permission denied` | Запускайте через `zsh run-tests.sh`, а не `./run-tests.sh` |

---

## Тест-кейсы

34 тест-кейса, из них 30 покрыты автотестами. Полный список с шагами: [docs/test-cases.md](docs/test-cases.md).

Чтобы импортировать их в TMS (Qase, TestIT, TestRail), возьмите [docs/test-cases.csv](docs/test-cases.csv). Колонки: `id, suite, title, description, preconditions, priority, severity, type, automation, steps_actions, steps_result`. При импорте сопоставьте их с полями TMS.

## Запуск самого калькулятора

```bash
javac -encoding UTF-8 -d out src/main/java/Calculator.java && java -cp out Calculator
```

Отдельное приложение для macOS: `zsh build-app.sh` соберёт `Calculator.app` в `~/Applications`.
