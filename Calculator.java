import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.StringSelection;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Калькулятор 2.0
 *
 *  - порядок операций, скобки, √, x², 1/x, %, ±
 *  - результат считается прямо во время ввода
 *  - история вычислений сохраняется между запусками (~/.calculator_history)
 *  - кэш уже посчитанных выражений
 *  - память MC / MR / M+ / M−
 *  - Cmd/Ctrl+C копирует результат, Cmd/Ctrl+V вставляет выражение, Cmd/Ctrl+H — история
 *
 * Сборка:   javac -encoding UTF-8 Calculator.java
 * Запуск:   java Calculator
 * Тесты:    java -Dfile.encoding=UTF-8 Calculator --test
 */
public class Calculator extends JFrame {

    // ======================================================================
    //  ВЫЧИСЛЕНИЯ
    // ======================================================================

    static class CalcError extends RuntimeException {
        CalcError(String msg) { super(msg); }
    }

    /** Разбор выражения с учётом приоритетов: сначала скобки и функции, затем × ÷, затем + −. */
    static class Parser {
        private static final MathContext MC = new MathContext(34, RoundingMode.HALF_EVEN);
        private final String s;
        private int i = 0;

        private Parser(String s) { this.s = s; }

        static BigDecimal eval(String expr) {
            Parser p = new Parser(expr);
            BigDecimal v = p.expr();
            if (p.i < p.s.length()) throw new CalcError("Ошибка в выражении");
            return v;
        }

        private char peek() { return i < s.length() ? s.charAt(i) : '\0'; }

        private BigDecimal expr() {
            BigDecimal v = term();
            while (true) {
                char c = peek();
                if (c == '+') { i++; v = v.add(term(), MC); }
                else if (c == '−' || c == '-') { i++; v = v.subtract(term(), MC); }
                else return v;
            }
        }

        private BigDecimal term() {
            BigDecimal v = unary();
            while (true) {
                char c = peek();
                if (c == '×' || c == '*') { i++; v = v.multiply(unary(), MC); }
                else if (c == '÷' || c == '/') {
                    i++;
                    BigDecimal d = unary();
                    if (d.signum() == 0) throw new CalcError("Деление на ноль");
                    v = v.divide(d, MC);
                }
                else return v;
            }
        }

        private BigDecimal unary() {
            char c = peek();
            if (c == '−' || c == '-') { i++; return unary().negate(); }
            if (c == '√') {
                i++;
                BigDecimal v = unary();
                if (v.signum() < 0) throw new CalcError("Корень из отрицательного");
                return v.sqrt(MC);
            }
            return postfix();
        }

        private BigDecimal postfix() {
            BigDecimal v = primary();
            while (true) {
                char c = peek();
                if (c == '%') { i++; v = v.divide(BigDecimal.valueOf(100), MC); }
                else if (c == '²') { i++; v = v.multiply(v, MC); }
                else return v;
            }
        }

        private BigDecimal primary() {
            char c = peek();
            if (c == '(') {
                i++;
                BigDecimal v = expr();
                if (peek() != ')') throw new CalcError("Не закрыта скобка");
                i++;
                return v;
            }
            int start = i;
            while (Character.isDigit(peek()) || peek() == '.') i++;
            if (start == i) throw new CalcError("Ошибка в выражении");
            String num = s.substring(start, i);
            if (num.equals(".")) throw new CalcError("Ошибка в выражении");
            return new BigDecimal(num.startsWith(".") ? "0" + num : num);
        }
    }

    /** Простой LRU-кэш: помнит последние 256 посчитанных выражений. */
    static class ResultCache extends LinkedHashMap<String, String> {
        private static final int MAX = 256;
        int hits = 0;
        ResultCache() { super(64, 0.75f, true); }
        @Override protected boolean removeEldestEntry(Map.Entry<String, String> e) { return size() > MAX; }
    }

    /** Состояние калькулятора и правила ввода. Не зависит от окна, поэтому легко тестируется. */
    static class Engine {
        private static final String OPS = "+−×÷";
        private static final Pattern LAST_NUMBER = Pattern.compile("(\\(−)?([0-9.]+)(\\))?$");

        String expr = "";            // то, что набрано
        String lastExpr = "";        // выражение, которое посчитали последним «=»
        String error = null;         // текст ошибки, если есть
        boolean justEvaluated = false;
        BigDecimal memory = null;
        final ResultCache cache = new ResultCache();
        final List<String[]> history = new ArrayList<>(); // {выражение, результат}, новые сверху

