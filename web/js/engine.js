// Движок калькулятора — порт Calculator.Engine из Java (src/main/java/Calculator.java).
// Точная десятичная арифметика на BigInt: 0.1 + 0.2 = 0.3, деление и корень — 34 значащие цифры,
// вывод — 12 значащих цифр, как в десктопной версии. Работает и в браузере, и в Node (автотесты).

// ---------------------------------------------------------------- Decimal
const TEN = 10n;
const pow10 = (n) => TEN ** BigInt(n);
const digitsOf = (x) => (x < 0n ? -x : x).toString().length;
const PREC = 34;

export class Dec {
  constructor(m, s = 0) { this.m = BigInt(m); this.s = s; } // значение = m × 10^(−s)

  static of(str) {
    str = String(str).trim().replace('−', '-');
    const sci = str.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!sci || (sci[2] === '' && (sci[3] ?? '') === '')) throw new Error('bad number ' + str);
    const [, sign, int, frac = '', exp = '0'] = sci;
    let m = BigInt((int || '0') + frac);
    if (sign === '-') m = -m;
    return new Dec(m, frac.length - Number(exp));
  }

  get sign() { return this.m > 0n ? 1 : this.m < 0n ? -1 : 0; }
  neg() { return new Dec(-this.m, this.s); }
  abs() { return this.m < 0n ? this.neg() : this; }

  static align(a, b) {
    const s = Math.max(a.s, b.s);
    return [a.m * pow10(s - a.s), b.m * pow10(s - b.s), s];
  }
  add(b) { const [x, y, s] = Dec.align(this, b); return new Dec(x + y, s).round(PREC, 'even'); }
  sub(b) { return this.add(b.neg()); }
  mul(b) { return new Dec(this.m * b.m, this.s + b.s).round(PREC, 'even'); }
  cmp(b) { const [x, y] = Dec.align(this, b); return x < y ? -1 : x > y ? 1 : 0; }

  div(b) {
    if (b.m === 0n) throw new CalcError('Деление на ноль');
    if (this.m === 0n) return new Dec(0n, 0);
    // берём с запасом цифр, потом округляем до 34
    const extra = PREC + digitsOf(b.m) - digitsOf(this.m) + 3;
    const k = Math.max(extra, 0);
    const neg = (this.m < 0n) !== (b.m < 0n);
    const num = (this.m < 0n ? -this.m : this.m) * pow10(k);
    const den = b.m < 0n ? -b.m : b.m;
    // лишняя цифра «1» вместо остатка, чтобы округление знало, что дальше не ноль
    const q = (num / den) * 10n + (num % den === 0n ? 0n : 1n);
    return new Dec(neg ? -q : q, this.s - b.s + k + 1).round(PREC, 'even').strip();
  }

  sqrt() {
    if (this.m < 0n) throw new CalcError('Корень из отрицательного');
    if (this.m === 0n) return new Dec(0n, 0);
    // хотим ~PREC+2 цифр: m × 10^(2k) / 10^(s + 2k) → sqrt = isqrt(m×10^(2k+par)) / 10^((s+2k+par)/2)
    let k = PREC + 2 - Math.ceil(digitsOf(this.m) / 2);
    if (k < 0) k = 0;
    let shift = 2 * k;
    if ((this.s + shift) % 2 !== 0) shift += 1;
    const n = this.m * pow10(shift);
    let x = isqrt(n);
    const exact = x * x === n;
    x = x * 10n + (exact ? 0n : 1n); // липкий бит
    return new Dec(x, (this.s + shift) / 2 + 1).round(PREC, 'even').strip();
  }

  /** Округлить до p значащих цифр. mode: 'even' (HALF_EVEN) или 'up' (HALF_UP). */
  round(p, mode) {
    const d = digitsOf(this.m);
    if (this.m === 0n || d <= p) return this;
    const drop = d - p;
    const f = pow10(drop);
    const neg = this.m < 0n;
    const a = neg ? -this.m : this.m;
    let q = a / f;
    const r = a % f;
    const half = f / 2n;
    if (r > half || (r === half && (mode === 'up' || q % 2n === 1n))) q += 1n;
    return new Dec(neg ? -q : q, this.s - drop);
  }

  strip() {
    if (this.m === 0n) return new Dec(0n, 0);
    let m = this.m, s = this.s;
    while (m % 10n === 0n) { m /= 10n; s -= 1; }
    return new Dec(m, s);
  }

  /** Как BigDecimal.toPlainString(). */
  plain() {
    const neg = this.m < 0n;
    let a = (neg ? -this.m : this.m).toString();
    let out;
    if (this.s <= 0) out = a + '0'.repeat(-this.s);
    else {
      if (a.length <= this.s) a = '0'.repeat(this.s - a.length + 1) + a;
      out = a.slice(0, a.length - this.s) + '.' + a.slice(a.length - this.s);
    }
    return (neg ? '-' : '') + out;
  }

  /** Научная запись, как BigDecimal.toString() для таких чисел: 1.23456789012e15, 1e−10. */
  sci() {
    const neg = this.m < 0n;
    const a = (neg ? -this.m : this.m).toString();
    const exp = a.length - 1 - this.s;
    const mant = a.length === 1 ? a : a[0] + '.' + a.slice(1);
    return (neg ? '-' : '') + mant + 'e' + exp;
  }
}

