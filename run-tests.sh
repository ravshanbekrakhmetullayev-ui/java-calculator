#!/bin/zsh
# Запускает автотесты и открывает отчёт Allure в браузере.
# Maven ставить не нужно: если его нет, скрипт скачает его в ~/maven (без прав администратора).
#
#   zsh run-tests.sh            тесты + отчёт в браузере
#   zsh run-tests.sh --no-open  только тесты и HTML-отчёт в target/site/allure-maven-plugin
set -e
cd "$(dirname "$0")"

MAVEN_VERSION=3.9.9
MAVEN_HOME_LOCAL="$HOME/maven/apache-maven-$MAVEN_VERSION"

# --- Java ---
if ! command -v java >/dev/null 2>&1 || ! java -version >/dev/null 2>&1; then
  [ -f ~/.zshrc ] && source ~/.zshrc
fi
if ! java -version >/dev/null 2>&1; then
  echo "Не найдена Java. Установите JDK 17+ (см. README, раздел «Установка Java»)."
  exit 1
fi

# --- Maven ---
if command -v mvn >/dev/null 2>&1; then
  MVN=mvn
else
  if [ ! -x "$MAVEN_HOME_LOCAL/bin/mvn" ]; then
    echo "Maven не найден, скачиваю Maven $MAVEN_VERSION в ~/maven ..."
    mkdir -p "$HOME/maven"
    URL1="https://archive.apache.org/dist/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz"
    URL2="https://dlcdn.apache.org/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz"
    curl -fL -o "$HOME/maven/maven.tar.gz" "$URL1" || curl -fL -o "$HOME/maven/maven.tar.gz" "$URL2"
    tar -xzf "$HOME/maven/maven.tar.gz" -C "$HOME/maven"
    rm -f "$HOME/maven/maven.tar.gz"
  fi
  MVN="$MAVEN_HOME_LOCAL/bin/mvn"
fi

echo ""
echo "=== Запуск автотестов ==="
# Тесты не останавливают скрипт при падении: отчёт нужен и в этом случае
"$MVN" -B clean test -Dmaven.test.failure.ignore=true

echo ""
if [ "$1" = "--no-open" ]; then
  echo "=== Генерация отчёта Allure ==="
  "$MVN" -B allure:report
  echo "Отчёт: target/site/allure-maven-plugin/index.html"
else
  echo "=== Отчёт Allure откроется в браузере. Чтобы остановить, нажмите Ctrl+C ==="
  "$MVN" -B allure:serve
fi
