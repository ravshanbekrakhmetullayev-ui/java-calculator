import io.qameta.allure.Allure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Шаги для тестов: каждый шаг виден в отчёте Allure.
 * Нажатия передаются строкой через пробел, как на кнопках калькулятора: "2 + 3 × 4 =".
 */
public final class CalcSteps {

    private CalcSteps() { }

    public static Calculator.Engine newCalculator() {
        return Allure.step("Открыть калькулятор", () -> new Calculator.Engine());
    }

    public static void press(Calculator.Engine engine, String keys) {
        Allure.step("Нажать: " + keys, () -> {
            for (String k : keys.trim().split("\\s+")) engine.input(k);
        });
        Allure.addAttachment("Экран после ввода", "text/plain", screen(engine));
    }

    /** То, что сейчас показано на главной строке экрана. */
    public static String display(Calculator.Engine engine) {
        if (engine.error != null) return engine.error;
        return engine.expr.isEmpty() ? "0" : engine.expr;
    }

    public static void shouldShow(Calculator.Engine engine, String expected) {
        Allure.step("На экране: " + expected, () ->
                assertEquals(expected, display(engine), "Неверное значение на экране"));
    }

    public static void shouldHaveNoError(Calculator.Engine engine) {
        Allure.step("Сообщения об ошибке нет", () ->
                assertNull(engine.error, "Неожиданная ошибка"));
    }

    /** Полный сценарий: открыть, нажать, проверить. */
    public static void calculate(String keys, String expected) {
        Allure.parameter("Нажатия", keys);
        Allure.parameter("Ожидается", expected);
        Calculator.Engine engine = newCalculator();
        press(engine, keys);
        shouldShow(engine, expected);
    }

    static String screen(Calculator.Engine engine) {
        String preview = engine.preview();
        return "Выражение: " + (engine.expr.isEmpty() ? "0" : engine.expr) + "\n"
                + "Ошибка:    " + (engine.error == null ? "нет" : engine.error) + "\n"
                + "Подсказка: " + (preview == null ? "—" : "= " + preview) + "\n"
                + "Память:    " + (engine.memory == null ? "пусто" : Calculator.Engine.format(engine.memory));
    }
}
