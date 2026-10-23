# 🔗 Все ссылки и доступы

Пароли, токены и личная почта здесь не хранятся (репозиторий публичный). Везде вход через **ваш Google-аккаунт**.
Кнопка **Continue with Google** есть на GitHub, Atlassian (Jira), SonarCloud и Qase.

## Кто что видит

| Ресурс | Доступ | Кто видит |
|---|---|---|
| Репозиторий GitHub | 🌍 Публичный | Все, без входа |
| Отчёт Allure | 🌍 Публичный | Все, без входа |
| Проект SonarCloud | 🌍 Публичный | Все без входа; настройки — только владелец |
| Jira (сайт и проект CALC) | 🔒 Закрытый | Только вы и те, кого пригласите |
| Gmail | 🔒 Личный | Только вы |
| Папка на Mac | 🔒 Локальная | Только на этом компьютере |

---

## 1. GitHub

**Как войти:** https://github.com/login → вход через Google или логин `ravshanbekrakhmetullayev-ui`.

| Что | Ссылка |
|---|---|
| Профиль | https://github.com/ravshanbekrakhmetullayev-ui |
| Репозиторий | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator |
| Запуски конвейера (Actions) | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions |
| Запустить конвейер вручную | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/actions/workflows/tests-allure.yml → **Run workflow** |
| Pull requests | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/pulls |
| История коммитов | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/commits/main |
| Секреты (сюда `SONAR_TOKEN`) | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/settings/secrets/actions |
| Настройки GitHub Pages | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/settings/pages |
| Установленные приложения (SonarCloud, Jira) | https://github.com/settings/installations |
| Скачать проект архивом | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/archive/refs/heads/main.zip |

Настройки (Settings) и секреты открываются только у владельца, после входа.

## 2. Отчёт Allure

**Как войти:** вход не нужен, ссылка открывается у всех.

| Что | Ссылка |
|---|---|
| Отчёт (обновляется после каждого push в main) | https://ravshanbekrakhmetullayev-ui.github.io/java-calculator/ |
| Скачать отчёт и покрытие JaCoCo архивом | Actions → последний запуск → внизу **Artifacts → reports** |

## 3. SonarCloud (анализ кода)

**Как войти:** https://sonarcloud.io → **Log in → GitHub** (тот же GitHub-аккаунт).

| Что | Ссылка |
|---|---|
| Сводка проекта | https://sonarcloud.io/summary/overall?id=ravshanbekrakhmetullayev-ui_java-calculator |
| Найденные проблемы | https://sonarcloud.io/project/issues?id=ravshanbekrakhmetullayev-ui_java-calculator |
| Организация | https://sonarcloud.io/organizations/ravshanbekrakhmetullayev-ui |
| Способ анализа (Automatic / GitHub Actions) | https://sonarcloud.io/project/analysis_method?id=ravshanbekrakhmetullayev-ui_java-calculator |
| Ваши токены | https://sonarcloud.io/account/security |

Ключ организации: `ravshanbekrakhmetullayev-ui`. Ключ проекта: `ravshanbekrakhmetullayev-ui_java-calculator`.

## 4. Jira

**Как войти:** https://ravshanbekrakhmetullayevqa.atlassian.net → **Continue with Google**.

| Что | Ссылка |
|---|---|
| Доска спринта CALC | https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2 |
| Бэклог | https://ravshanbekrakhmetullayevqa.atlassian.net/jira/software/projects/CALC/boards/2/backlog |
| Инструкция по работе (CALC-20) | https://ravshanbekrakhmetullayevqa.atlassian.net/browse/CALC-20 |
| Любая задача | `https://ravshanbekrakhmetullayevqa.atlassian.net/browse/CALC-<номер>` |
| Все ваши сайты и приложения Atlassian | https://home.atlassian.com |
| Администрирование (пользователи, продукты) | https://admin.atlassian.com |

- **Пригласить человека:** https://admin.atlassian.com → **Directory → Users → Invite users**, указать email и дать доступ к Jira.
- **Подключить GitHub for Jira:** в Jira **⚙ → Приложения → Найти новые приложения** → `GitHub for Jira` → **Get app** → подключить `ravshanbekrakhmetullayev-ui/java-calculator`.
- **Правила автоматизации:** доска CALC → **⋯ → Настройки проекта → Автоматизация**.
- **Добавить Confluence (вики-страницы):** https://admin.atlassian.com → **Products → Add product → Confluence Free**.

## 5. Jenkins

Своего сервера Jenkins нет: конвейер работает в GitHub Actions. Для Jenkins готов [`Jenkinsfile`](../Jenkinsfile), настройка описана в [docs/ci.md](ci.md#jenkins).

## 6. Тест-кейсы и TMS

| Что | Ссылка |
|---|---|
| 34 тест-кейса | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/blob/main/docs/test-cases.md |
| CSV для импорта в TMS | https://github.com/ravshanbekrakhmetullayev-ui/java-calculator/blob/main/docs/test-cases.csv |
| Qase (бесплатная TMS, ещё не создана) | https://app.qase.io/signup → вход через Google → импорт CSV (задача CALC-10) |

## 7. Gmail

**Как войти:** https://mail.google.com → ваш Google-аккаунт.

| Что | Ссылка |
|---|---|
| Фильтры (сортировка по папкам, LinkedIn в корзину) | https://mail.google.com/mail/u/0/#settings/filters |
| Ярлыки (папки) | https://mail.google.com/mail/u/0/#settings/labels |

## 8. На вашем Mac

| Что | Где |
|---|---|
| Проект | `~/Documents/calculator/java-calculator` |
| Приложение-калькулятор | `~/Applications/Calculator.app` (собирается командой `zsh build-app.sh`) |
| Запуск тестов с отчётом | `cd ~/Documents/calculator/java-calculator && zsh run-tests.sh` |

## 9. Документация в репозитории

| Документ | О чём |
|---|---|
| [README.md](../README.md) | Обзор, интеграции, запуск тестов |
| [docs/ci.md](ci.md) | GitHub Actions, SonarCloud, Jenkins |
| [docs/jira.md](jira.md) | Работа с Jira: ветки, коммиты, PR, баги |
| [docs/test-cases.md](test-cases.md) | Тест-кейсы |
| [docs/links.md](links.md) | Этот список |
