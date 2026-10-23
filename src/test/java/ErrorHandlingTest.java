import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Owner;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import io.qameta.allure.TmsLink;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Epic("Калькулятор")
@Feature("Обработка ошибок")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Обработка ошибок")
class ErrorHandlingTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "1 ÷ 0 =               | Деление на ноль",
            "5 ÷ ( 2 − 2 ) =       | Деление на ноль",
            "0 ÷ 0 =               | Деление на ноль",
            "0 1/x                 | Деление на ноль",
    })
    @Story("Деление на ноль")
    @Severity(SeverityLevel.BLOCKER)
    @TmsLink("TC-07")
    @DisplayName("Деление на ноль показывает понятное сообщение, а не падает")
    void divisionByZero(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @Test
    @Story("Корень из отрицательного")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-10")
    @DisplayName("Корень из отрицательного числа")
    void sqrtOfNegative() {
        CalcSteps.calculate("√ ( − 4 ) =", "Корень из отрицательного");
    }

    @ParameterizedTest(name = "после ошибки нажать {0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "7         | 7",
            "C         | 0",
            "⌫         | 0",
            "( 1 + 1 = | 2",
    })
    @Story("Восстановление после ошибки")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-08")
    @DisplayName("После ошибки калькулятор продолжает работать")
    void recoveryAfterError(String keys, String expected) {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "1 ÷ 0 =");
        CalcSteps.shouldShow(engine, "Деление на ноль");
        CalcSteps.press(engine, keys);
        CalcSteps.shouldShow(engine, expected);
        CalcSteps.shouldHaveNoError(engine);
    }

    @Test
    @Story("Пустой ввод")
    @Severity(SeverityLevel.NORMAL)
    @DisplayName("«=» на пустом экране ничего не ломает")
    void equalsOnEmpty() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "= = =");
        CalcSteps.shouldShow(engine, "0");
        CalcSteps.shouldHaveNoError(engine);
    }

    @Test
    @Story("Висящий оператор")
    @Severity(SeverityLevel.NORMAL)
    @DisplayName("Оператор в конце выражения игнорируется: «2 + =» → 2")
    void trailingOperator() {
        CalcSteps.calculate("2 + =", "2");
    }

    @ParameterizedTest(name = "«{0}» — ошибка разбора")
    @CsvSource(delimiter = '|', value = {
            "2+",
            "(2",
            "×3",
            ".",
    })
    @Story("Некорректные выражения")
    @Severity(SeverityLevel.NORMAL)
    @DisplayName("Парсер отклоняет некорректные выражения")
    void parserRejectsInvalid(String expression) {
        Allure.parameter("Выражение", expression);
        Calculator.CalcError ex = Allure.step("Разобрать «" + expression + "»", () ->
                assertThrows(Calculator.CalcError.class, () -> Calculator.Parser.eval(expression)));
        Allure.step("Есть текст ошибки: " + ex.getMessage(), () ->
                assertEquals(false, ex.getMessage().isEmpty()));
    }
}