function isqrt(n) {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  if (x === 0n) x = 1n;
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x - 1n && y <= x + 1n) {
      let r = y < x ? y : x;
      while (r * r > n) r -= 1n;
      while ((r + 1n) * (r + 1n) <= n) r += 1n;
      return r;
    }
    x = y;
  }
}

export class CalcError extends Error {}

// ---------------------------------------------------------------- Parser
export function evaluate(expr) {
  let i = 0;
  const peek = () => (i < expr.length ? expr[i] : '\0');
  const isDigit = (c) => c >= '0' && c <= '9';

  function e() {
    let v = term();
    for (;;) {
      const c = peek();
      if (c === '+') { i++; v = v.add(term()); }
      else if (c === '−' || c === '-') { i++; v = v.sub(term()); }
      else return v;
    }
  }
  function term() {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === '×' || c === '*') { i++; v = v.mul(unary()); }
      else if (c === '÷' || c === '/') {
        i++;
        const d = unary();
        if (d.sign === 0) throw new CalcError('Деление на ноль');
        v = v.div(d);
      } else return v;
    }
  }
  function unary() {
    const c = peek();
    if (c === '−' || c === '-') { i++; return unary().neg(); }
    if (c === '√') { i++; return unary().sqrt(); }
    return postfix();
  }
  function postfix() {
    let v = primary();
    for (;;) {
      const c = peek();
      if (c === '%') { i++; v = v.div(new Dec(100n, 0)); }
      else if (c === '²') { i++; v = v.mul(v); }
      else return v;
    }
  }
  function primary() {
    if (peek() === '(') {
      i++;
      const v = e();
      if (peek() !== ')') throw new CalcError('Не закрыта скобка');
      i++;
      return v;
    }
    const start = i;
    while (isDigit(peek()) || peek() === '.') i++;
    if (start === i) throw new CalcError('Ошибка в выражении');
    const num = expr.slice(start, i);
    if (num === '.' || (num.match(/\./g) || []).length > 1) throw new CalcError('Ошибка в выражении');
    return Dec.of(num.startsWith('.') ? '0' + num : num);
  }

  const v = e();
  if (i < expr.length) throw new CalcError('Ошибка в выражении');
  return v;
}

// ---------------------------------------------------------------- форматирование
const E15 = Dec.of('1e15');
const EM9 = Dec.of('1e-9');

/** 12 значащих цифр, без лишних нулей, минус как «−». */
export function format(v) {
  const r = v.round(12, 'up').strip();
  const abs = r.abs();
  let s;
  if (r.sign === 0) s = '0';
  else if (abs.cmp(E15) >= 0 || abs.cmp(EM9) < 0) s = r.sci();
  else s = r.plain();
  return s.replaceAll('-', '−');
}

/** Разделение разрядов: 1234567.89 → 1 234 567.89 (дробная часть и порядок — без пробелов). */
export function pretty(s, sep = ' ') {
  return s.replace(/\d{4,}/g, (digits, off) => {
    const prev = off > 0 ? s[off - 1] : '';
    if (prev === '.' || prev === 'e') return digits;
    let g = '';
    for (let k = 0; k < digits.length; k++) {
      if (k > 0 && (digits.length - k) % 3 === 0) g += sep;
      g += digits[k];
    }
    return g;
  });
}

