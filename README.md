# 🧮 Java Calculator

Оконный калькулятор на Java Swing в одном файле, без сторонних библиотек.

![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Tests](https://img.shields.io/badge/tests-41%20passed-25A162?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-555?style=flat-square)

## Возможности

**Вычисления**
- Правильный порядок операций: `2 + 3 × 4 = 14`
- Скобки, в том числе вложенные. Незакрытые скобки закрываются автоматически
- Функции `√`, `x²`, `1/x`, `%`, `±`
- Точная арифметика на `BigDecimal`: `0.1 + 0.2 = 0.3`, `1 ÷ 3 × 3 = 1`
- Понятные ошибки вместо падения: «Деление на ноль», «Корень из отрицательного»

**Удобства**
- Результат виден прямо во время ввода
- История вычислений сохраняется между запусками (`~/.calculator_history`)
- LRU-кэш на 256 выражений
- Память `MC` `MR` `M+` `M−`
- Копирование результата и вставка выражения из буфера обмена
- Разделение разрядов, автоподбор размера шрифта

## Быстрый старт

Нужен JDK 17 или новее (`javac -version`).

~~~bash
curl -L -o Calculator.java https://raw.githubusercontent.com/ravshanbekrakhmetullayev-ui/java-calculator/main/Calculator.java
javac -encoding UTF-8 Calculator.java
java Calculator
~~~

Или через git:

~~~bash
git clone https://github.com/ravshanbekrakhmetullayev-ui/java-calculator.git
cd java-calculator
javac -encoding UTF-8 Calculator.java
java Calculator
~~~

## Отдельное приложение для macOS

Скрипт собирает `Calculator.app` через `jpackage` и кладёт его в `~/Applications`:

~~~bash
zsh build-app.sh
~~~

## Тесты

~~~bash
java -Dfile.encoding=UTF-8 Calculator --test
~~~

41 автоматическая проверка: приоритеты операций, функции, ошибки, правила ввода, память, кэш, история, форматирование.

## Клавиатура

| Клавиша | Действие |
|---|---|
| `0–9`, `.` или `,` | Цифры и точка |
| `+` `-` `*` `/` | Операции |
| `(` `)` | Скобки |
| `%` / `^` / `r` | Процент / квадрат / корень |
| `Enter` | Посчитать |
| `Backspace` / `Esc` | Стереть символ / сбросить |
| `Cmd+C` / `Cmd+V` | Копировать результат / вставить выражение |
| `Cmd+H` | История |

## Устройство кода

| Класс | Что делает |
|---|---|
| `Parser` | Рекурсивный разбор выражения с приоритетами |
| `Engine` | Правила ввода и состояние, не зависит от UI |
| `ResultCache` | LRU-кэш результатов на `LinkedHashMap` |
| `HistoryStore` | Сохранение истории в файл |
| `Calculator` | Окно Swing |