        // ---------- ввод ----------
        void input(String key) {
            if (error != null) { clear(); if (isControl(key)) return; }
            switch (key) {
                case "C":   clear(); return;
                case "⌫":  backspace(); return;
                case "=":   equals(); return;
                case "±":   negate(); return;
                case "1/x": reciprocal(); return;
                case "MC":  memory = null; return;
                case "MR":  memoryRecall(); return;
                case "M+":  memoryAdd(false); return;
                case "M−":  memoryAdd(true); return;
                case "(":   openParen(); return;
                case ")":   closeParen(); return;
                case "√":   sqrt(); return;
                case "%": case "²": case "x²": postfix(key.equals("%") ? '%' : '²'); return;
                case "+": case "−": case "×": case "÷": operator(key.charAt(0)); return;
                case ".":   dot(); return;
                default:
                    if (key.length() == 1 && Character.isDigit(key.charAt(0))) digit(key.charAt(0));
            }
        }

        private boolean isControl(String k) { return k.equals("C") || k.equals("⌫") || k.equals("="); }

        private char last() { return expr.isEmpty() ? '\0' : expr.charAt(expr.length() - 1); }
        private boolean lastIsValue() { char c = last(); return Character.isDigit(c) || c == '.' || c == ')' || c == '%' || c == '²'; }
        private String currentNumber() {
            int j = expr.length();
            while (j > 0 && (Character.isDigit(expr.charAt(j - 1)) || expr.charAt(j - 1) == '.')) j--;
            return expr.substring(j);
        }
        private void startFreshIfEvaluated() { if (justEvaluated) { expr = ""; justEvaluated = false; } }
        private void continueIfEvaluated() { justEvaluated = false; }

        private void digit(char d) {
            startFreshIfEvaluated();
            char c = last();
            if (c == ')' || c == '%' || c == '²') expr += "×";
            String num = currentNumber();
            if (num.equals("0")) { expr = expr.substring(0, expr.length() - 1) + d; return; }
            if (num.replace(".", "").length() >= 15) return;
            expr += d;
        }

        private void dot() {
            startFreshIfEvaluated();
            char c = last();
            if (c == ')' || c == '%' || c == '²') expr += "×";
            String num = currentNumber();
            if (num.contains(".")) return;
            expr += num.isEmpty() ? "0." : ".";
        }

        private void operator(char op) {
            continueIfEvaluated();
            char c = last();
            if (expr.isEmpty()) { if (op == '−') expr = "−"; else expr = "0" + op; return; }
            if (c == '(') { if (op == '−') expr += "−"; return; }
            if (OPS.indexOf(c) >= 0) {
                // после × или ÷ разрешаем минус как знак числа: 5×−2
                if (op == '−' && (c == '×' || c == '÷')) { expr += "−"; return; }
                // заменяем предыдущий оператор (и «висящий» минус после × ÷)
                expr = expr.substring(0, expr.length() - 1);
                if (!expr.isEmpty() && OPS.indexOf(last()) >= 0) expr = expr.substring(0, expr.length() - 1);
                if (expr.isEmpty()) { expr = op == '−' ? "−" : ""; return; }
                if (last() == '(') { if (op == '−') expr += "−"; return; }
                expr += op;
                return;
            }
            if (c == '.') expr += "0";
            if (c == '√') return;
            expr += op;
        }

        private void openParen() {
            startFreshIfEvaluated();
            if (lastIsValue()) expr += "×";
            expr += "(";
        }

        private void closeParen() {
            continueIfEvaluated();
            long open = expr.chars().filter(ch -> ch == '(').count();
            long close = expr.chars().filter(ch -> ch == ')').count();
            if (open > close && lastIsValue()) expr += ")";
        }

        private void sqrt() {
            startFreshIfEvaluated();
            if (lastIsValue()) expr += "×";
            expr += "√";
        }

        private void postfix(char p) {
            continueIfEvaluated();
            if (lastIsValue()) expr += p;
        }

        private void negate() {
            continueIfEvaluated();
            Matcher m = LAST_NUMBER.matcher(expr);
            if (!m.find() || m.group(2).isEmpty()) return;
            String num = m.group(2);
            int start = m.start();
            if (m.group(1) != null && m.group(3) != null) {           // (−5) → 5
                expr = expr.substring(0, start) + num;
                return;
            }
            int numStart = m.start(2);
            String before = expr.substring(0, numStart);
            if (before.equals("−")) { expr = num; return; }            // −5 → 5
            if (before.isEmpty()) { expr = "−" + num; return; }        // 5 → −5
            expr = before + "(−" + num + ")";                         // 3+5 → 3+(−5)
        }

