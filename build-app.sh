#!/bin/zsh
# Собирает Calculator.app и кладёт его в ~/Applications.
# Запуск:  zsh build-app.sh
set -e
cd "$(dirname "$0")"

if ! command -v jpackage >/dev/null 2>&1; then
  echo "Не найден jpackage. Выполните: source ~/.zshrc  и запустите скрипт ещё раз."
  exit 1
fi

echo "1/4 Компилирую..."
rm -rf build dist
mkdir -p build/classes build/jar
javac -encoding UTF-8 -d build/classes src/main/java/Calculator.java

echo "2/4 Проверяю (41 тест)..."
java -Dfile.encoding=UTF-8 -cp build/classes Calculator --test > build/tests.log 2>&1 || { cat build/tests.log; echo "Тесты не прошли, сборка остановлена."; exit 1; }
tail -n 1 build/tests.log

echo "3/4 Упаковываю в JAR..."
printf "Main-Class: Calculator\n" > build/manifest.txt
jar cfm build/jar/Calculator.jar build/manifest.txt -C build/classes .

echo "4/4 Собираю Calculator.app (около минуты)..."
jpackage \
  --type app-image \
  --name Calculator \
  --app-version 2.0 \
  --input build/jar \
  --main-jar Calculator.jar \
  --main-class Calculator \
  --java-options "-Dfile.encoding=UTF-8" \
  --dest dist

mkdir -p ~/Applications
rm -rf ~/Applications/Calculator.app
cp -R dist/Calculator.app ~/Applications/

echo ""
echo "Готово: ~/Applications/Calculator.app"
open ~/Applications/Calculator.app
