# 🧮 Java Calculator

Оконный калькулятор на Java Swing с автотестами на JUnit 5, отчётами Allure и проверкой кода в SonarCloud.

[![CI](https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions/workflows/tests-allure.yml/badge.svg)](https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions/workflows/tests-allure.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=alert_status)](https://sonarcloud.io/project/overview?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ravshanbekrakhmetullayev-ui_java-calculator&metric=coverage)](https://sonarcloud.io/project/overview?id=ravshanbekrakhmetullayev-ui_java-calculator)
[![Allure](https://img.shields.io/badge/Allure-отчёт-FF6B6B?style=flat-square)](https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/)

**Отчёт Allure:** https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/ · **CI, SonarCloud и Jenkins:** [docs/ci.md](docs/ci.md) · **Jira (проект CALC):** [docs/jira.md](docs/jira.md)

> Работа ведётся через задачи Jira: ветка `feature/CALC-12-...`, коммит `CALC-12 ...`, PR `CALC-12 ...`. Без ключа задачи PR не пройдёт проверку. Подробно: [docs/jira.md](docs/jira.md).

![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![JUnit 5](https://img.shields.io/badge/JUnit-5-25A162?style=flat-square&logo=junit5&logoColor=white)
![Allure](https://img.shields.io/badge/Allure-report-FF6B6B?style=flat-square)
![Tests](https://img.shields.io/badge/автотесты-114-25A162?style=flat-square)
![Test cases](https://img.shields.io/badge/тест--кейсы-34-0052CC?style=flat-square)

## Возможности калькулятора

- Порядок операций, скобки, `√`, `x²`, `1/x`, `%`, `±`
- Точная арифметика на `BigDecimal`: `0.1 + 0.2 = 0.3`
- Результат виден во время ввода
- История вычислений между запусками, LRU-кэш, память `MC MR M+ M−`
- Копирование и вставка через буфер обмена, полное управление с клавиатуры

## Структура проекта

```
java-calculator/
├── pom.xml                          Maven: JUnit 5, Allure
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
