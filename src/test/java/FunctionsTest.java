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
@Feature("Функции")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Функции")
class FunctionsTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "√ 1 6 =           | 4",
            "√ 2 =             | 1.41421356237",
            "√ 0 =             | 0",
            "√ ( 9 + 1 6 ) =   | 5",
            "2 √ 9 =           | 6",
    })
    @Story("Квадратный корень")
    @Severity(SeverityLevel.CRITICAL)
    @TmsLink("TC-09")
    @DisplayName("Квадратный корень")
    void squareRoot(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "5 x² =            | 25",
            "1 . 5 x² =        | 2.25",
            "( − 3 ) x² =      | 9",
            "− 3 x² =          | −9",
            "2 + 3 x² =        | 11",
    })
    @Story("Квадрат")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-11")
    @DisplayName("Квадрат числа и приоритет унарного минуса")
    void square(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "5 0 % =           | 0.5",
            "2 0 0 × 1 5 % =   | 30",
            "1 % =             | 0.01",
    })
    @Story("Процент")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-12")
    @DisplayName("Процент делит число на 100")
    void percent(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "4 1/x             | 0.25",
            "8 1/x             | 0.125",
            "2 + 2 1/x         | 0.25",
    })
    @Story("Обратное число")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-13")
    @DisplayName("1/x считает обратное значение всего выражения")
    void reciprocal(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "9 ±               | −9",
            "9 ± ±             | 9",
            "5 + 3 ± =         | 2",
            "5 + 3 ± ±         | 5+3",
    })
    @Story("Смена знака")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-14")
    @DisplayName("Кнопка ± меняет знак последнего числа")
    void negate(String keys, String expected) {
        CalcSteps.calculate(keys, expected);
    }

    @Test
    @Story("Скобки")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-26")
    @DisplayName("Незакрытая скобка закрывается автоматически при «=»")
    void autoCloseParenthesis() {
        CalcSteps.calculate("( 2 + 3 =", "5");
    }

    @Test
    @Story("Скобки")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-26")
    @DisplayName("Число перед скобкой означает умножение: 2(3) = 6")
    void implicitMultiplication() {
        CalcSteps.calculate("2 ( 3 ) =", "6");
    }
}