        private void reciprocal() {
            continueIfEvaluated();
            String p = prepared();
            if (p == null) return;
            expr = "1÷(" + p + ")";
            equals();
        }

        private void backspace() {
            if (justEvaluated) { justEvaluated = false; return; }
            if (!expr.isEmpty()) expr = expr.substring(0, expr.length() - 1);
        }

        void clear() { expr = ""; error = null; justEvaluated = false; lastExpr = ""; }

        // ---------- память ----------
        private void memoryAdd(boolean subtract) {
            BigDecimal v = currentValue();
            if (v == null) return;
            if (memory == null) memory = BigDecimal.ZERO;
            memory = subtract ? memory.subtract(v) : memory.add(v);
        }

        private void memoryRecall() {
            if (memory == null) return;
            startFreshIfEvaluated();
            if (lastIsValue()) expr += "×";
            String v = format(memory);
            expr += v.startsWith("−") ? "(" + v + ")" : v;
        }

        // ---------- вычисление ----------
        /** Выражение, готовое к расчёту: без «висящих» операторов и с закрытыми скобками. */
        String prepared() {
            String e = expr;
            while (!e.isEmpty() && "+−×÷(√.".indexOf(e.charAt(e.length() - 1)) >= 0) e = e.substring(0, e.length() - 1);
            if (e.isEmpty()) return null;
            long open = e.chars().filter(ch -> ch == '(').count();
            long close = e.chars().filter(ch -> ch == ')').count();
            StringBuilder sb = new StringBuilder(e);
            for (long k = close; k < open; k++) sb.append(')');
            return sb.toString();
        }

        /** Посчитать строку с использованием кэша. */
        String compute(String e) {
            String cached = cache.get(e);
            if (cached != null) { cache.hits++; return cached; }
            String r = format(Parser.eval(e));
            cache.put(e, r);
            return r;
        }

        BigDecimal currentValue() {
            String p = prepared();
            if (p == null) return null;
            try { return parseResult(compute(p)); } catch (CalcError ex) { return null; }
        }

        /** Результат «на лету», пока пользователь печатает. null — показывать нечего. */
        String preview() {
            if (error != null || justEvaluated) return null;
            String p = prepared();
            if (p == null) return null;
            try {
                String r = compute(p);
                return r.equals(expr) ? null : r;
            } catch (CalcError ex) {
                return null;
            }
        }

        void equals() {
            String p = prepared();
            if (p == null) return;
            try {
                String r = compute(p);
                if (!r.equals(p)) {
                    history.add(0, new String[]{p, r});
                    if (history.size() > 200) history.remove(history.size() - 1);
                }
                lastExpr = p;
                expr = r;
                justEvaluated = true;
            } catch (CalcError ex) {
                lastExpr = p;
                error = ex.getMessage();
            }
        }

        static BigDecimal parseResult(String r) { return new BigDecimal(r.replace('−', '-')); }

        /** 12 значащих цифр, без лишних нулей, минус как «−». */
        static String format(BigDecimal v) {
            BigDecimal r = v.round(new MathContext(12, RoundingMode.HALF_UP)).stripTrailingZeros();
            String s;
            BigDecimal abs = r.abs();
            if (r.signum() == 0) s = "0";
            else if (abs.compareTo(new BigDecimal("1e15")) >= 0 || abs.compareTo(new BigDecimal("1e-9")) < 0) s = r.toString().replace("E+", "e").replace("E", "e");
            else s = r.toPlainString();
            return s.replace('-', '−');
        }
    }

    /** Сохранение истории в домашней папке, чтобы она была и после перезапуска. */
    static class HistoryStore {
        static final Path FILE = Paths.get(System.getProperty("user.home"), ".calculator_history");

        static void load(List<String[]> into) {
            try {
                if (!Files.exists(FILE)) return;
                for (String line : Files.readAllLines(FILE, StandardCharsets.UTF_8)) {
                    String[] p = line.split("\t");
                    if (p.length == 2) into.add(p);
                }
            } catch (Exception ignored) { }
        }

        static void save(List<String[]> list) {
            try {
                StringBuilder sb = new StringBuilder();
                for (String[] p : list) sb.append(p[0]).append('\t').append(p[1]).append('\n');
                Files.write(FILE, sb.toString().getBytes(StandardCharsets.UTF_8));
            } catch (Exception ignored) { }
        }
    }

    // ======================================================================
    //  ДИЗАЙН
    // ======================================================================