/** Символ с клавиатуры или из буфера → кнопка калькулятора. */
export function mapChar(ch) {
  if (ch >= '0' && ch <= '9') return ch;
  const map = {
    '.': '.', ',': '.', '+': '+', '-': '−', '−': '−', '*': '×', 'x': '×', 'X': '×', '×': '×',
    '/': '÷', ':': '÷', '÷': '÷', '(': '(', ')': ')', '%': '%', '^': '²', '²': '²',
    'r': '√', 'R': '√', '√': '√', '=': '=', '\n': '=', '\r': '=',
  };
  return map[ch] ?? null;
}

// ---------------------------------------------------------------- LRU-кэш
class ResultCache {
  constructor(max = 256) { this.max = max; this.map = new Map(); this.hits = 0; }
  get(k) {
    if (!this.map.has(k)) return undefined;
    const v = this.map.get(k);
    this.map.delete(k); this.map.set(k, v);
    return v;
  }
  set(k, v) {
    this.map.delete(k); this.map.set(k, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
  }
  get size() { return this.map.size; }
}

// ---------------------------------------------------------------- Engine
const OPS = '+−×÷';
const LAST_NUMBER = /(\(−)?([0-9.]+)(\))?$/;

export class Engine {
  constructor() {
    this.expr = '';
    this.lastExpr = '';
    this.error = null;
    this.justEvaluated = false;
    this.memory = null;
    this.cache = new ResultCache();
    this.history = []; // [выражение, результат], новые сверху
  }

  input(key) {
    if (this.error != null) { this.clear(); if (key === 'C' || key === '⌫' || key === '=') return; }
    switch (key) {
      case 'C': return this.clear();
      case '⌫': return this.backspace();
      case '=': return this.equals();
      case '±': return this.negate();
      case '1/x': return this.reciprocal();
      case 'MC': this.memory = null; return;
      case 'MR': return this.memoryRecall();
      case 'M+': return this.memoryAdd(false);
      case 'M−': return this.memoryAdd(true);
      case '(': return this.openParen();
      case ')': return this.closeParen();
      case '√': return this.sqrt();
      case '%': return this.postfix('%');
      case '²': case 'x²': return this.postfix('²');
      case '+': case '−': case '×': case '÷': return this.operator(key);
      case '.': return this.dot();
      default:
        if (key.length === 1 && key >= '0' && key <= '9') this.digit(key);
    }
  }

  last() { return this.expr ? this.expr[this.expr.length - 1] : '\0'; }
  lastIsValue() { const c = this.last(); return (c >= '0' && c <= '9') || c === '.' || c === ')' || c === '%' || c === '²'; }
  currentNumber() { return (this.expr.match(/[0-9.]*$/) || [''])[0]; }
  startFreshIfEvaluated() { if (this.justEvaluated) { this.expr = ''; this.justEvaluated = false; } }
  continueIfEvaluated() { this.justEvaluated = false; }

  digit(d) {
    this.startFreshIfEvaluated();
    const c = this.last();
    if (c === ')' || c === '%' || c === '²') this.expr += '×';
    const num = this.currentNumber();
    if (num === '0') { this.expr = this.expr.slice(0, -1) + d; return; }
    if (num.replace('.', '').length >= 15) return;
    this.expr += d;
  }

  dot() {
    this.startFreshIfEvaluated();
    const c = this.last();
    if (c === ')' || c === '%' || c === '²') this.expr += '×';
    const num = this.currentNumber();
    if (num.includes('.')) return;
    this.expr += num === '' ? '0.' : '.';
  }

  operator(op) {
    this.continueIfEvaluated();
    const c = this.last();
    if (this.expr === '') { this.expr = op === '−' ? '−' : '0' + op; return; }
    if (c === '(') { if (op === '−') this.expr += '−'; return; }
    if (OPS.includes(c)) {
      if (op === '−' && (c === '×' || c === '÷')) { this.expr += '−'; return; }
      this.expr = this.expr.slice(0, -1);
      if (this.expr !== '' && OPS.includes(this.last())) this.expr = this.expr.slice(0, -1);
      if (this.expr === '') { this.expr = op === '−' ? '−' : ''; return; }
      if (this.last() === '(') { if (op === '−') this.expr += '−'; return; }
      this.expr += op;
      return;
    }
    if (c === '.') this.expr += '0';
    if (c === '√') return;
    this.expr += op;
  }

