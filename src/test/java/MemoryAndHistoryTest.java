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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("Калькулятор")
@Feature("Память, кэш и история")
@Owner("Ravshanbek Rakhmetullayev")
@DisplayName("Память, кэш и история")
class MemoryAndHistoryTest {

    @Test
    @Story("Память")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-23")
    @DisplayName("M+ накапливает сумму, MR вставляет её")
    void memoryAddAndRecall() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "5 M+ C");
        CalcSteps.press(engine, "3 M+ C");
        CalcSteps.press(engine, "MR");
        CalcSteps.shouldShow(engine, "8");
    }

    @Test
    @Story("Память")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-24")
    @DisplayName("M− вычитает из памяти")
    void memorySubtract() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "1 0 M+ C 4 M− C MR");
        CalcSteps.shouldShow(engine, "6");
    }

    @Test
    @Story("Память")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-24")
    @DisplayName("MC очищает память")
    void memoryClear() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "5 M+ MC");
        Allure.step("Память пуста", () -> assertNull(engine.memory));
    }

    @Test
    @Story("Память")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-23")
    @DisplayName("MR после числа подставляется через умножение: 2 MR → 2×(память)")
    void memoryRecallAfterNumber() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "3 M+ C 2 MR =");
        CalcSteps.shouldShow(engine, "6");
    }

    @Test
    @Story("Предпросмотр")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-25")
    @DisplayName("Результат виден во время ввода, до нажатия «=»")
    void livePreview() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "2 + 3 ×");
        Allure.step("Подсказка «= 5» (висящий × не учитывается)", () -> assertEquals("5", engine.preview()));
        CalcSteps.press(engine, "4");
        Allure.step("Подсказка «= 14»", () -> assertEquals("14", engine.preview()));
        CalcSteps.press(engine, "=");
        Allure.step("После «=» подсказка скрыта", () -> assertNull(engine.preview()));
    }

    @Test
    @Story("Кэш")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-27")
    @DisplayName("Повторное выражение берётся из кэша")
    void cacheHit() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "1 2 3 × 4 5 6 =");
        int before = engine.cache.hits;
        CalcSteps.press(engine, "C 1 2 3 × 4 5 6 =");
        CalcSteps.shouldShow(engine, "56088");
        Allure.step("Кэш сработал хотя бы раз", () ->
                assertTrue(engine.cache.hits > before, "Попаданий в кэш: " + engine.cache.hits));
    }

    @Test
    @Story("Кэш")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-27")
    @DisplayName("Кэш хранит не больше 256 выражений")
    void cacheLimit() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        Allure.step("Посчитать 300 разных выражений", () -> {
            for (int i = 1; i <= 300; i++) engine.compute(i + "+1");
        });
        Allure.step("Размер кэша 256", () -> assertEquals(256, engine.cache.size()));
    }

    @Test
    @Story("История")
    @Severity(SeverityLevel.NORMAL)
    @TmsLink("TC-28")
    @DisplayName("Каждое «=» добавляет запись в историю, новые сверху")
    void historyOrder() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "2 + 2 = C 3 × 3 =");
        Allure.step("В истории 2 записи", () -> assertEquals(2, engine.history.size()));
        Allure.step("Сверху последняя: 3×3 = 9", () -> {
            assertEquals("3×3", engine.history.get(0)[0]);
            assertEquals("9", engine.history.get(0)[1]);
        });
    }

    @Test
    @Story("История")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-28")
    @DisplayName("Ошибка и простое число в историю не попадают")
    void historySkipsTrivial() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        CalcSteps.press(engine, "5 = C 1 ÷ 0 =");
        Allure.step("История пуста", () -> assertEquals(0, engine.history.size()));
    }

    @Test
    @Story("История")
    @Severity(SeverityLevel.MINOR)
    @TmsLink("TC-28")
    @DisplayName("История ограничена 200 записями")
    void historyLimit() {
        Calculator.Engine engine = CalcSteps.newCalculator();
        Allure.step("Сделать 210 вычислений", () -> {
            for (int i = 1; i <= 210; i++) {
                engine.clear();
                for (char c : String.valueOf(i).toCharArray()) engine.input(String.valueOf(c));
                engine.input("+");
                engine.input("1");
                engine.input("=");
            }
        });
        Allure.step("Записей 200", () -> assertEquals(200, engine.history.size()));
    }
}