    static final Color BG        = new Color(0x15161A);
    static final Color PANEL     = new Color(0x1C1E23);
    static final Color KEY       = new Color(0x2A2D34);
    static final Color KEY_FN    = new Color(0x22252B);
    static final Color KEY_OP    = new Color(0x3A3F4A);
    static final Color ACCENT    = new Color(0xF2A33A);
    static final Color TEXT      = new Color(0xF2F3F5);
    static final Color TEXT_DIM  = new Color(0x8B909A);
    static final Color TEXT_OP   = new Color(0xF2C47A);
    static final Color DANGER    = new Color(0xFF6B6B);

    static String fontFamily() {
        String[] wanted = {"SF Pro Display", "Helvetica Neue", "Segoe UI", "Inter", "Roboto", "Arial"};
        List<String> have = List.of(GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames());
        for (String w : wanted) if (have.contains(w)) return w;
        return Font.SANS_SERIF;
    }
    static final String FONT = fontFamily();

    static Color mix(Color a, Color b, double t) {
        return new Color(
                (int) (a.getRed() + (b.getRed() - a.getRed()) * t),
                (int) (a.getGreen() + (b.getGreen() - a.getGreen()) * t),
                (int) (a.getBlue() + (b.getBlue() - a.getBlue()) * t));
    }

