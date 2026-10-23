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

@Epic("Калькулятор")
@Feature("Правила ввода")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Правила ввода")
class InputRulesTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "1 . . 5         | 1.5",
            "1 . 2 . 3       | 1.23",
            ".               | 0.",
            "5 + .           | 5+0.",
    })
    @Story("Десятичная точка")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-15")
    @DisplayName("Вторая точка в числе игнорируется, точка без цифры даёт «0.»")
    void decimalPoint(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "0 7             | 7",
            "0 0 0           | 0",
            "5 + 0 3         | 5+3",
            "0 . 5           | 0.5",
    })
    @Story("Ведущий ноль")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-16")
    @DisplayName("Ведущий ноль заменяется цифрой")
    void leadingZero(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "2 + ×           | 2×",
            "2 × ÷           | 2÷",
            "2 × −           | 2×−",
            "2 × − +         | 2+",
            "+               | 0+",
    })
    @Story("Замена оператора")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-17")
    @DisplayName("Повторный оператор заменяет предыдущий")
    void operatorReplacement(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @Test
    @Story("Ограничение длины")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-18")
    @DisplayName("В числе не больше 15 цифр")
    void digitLimit() {
        CalcSteps.calculate("1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8", "123456789012345");
    }

    @Test
    @Story("Большие числа")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-19")
    @DisplayName("Очень большой результат показывается в экспоненциальной записи")
    void bigNumbers() {
        CalcSteps.calculate("9 9 9 9 9 9 9 9 × 9 9 9 9 9 9 9 9 =", "9.9999998e15");
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "1 2 3 ⌫         | 12",
            "1 ⌫             | 0",
            "2 + ⌫           | 2",
            "⌫ ⌫             | 0",
    })
    @Story("Стирание")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-20")
    @DisplayName("⌫ стирает последний символ")
    void backspace(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @Test
    @Story("Продолжение после «=»")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-21")
    @DisplayName("После «=» оператор продолжает считать с результатом")
    void continueAfterEquals() {
        CalcSteps.calculate("2 + 3 = × 4 =", "20");
    }

    @Test
    @Story("Продолжение после «=»")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-22")
    @DisplayName("После «=» цифра начинает новое выражение")
    void newNumberAfterEquals() {
        CalcSteps.calculate("2 + 2 = 7", "7");
    }

    @Test
    @Story("Сброс")
    @Severity(SeverityLevel.CRITICAL)
    @DisplayName("C сбрасывает выражение")
    void clear() {
        CalcSteps.calculate("1 2 3 + 4 C", "0");
    }
}