  openParen() { this.startFreshIfEvaluated(); if (this.lastIsValue()) this.expr += '×'; this.expr += '('; }

  closeParen() {
    this.continueIfEvaluated();
    const open = (this.expr.match(/\(/g) || []).length;
    const close = (this.expr.match(/\)/g) || []).length;
    if (open > close && this.lastIsValue()) this.expr += ')';
  }

  sqrt() { this.startFreshIfEvaluated(); if (this.lastIsValue()) this.expr += '×'; this.expr += '√'; }

  postfix(p) { this.continueIfEvaluated(); if (this.lastIsValue()) this.expr += p; }

  negate() {
    this.continueIfEvaluated();
    const m = this.expr.match(LAST_NUMBER);
    if (!m || !m[2]) return;
    const num = m[2];
    const start = m.index;
    if (m[1] && m[3]) { this.expr = this.expr.slice(0, start) + num; return; }
    const numStart = start + (m[1] ? m[1].length : 0);
    const before = this.expr.slice(0, numStart);
    if (before === '−') { this.expr = num; return; }
    if (before === '') { this.expr = '−' + num; return; }
    this.expr = before + '(−' + num + ')';
  }

  reciprocal() {
    this.continueIfEvaluated();
    const p = this.prepared();
    if (p == null) return;
    this.expr = '1÷(' + p + ')';
    this.equals();
  }

  backspace() {
    if (this.justEvaluated) { this.justEvaluated = false; return; }
    if (this.expr) this.expr = this.expr.slice(0, -1);
  }

  clear() { this.expr = ''; this.error = null; this.justEvaluated = false; this.lastExpr = ''; }

  memoryAdd(subtract) {
    const v = this.currentValue();
    if (v == null) return;
    if (this.memory == null) this.memory = new Dec(0n, 0);
    this.memory = subtract ? this.memory.sub(v) : this.memory.add(v);
  }

  memoryRecall() {
    if (this.memory == null) return;
    this.startFreshIfEvaluated();
    if (this.lastIsValue()) this.expr += '×';
    const v = format(this.memory);
    this.expr += v.startsWith('−') ? '(' + v + ')' : v;
  }

  prepared() {
    let e = this.expr;
    while (e && '+−×÷(√.'.includes(e[e.length - 1])) e = e.slice(0, -1);
    if (!e) return null;
    const open = (e.match(/\(/g) || []).length;
    const close = (e.match(/\)/g) || []).length;
    return e + ')'.repeat(Math.max(0, open - close));
  }

  compute(e) {
    const cached = this.cache.get(e);
    if (cached !== undefined) { this.cache.hits++; return cached; }
    const r = format(evaluate(e));
    this.cache.set(e, r);
    return r;
  }

  currentValue() {
    const p = this.prepared();
    if (p == null) return null;
    try { return Dec.of(this.compute(p)); } catch (ex) { if (ex instanceof CalcError) return null; throw ex; }
  }

  preview() {
    if (this.error != null || this.justEvaluated) return null;
    const p = this.prepared();
    if (p == null) return null;
    try {
      const r = this.compute(p);
      return r === this.expr ? null : r;
    } catch (ex) { if (ex instanceof CalcError) return null; throw ex; }
  }

  equals() {
    const p = this.prepared();
    if (p == null) return;
    try {
      const r = this.compute(p);
      if (r !== p) {
        this.history.unshift([p, r]);
        if (this.history.length > 200) this.history.pop();
      }
      this.lastExpr = p;
      this.expr = r;
      this.justEvaluated = true;
    } catch (ex) {
      if (!(ex instanceof CalcError)) throw ex;
      this.lastExpr = p;
      this.error = ex.message;
    }
  }

  /** То, что показано на главной строке экрана (как CalcSteps.display в Java-тестах). */
  display() {
    if (this.error != null) return this.error;
    return this.expr === '' ? '0' : this.expr;
  }

  press(keys) { for (const k of keys.trim().split(/\s+/)) this.input(k); return this; }
}