    /** Кнопка со скруглёнными углами и подсветкой при наведении и нажатии. */
    static class Key extends JButton {
        private final Color base;
        Key(String text, Color base, Color fg, int fontSize) {
            super(text);
            this.base = base;
            setFont(new Font(FONT, Font.PLAIN, fontSize));
            setForeground(fg);
            setContentAreaFilled(false);
            setBorderPainted(false);
            setFocusPainted(false);
            setFocusable(false);
            setOpaque(false);
            setRolloverEnabled(true);
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            setMargin(new Insets(0, 0, 0, 0));
        }
        @Override protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            Color c = base;
            if (getModel().isPressed()) c = mix(base, Color.WHITE, 0.22);
            else if (getModel().isRollover()) c = mix(base, Color.WHITE, 0.08);
            g2.setColor(c);
            int arc = Math.min(getHeight(), 22);
            g2.fillRoundRect(0, 0, getWidth(), getHeight(), arc, arc);
            g2.dispose();
            super.paintComponent(g);
        }
    }

    // ======================================================================
    //  ОКНО
    // ======================================================================

    private final Engine engine = new Engine();
    private final JLabel memLabel = new JLabel(" ");
    private final JLabel topLabel = new JLabel(" ", SwingConstants.RIGHT);
    private final JLabel mainLabel = new JLabel("0", SwingConstants.RIGHT);
    private final JLabel previewLabel = new JLabel(" ", SwingConstants.RIGHT);
    private final DefaultListModel<String[]> historyModel = new DefaultListModel<>();
    private final JPanel historyPanel = new JPanel(new BorderLayout());
    private final JPanel display = new JPanel();
    private final JLabel toast = new JLabel(" ", SwingConstants.LEFT);
    private Timer toastTimer;

    public Calculator() {
        super("Калькулятор");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        HistoryStore.load(engine.history);

        JPanel calc = new JPanel(new BorderLayout(0, 10));
        calc.setBackground(BG);
        calc.setBorder(new EmptyBorder(14, 14, 14, 14));
        calc.add(buildDisplay(), BorderLayout.NORTH);
        calc.add(buildKeys(), BorderLayout.CENTER);

        buildHistory();
        historyPanel.setVisible(false);

        JPanel root = new JPanel(new BorderLayout());
        root.setBackground(BG);
        root.add(calc, BorderLayout.CENTER);
        root.add(historyPanel, BorderLayout.EAST);
        setContentPane(root);

        installKeyboard();
        refresh();

        setSize(400, 640);
        setMinimumSize(new Dimension(340, 560));
        setLocationRelativeTo(null);
    }

    private JPanel buildDisplay() {
        display.setLayout(new BoxLayout(display, BoxLayout.Y_AXIS));
        display.setBackground(PANEL);
        display.setBorder(new EmptyBorder(12, 16, 14, 16));

        JPanel bar = new JPanel(new BorderLayout());
        bar.setOpaque(false);
        memLabel.setFont(new Font(FONT, Font.BOLD, 12));
        memLabel.setForeground(ACCENT);
        toast.setFont(new Font(FONT, Font.PLAIN, 12));
        toast.setForeground(TEXT_DIM);
        JPanel left = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        left.setOpaque(false);
        left.add(memLabel);
        left.add(Box.createHorizontalStrut(10));
        left.add(toast);
        Key hist = new Key("История", KEY_FN, TEXT_DIM, 12);
        hist.setPreferredSize(new Dimension(84, 26));
        hist.setToolTipText("История вычислений (Cmd/Ctrl+H)");
        hist.addActionListener(e -> toggleHistory());
        bar.add(left, BorderLayout.WEST);
        bar.add(hist, BorderLayout.EAST);
        bar.setAlignmentX(Component.RIGHT_ALIGNMENT);
        bar.setMaximumSize(new Dimension(Integer.MAX_VALUE, 28));

        topLabel.setFont(new Font(FONT, Font.PLAIN, 16));
        topLabel.setForeground(TEXT_DIM);
        mainLabel.setFont(new Font(FONT, Font.PLAIN, 48));
        mainLabel.setForeground(TEXT);
        mainLabel.setToolTipText("Нажмите, чтобы скопировать");
        mainLabel.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        mainLabel.addMouseListener(new MouseAdapter() {
            @Override public void mouseClicked(MouseEvent e) { copyResult(); }
        });
        previewLabel.setFont(new Font(FONT, Font.PLAIN, 20));
        previewLabel.setForeground(TEXT_DIM);

        for (JLabel l : new JLabel[]{topLabel, mainLabel, previewLabel}) {
            l.setAlignmentX(Component.RIGHT_ALIGNMENT);
            l.setMaximumSize(new Dimension(Integer.MAX_VALUE, l.getPreferredSize().height + 8));
        }

        display.add(bar);
        display.add(Box.createVerticalStrut(18));
        display.add(topLabel);
        display.add(Box.createVerticalStrut(2));
        display.add(mainLabel);
        display.add(previewLabel);

        JPanel wrap = new JPanel(new BorderLayout()) {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(PANEL);
                g2.fillRoundRect(0, 0, getWidth(), getHeight(), 24, 24);
                g2.dispose();
            }
        };
        wrap.setOpaque(false);
        display.setOpaque(false);
        wrap.add(display);
        return wrap;
    }

    private JPanel buildKeys() {
        JPanel keys = new JPanel(new BorderLayout(0, 8));
        keys.setOpaque(false);

        JPanel mem = new JPanel(new GridLayout(1, 4, 8, 0));
        mem.setOpaque(false);
        for (String k : new String[]{"MC", "MR", "M+", "M−"}) {
            Key b = new Key(k, BG, TEXT_DIM, 14);
            b.setPreferredSize(new Dimension(10, 30));
            b.addActionListener(e -> press(k));
            mem.add(b);
        }

        String[][] layout = {
                {"C",   "(",  ")",  "%", "÷"},
                {"√",   "7",  "8",  "9", "×"},
                {"x²",  "4",  "5",  "6", "−"},
                {"1/x", "1",  "2",  "3", "+"},
                {"±",   "0",  ".",  "⌫", "="},
        };
        JPanel grid = new JPanel(new GridLayout(5, 5, 8, 8));
        grid.setOpaque(false);
        for (String[] row : layout) for (String k : row) {
            Key b;
            if (k.equals("="))                 b = new Key(k, ACCENT, new Color(0x1B1B1B), 26);
            else if ("÷×−+".contains(k))       b = new Key(k, KEY_OP, TEXT_OP, 26);
            else if (k.equals("C"))            b = new Key(k, KEY_FN, DANGER, 20);
            else if (k.matches("[0-9.]"))      b = new Key(k, KEY, TEXT, 24);
            else                               b = new Key(k, KEY_FN, TEXT_DIM, 18);
            b.addActionListener(e -> press(k));
            grid.add(b);
        }

        keys.add(mem, BorderLayout.NORTH);
        keys.add(grid, BorderLayout.CENTER);
        return keys;
    }

    private void buildHistory() {
        historyPanel.setBackground(PANEL);
        historyPanel.setPreferredSize(new Dimension(260, 10));
        historyPanel.setBorder(new EmptyBorder(14, 12, 14, 12));

        JLabel title = new JLabel("История");
        title.setFont(new Font(FONT, Font.BOLD, 15));
        title.setForeground(TEXT);
        Key clearBtn = new Key("Очистить", KEY_FN, TEXT_DIM, 12);
        clearBtn.setPreferredSize(new Dimension(84, 26));
        clearBtn.addActionListener(e -> {
            engine.history.clear();
            HistoryStore.save(engine.history);
            syncHistory();
        });
        JPanel head = new JPanel(new BorderLayout());
        head.setOpaque(false);
        head.setBorder(new EmptyBorder(0, 0, 10, 0));
        head.add(title, BorderLayout.WEST);
        head.add(clearBtn, BorderLayout.EAST);

        JList<String[]> list = new JList<>(historyModel);
        list.setBackground(PANEL);
        list.setSelectionBackground(KEY);
        list.setCellRenderer((l, item, idx, sel, focus) -> {
            JPanel p = new JPanel(new GridLayout(2, 1));
            p.setBorder(new EmptyBorder(8, 8, 8, 8));
            p.setBackground(sel ? KEY : PANEL);
            JLabel a = new JLabel(pretty(item[0]) + " =", SwingConstants.RIGHT);
            a.setFont(new Font(FONT, Font.PLAIN, 13));
            a.setForeground(TEXT_DIM);
            JLabel b = new JLabel(pretty(item[1]), SwingConstants.RIGHT);
            b.setFont(new Font(FONT, Font.BOLD, 18));
            b.setForeground(TEXT);
            p.add(a);
            p.add(b);
            return p;
        });
        list.setToolTipText("Нажмите, чтобы вставить результат");
        list.addMouseListener(new MouseAdapter() {
            @Override public void mouseClicked(MouseEvent e) {
                int idx = list.locationToIndex(e.getPoint());
                if (idx < 0) return;
                String r = historyModel.get(idx)[1];
                engine.expr = r.startsWith("−") ? r : r;
                engine.justEvaluated = true;
                engine.error = null;
                engine.lastExpr = historyModel.get(idx)[0];
                refresh();
            }
        });
        JScrollPane sp = new JScrollPane(list);
        sp.setBorder(null);
        sp.getViewport().setBackground(PANEL);

        JLabel empty = new JLabel("Пока пусто", SwingConstants.CENTER);
        empty.setForeground(TEXT_DIM);

        historyPanel.add(head, BorderLayout.NORTH);
        historyPanel.add(sp, BorderLayout.CENTER);
        syncHistory();
    }

    private void syncHistory() {
        historyModel.clear();
        for (String[] h : engine.history) historyModel.addElement(h);
    }

    private void toggleHistory() {
        boolean show = !historyPanel.isVisible();
        historyPanel.setVisible(show);
        setSize(getWidth() + (show ? 260 : -260), getHeight());
        revalidate();
    }

    private void press(String k) {
        int before = engine.history.size();
        engine.input(k);
        if (engine.history.size() != before) {
            HistoryStore.save(engine.history);
            syncHistory();
        }
        refresh();
    }

    /** Разделяем разряды в числах: 1234567.89 → 1 234 567.89 */
    static String pretty(String s) {
        Matcher m = Pattern.compile("\\d{4,}").matcher(s);
        StringBuilder out = new StringBuilder();
        int lastEnd = 0;
        while (m.find()) {
            boolean afterDot = m.start() > 0 && s.charAt(m.start() - 1) == '.';
            boolean exponent = m.start() > 0 && s.charAt(m.start() - 1) == 'e';
            out.append(s, lastEnd, m.start());
            String digits = m.group();
            if (afterDot || exponent) out.append(digits);
            else {
                StringBuilder g = new StringBuilder();
                for (int k = 0; k < digits.length(); k++) {
                    if (k > 0 && (digits.length() - k) % 3 == 0) g.append(' ');
                    g.append(digits.charAt(k));
                }
                out.append(g);
            }
            lastEnd = m.end();
        }
        out.append(s.substring(lastEnd));
        return out.toString();
    }

    private void refresh() {
        memLabel.setText(engine.memory != null ? "M  " + pretty(Engine.format(engine.memory)) : " ");

        if (engine.error != null) {
            topLabel.setText(pretty(engine.lastExpr) + " =");
            mainLabel.setText(engine.error);
            mainLabel.setForeground(DANGER);
            previewLabel.setText(" ");
        } else {
            mainLabel.setForeground(TEXT);
            topLabel.setText(engine.justEvaluated && !engine.lastExpr.isEmpty() ? pretty(engine.lastExpr) + " =" : " ");
            mainLabel.setText(engine.expr.isEmpty() ? "0" : pretty(engine.expr));
            String p = engine.preview();
            previewLabel.setText(p != null ? "= " + pretty(p) : " ");
        }
        fitMainFont();
    }

    /** Уменьшаем шрифт, если число не помещается по ширине. */
    private void fitMainFont() {
        int avail = Math.max(display.getWidth() - 40, 300);
        int size = engine.error != null ? 28 : 48;
        Font f = new Font(FONT, Font.PLAIN, size);
        FontMetrics fm = mainLabel.getFontMetrics(f);
        while (size > 18 && fm.stringWidth(mainLabel.getText()) > avail) {
            size -= 2;
            f = new Font(FONT, Font.PLAIN, size);
            fm = mainLabel.getFontMetrics(f);
        }
        mainLabel.setFont(f);
        topLabel.setText(clip(topLabel.getText(), topLabel, avail));
    }

    private static String clip(String text, JLabel l, int width) {
        FontMetrics fm = l.getFontMetrics(l.getFont());
        if (fm.stringWidth(text) <= width) return text;
        String t = text;
        while (t.length() > 1 && fm.stringWidth("…" + t) > width) t = t.substring(1);
        return "…" + t;
    }

    private void copyResult() {
        BigDecimal v = engine.currentValue();
        String text = v != null ? Engine.format(v).replace('−', '-') : "0";
        try {
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(text), null);
            showToast("Скопировано: " + text);
        } catch (Exception ex) {
            showToast("Не удалось скопировать");
        }
    }

    private void pasteExpression() {
        try {
            String t = (String) Toolkit.getDefaultToolkit().getSystemClipboard().getData(DataFlavor.stringFlavor);
            for (char ch : t.toCharArray()) {
                String k = mapChar(ch);
                if (k != null && !k.equals("=")) engine.input(k);
            }
            refresh();
            showToast("Вставлено");
        } catch (Exception ex) {
            showToast("В буфере нет текста");
        }
    }

    private void showToast(String text) {
        toast.setText(text);
        if (toastTimer != null) toastTimer.stop();
        toastTimer = new Timer(1800, e -> toast.setText(" "));
        toastTimer.setRepeats(false);
        toastTimer.start();
    }

    static String mapChar(char ch) {
        if (Character.isDigit(ch)) return String.valueOf(ch);
        switch (ch) {
            case '.': case ',': return ".";
            case '+': return "+";
            case '-': case '−': return "−";
            case '*': case 'x': case 'X': case '×': return "×";
            case '/': case ':': case '÷': return "÷";
            case '(': return "(";
            case ')': return ")";
            case '%': return "%";
            case '^': case '²': return "²";
            case 'r': case 'R': case '√': return "√";
            case '=': case '\n': case '\r': return "=";
            default: return null;
        }
    }

    private void installKeyboard() {
        KeyboardFocusManager.getCurrentKeyboardFocusManager().addKeyEventDispatcher(e -> {
            if (!isActive()) return false;
            boolean cmd = e.isMetaDown() || e.isControlDown();
            if (e.getID() == KeyEvent.KEY_PRESSED) {
                if (cmd && e.getKeyCode() == KeyEvent.VK_C) { copyResult(); return true; }
                if (cmd && e.getKeyCode() == KeyEvent.VK_V) { pasteExpression(); return true; }
                if (cmd && e.getKeyCode() == KeyEvent.VK_H) { toggleHistory(); return true; }
                if (e.getKeyCode() == KeyEvent.VK_BACK_SPACE) { press("⌫"); return true; }
                if (e.getKeyCode() == KeyEvent.VK_ESCAPE || e.getKeyCode() == KeyEvent.VK_DELETE) { press("C"); return true; }
                if (e.getKeyCode() == KeyEvent.VK_ENTER) { press("="); return true; }
            }
            if (e.getID() == KeyEvent.KEY_TYPED && !cmd) {
                char ch = e.getKeyChar();
                if (ch == '\n' || ch == '\r' || ch == '\b') return true;
                String k = mapChar(ch);
                if (k != null) { press(k); return true; }
            }
            return false;
        });
    }

    // ======================================================================
    //  ТЕСТЫ
    // ======================================================================

    private static int passed = 0, failed = 0;

    /** keys — нажатия через пробел. Проверяется то, что показано на главной строке. */
    private static void check(String name, String expected, String keys) {
        Engine e = new Engine();
        for (String k : keys.trim().split("\\s+")) e.input(k);
        String got = e.error != null ? e.error : e.expr;
        boolean ok = got.equals(expected);
        if (ok) passed++; else failed++;
        System.out.printf("%s  %-34s ожидалось: %-24s получено: %s%n", ok ? "PASS" : "FAIL", name, expected, got);
    }

    private static void checkTrue(String name, boolean cond) {
        if (cond) passed++; else failed++;
        System.out.printf("%s  %s%n", cond ? "PASS" : "FAIL", name);
    }

    private static void runTests() {
        System.out.println("— Арифметика и приоритеты");
        check("2 + 3 × 4 (сначала умножение)", "14", "2 + 3 × 4 =");
        check("(2 + 3) × 4", "20", "( 2 + 3 ) × 4 =");
        check("10 − 4 − 3 (слева направо)", "3", "1 0 − 4 − 3 =");
        check("100 ÷ 4 ÷ 5", "5", "1 0 0 ÷ 4 ÷ 5 =");
        check("0.1 + 0.2 (точность)", "0.3", ". 1 + . 2 =");
        check("1 ÷ 3 × 3", "1", "1 ÷ 3 × 3 =");
        check("1 ÷ 3", "0.333333333333", "1 ÷ 3 =");
        check("Минус после ×: 5 × −2", "−10", "5 × − 2 =");
        check("Унарный минус в начале: −5 + 2", "−3", "− 5 + 2 =");

        System.out.println("— Функции");
        check("√16", "4", "√ 1 6 =");
        check("√2", "1.41421356237", "√ 2 =");
        check("5²", "25", "5 x² =");
        check("−3² = −9 (как в математике)", "−9", "− 3 x² =");
        check("(−3)² = 9", "9", "( − 3 ) x² =");
        check("50%", "0.5", "5 0 % =");
        check("1/x от 4", "0.25", "4 1/x");
        check("Скобка без закрытия считается", "5", "( 2 + 3 =");
        check("Неявное умножение 2(3)", "6", "2 ( 3 ) =");

        System.out.println("— Ошибки");
        check("Деление на ноль", "Деление на ноль", "1 ÷ 0 =");
        check("Корень из отрицательного", "Корень из отрицательного", "√ ( − 4 ) =");
        check("После ошибки можно считать дальше", "7", "1 ÷ 0 = 7");

        System.out.println("— Ввод");
        check("Две точки в числе", "1.5", "1 . . 5");
        check("Ведущий ноль заменяется", "7", "0 7");
        check("Замена оператора + на ×", "2×", "2 + ×");
        check("Висящий оператор игнорируется", "2", "2 + =");
        check("Backspace", "12", "1 2 3 ⌫");
        check("± для числа", "−9", "9 ±");
        check("± дважды", "9", "9 ± ±");
        check("± для второго числа: 5 + (−3)", "2", "5 + 3 ± =");
        check("Продолжение после =: 2 = + 3 =", "5", "2 + 0 = + 3 =");
        check("Новое число после =", "7", "2 + 2 = 7");
        check("Лимит 15 цифр", "123456789012345", "1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7");
        check("Большие числа", "9.9999998e15", "9 9 9 9 9 9 9 9 × 9 9 9 9 9 9 9 9 =");

        System.out.println("— Память");
        check("5 M+, 3 M+, MR", "8", "5 M+ C 3 M+ C MR =");
        check("10 M+, 4 M−, MR", "6", "1 0 M+ C 4 M− C MR =");
        check("MC очищает память", "0", "5 M+ MC C MR 0");

        System.out.println("— Кэш и история");
        Engine e = new Engine();
        for (String k : "2 + 2 =".split(" ")) e.input(k);
        e.input("C");
        for (String k : "2 + 2 =".split(" ")) e.input(k);
        checkTrue("Повторное выражение берётся из кэша (попаданий: " + e.cache.hits + ")", e.cache.hits >= 1);
        checkTrue("В истории 2 записи", e.history.size() == 2 && e.history.get(0)[1].equals("4"));
        checkTrue("Предпросмотр во время ввода: 2+3× → 5", previewOf("2 + 3 ×").equals("5"));
        checkTrue("Предпросмотр: (1+2 → 3", previewOf("( 1 + 2").equals("3"));
        checkTrue("Разделение разрядов: 1234567.8901", pretty("1234567.8901").equals("1 234 567.8901"));

        System.out.printf("%nПройдено: %d, ошибок: %d%n", passed, failed);
        System.out.println(failed == 0 ? "Все проверки пройдены." : "Есть ошибки.");
        System.exit(failed == 0 ? 0 : 1);
    }

    private static String previewOf(String keys) {
        Engine e = new Engine();
        for (String k : keys.split(" ")) e.input(k);
        String p = e.preview();
        return p == null ? "" : p;
    }

    public static void main(String[] args) {
        if (args.length > 0 && args[0].equals("--test")) { runTests(); return; }
        System.setProperty("awt.useSystemAAFontSettings", "on");
        System.setProperty("apple.awt.application.name", "Калькулятор");
        SwingUtilities.invokeLater(() -> new Calculator().setVisible(true));
    }
}
