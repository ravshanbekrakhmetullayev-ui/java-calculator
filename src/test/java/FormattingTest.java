import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Owner;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import io.qameta.allure.TmsLink;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Epic("Калькулятор")
@Feature("Форматирование и буфер обмена")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Форматирование и буфер обмена")
class FormattingTest {

    /** Тонкий пробел между разрядами заменён на «_» для читаемости данных. */
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "123             | 123",
            "1234            | 1_234",
            "1234567         | 1_234_567",
            "1234567.8901    | 1_234_567.8901",
            "12+3456         | 12+3_456",
            "1e15            | 1e15",
    })
    @Story("Разделение разрядов")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-33")
    @DisplayName("Большие числа разделяются на разряды, дробная часть — нет")
    void thousandsSeparator(String input, String expected) {
        Allure.parameter("Ввод", input);
        String actual = Allure.step("Отформатировать", () -> Calculator.pretty(input).replace(' ', '_'));
        Allure.step("Получилось " + expected, () -> assertEquals(expected, actual));
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            "2.50            | 2.5",
            "-7              | −7",
            "0.000           | 0",
            "1234567890123456| 1.23456789012e15",
            "0.0000000001    | 1e−10",
    })
    @Story("Вывод результата")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-19")
    @DisplayName("Результат без лишних нулей, минус как «−»")
    void resultFormat(String input, String expected) {
        Allure.parameter("Число", input);
        String actual = Allure.step("Отформатировать", () -> Calculator.Engine.format(new BigDecimal(input)));
        Allure.step("Получилось " + expected, () -> assertEquals(expected, actual));
    }

    @ParameterizedTest(name = "вставить «{0}» → {1}")
    @CsvSource(delimiter = '|', value = {
            "(12+8)*3        | 60",
            "10/4            | 2.5",
            "2x3             | 6",
            "1,5+1,5         | 3",
            "7-10            | −3",
    })
    @Story("Вставка из буфера")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-32")
    @DisplayName("Выражение из буфера обмена с обычными символами * / - , x")
    void pasteFromClipboard(String text, String expected) {
        Allure.parameter("Текст в буфере", text);
        Calculator.Engine engine = CalcSteps.newCalculator();
        Allure.step("Вставить «" + text + "» и нажать «=»", () -> {
            for (char ch : text.toCharArray()) {
                String key = Calculator.mapChar(ch);
                if (key != null) engine.input(key);
            }
            engine.input("=");
        });
        CalcSteps.shouldShow(engine, expected);
    }
}
