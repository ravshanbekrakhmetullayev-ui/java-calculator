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

@Epic("Калькулятор")
@Feature("Арифметика")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Арифметика")
class ArithmeticTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "2 + 3 =         | 5",
            "1 0 − 4 =       | 6",
            "7 × 8 =         | 56",
            "1 0 0 ÷ 4 =     | 25",
            "9 9 9 + 1 =     | 1000",
            "0 − 7 =         | −7",
    })
    @Story("Базовые операции")
    @Severity(SeverityLevel.BLOCKER)
    @TmsLink("TC-01")
    @DisplayName("Четыре базовые операции")
    void basicOperations(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "2 + 3 × 4 =         | 14",
            "2 × 3 + 4 =         | 10",
            "1 0 − 2 × 3 =       | 4",
            "8 ÷ 2 + 2 × 3 =     | 10",
            "2 + 8 ÷ 4 − 1 =     | 3",
    })
    @Story("Порядок операций")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-02")
    @DisplayName("Умножение и деление выполняются раньше сложения и вычитания")
    void operatorPrecedence(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "( 2 + 3 ) × 4 =             | 20",
            "2 × ( 3 + 4 ) =             | 14",
            "( ( 1 + 2 ) × ( 3 + 4 ) ) = | 21",
            "1 0 ÷ ( 2 + 3 ) =           | 2",
    })
    @Story("Скобки")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-03")
    @DisplayName("Скобки меняют порядок вычислений")
    void parentheses(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "1 0 − 4 − 3 =     | 3",
            "1 0 0 ÷ 4 ÷ 5 =   | 5",
            "2 ÷ 4 × 8 =       | 4",
    })
    @Story("Порядок операций")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-04")
    @DisplayName("Операции одного приоритета выполняются слева направо")
    void leftAssociativity(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "1 ÷ 3 =         | 0.333333333333",
            "2 ÷ 3 =         | 0.666666666667",
            "1 ÷ 3 × 3 =     | 1",
            "1 0 ÷ 4 =       | 2.5",
    })
    @Story("Точность")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-05")
    @DisplayName("Деление: 12 значащих цифр и корректное округление")
    void divisionPrecision(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            ". 1 + . 2 =       | 0.3",
            "0 . 7 + 0 . 1 =   | 0.8",
            "1 . 1 × 1 . 1 =   | 1.21",
            "0 . 3 − 0 . 1 =   | 0.2",
    })
    @Story("Точность")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-06")
    @DisplayName("Десятичные дроби считаются без ошибок округления")
    void decimalPrecision(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @Test
    @Story("Отрицательные числа")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-14")
    @DisplayName("Умножение на отрицательное: 5 × −2 = −10")
    void multiplyByNegative() {
        CalcSteps.calculate("5 × − 2 =", "−10");
    }

    @Test
    @Story("Отрицательные числа")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-14")
    @DisplayName("Унарный минус в начале выражения: −5 + 2 = −3")
    void leadingMinus() {
        CalcSteps.calculate("− 5 + 2 =", "−3");
    }

    @Test
    @Story("Разбор выражения")
    @Severity(SeverityLevel.NORMAL)
    @DisplayName("Парсер напрямую: сложное выражение")
    void parserDirect() {
        String result = io.qameta.allure.Allure.step("Посчитать «(2+3)×4−10÷5»", () ->
                Calculator.Engine.format(Calculator.Parser.eval("(2+3)×4−10÷5")));
        io.qameta.allure.Allure.step("Результат 18", () -> assertEquals("18", result));
    }
}
