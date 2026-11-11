
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const angleModeDisplay = document.getElementById("angleMode");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let history = [];

function updateDisplay() {
    expressionDisplay.textContent = expression || "";
    angleModeDisplay.textContent = angleMode;

    const angleButton = document.querySelector('[data-action="angle"]');
    if (angleButton) angleButton.textContent = angleMode;
}

function insertValue(value) {
    if (resultDisplay.textContent === "Error") {
        resultDisplay.textContent = "0";
    }

    expression += value;
    updateDisplay();
}

function clearAll() {
    expression = "";
    resultDisplay.textContent = "0";
    updateDisplay();
}

function deleteLast() {
    expression = expression.slice(0, -1);
    updateDisplay();
}

function factorial(number) {
    if (!Number.isInteger(number) || number < 0 || number > 170) {
        throw new Error("Invalid factorial");
    }

    let answer = 1;

    for (let i = 2; i <= number; i++) {
        answer *= i;
    }

    return answer;
}

function tokenize(input) {
    const tokens = [];
    let index = 0;

    while (index < input.length) {
        const remaining = input.slice(index);

        if (/^\s/.test(remaining)) {
            index++;
            continue;
        }

        const number = remaining.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);

        if (number) {
            tokens.push({ type: "number", value: Number(number[0]) });
            index += number[0].length;
            continue;
        }

        const word = remaining.match(/^[a-z]+/i);

        if (word) {
            tokens.push({ type: "word", value: word[0].toLowerCase() });
            index += word[0].length;
            continue;
        }

        const character = input[index];

        if ("+-*/^()%!".includes(character)) {
            tokens.push({ type: character, value: character });
            index++;
            continue;
        }

        throw new Error("Invalid character");
    }

    // Add implicit multiplication, such as 2pi, 2(3+4), and 2sin(30).
    const expanded = [];

    for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];
        const previous = expanded[expanded.length - 1];

        if (
            previous &&
            (
                previous.type === "number" ||
                previous.type === ")" ||
                previous.type === "!"
            ) &&
            (
                current.type === "(" ||
                current.type === "word"
            )
        ) {
            expanded.push({ type: "*", value: "*" });
        }

        expanded.push(current);
    }

    return expanded;
}

function evaluate(input) {
    const tokens = tokenize(input);
    let position = 0;

    function peek() {
        return tokens[position];
    }

    function match(type) {
        if (peek() && peek().type === type) {
            position++;
            return true;
        }

        return false;
    }

    function require(type) {
        if (!match(type)) {
            throw new Error("Incomplete expression");
        }
    }

    function parseExpression() {
        let value = parseTerm();

        while (peek() && ["+", "-"].includes(peek().type)) {
            const operator = tokens[position++].type;
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (peek() && ["*", "/", "%"].includes(peek().type)) {
            const operator = tokens[position++].type;
            const right = parseUnary();

            if ((operator === "/" || operator === "%") && right === 0) {
                throw new Error("Division by zero");
            }

            if (operator === "*") value *= right;
            if (operator === "/") value /= right;
            if (operator === "%") value %= right;
        }

        return value;
    }

    function parseUnary() {
        if (match("+")) return parseUnary();
        if (match("-")) return -parseUnary();

        return parsePower();
    }

    function parsePower() {
        const base = parsePostfix();

        if (match("^")) {
            return Math.pow(base, parseUnary());
        }

        return base;
    }

    function parsePostfix() {
        let value = parsePrimary();

        while (peek() && (peek().type === "!" || peek().type === "%")) {
            const operator = tokens[position++].type;

            value = operator === "!"
                ? factorial(value)
                : value / 100;
        }

        return value;
    }

    function parsePrimary() {
        const token = peek();

        if (!token) {
            throw new Error("Incomplete expression");
        }

        if (token.type === "number") {
            position++;
            return token.value;
        }

        if (match("(")) {
            const value = parseExpression();
            require(")");
            return value;
        }

        if (token.type === "word") {
            position++;
            const name = token.value;

            if (name === "pi") return Math.PI;
            if (name === "e") return Math.E;
            if (name === "ans") return lastAnswer;

            const functions = {
                sin: Math.sin,
                cos: Math.cos,
                tan: Math.tan,
                sqrt: Math.sqrt,
                log: Math.log10,
                ln: Math.log
            };

            if (!functions[name]) {
                throw new Error("Unknown function");
            }

            require("(");
            const argument = parseExpression();
            require(")");

            if (name === "sin" || name === "cos" || name === "tan") {
                const angle = angleMode === "DEG"
                    ? argument * Math.PI / 180
                    : argument;

                if (name === "tan" && Math.abs(Math.cos(angle)) < 1e-12) {
                    throw new Error("Undefined tangent");
                }

                const result = functions[name](angle);

                return Math.abs(result) < 1e-12 ? 0 : result;
            }

            if (name === "sqrt" && argument < 0) {
                throw new Error("Invalid square root");
            }

            if ((name === "log" || name === "ln") && argument <= 0) {
                throw new Error("Invalid logarithm");
            }

            return functions[name](argument);
        }

        throw new Error("Invalid expression");
    }

    if (!tokens.length) return 0;

    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
        throw new Error("Invalid calculation");
    }

    return result;
}

function formatNumber(number) {
    if (Object.is(number, -0)) number = 0;

    return Number(number.toPrecision(12)).toString();
}

function calculate() {
    if (!expression.trim()) return;

    try {
        const answer = evaluate(expression);
        const formatted = formatNumber(answer);

        resultDisplay.textContent = formatted;
        lastAnswer = answer;

        history.unshift({
            expression: expression,
            result: formatted
        });

        history = history.slice(0, 10);
        renderHistory();

        expression = formatted;
        updateDisplay();
    } catch (error) {
        resultDisplay.textContent = "Error";
        console.error("Calculator error:", error);
    }
}

function renderHistory() {
    historyList.replaceChildren();

    if (!history.length) {
        const empty = document.createElement("p");
        empty.className = "empty-history";
        empty.textContent = "Your calculations will appear here.";
        historyList.appendChild(empty);
        return;
    }

    history.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";

        const left = document.createElement("span");
        left.textContent = item.expression + " =";

        const right = document.createElement("span");
        right.textContent = item.result;

        row.append(left, right);
        historyList.appendChild(row);
    });
}

document.querySelectorAll(".key").forEach(button => {
    button.addEventListener("click", () => {
        const value = button.dataset.value;
        const action = button.dataset.action;

        if (value !== undefined) {
            insertValue(value);
            return;
        }

        switch (action) {
            case "clear":
                clearAll();
                break;

            case "delete":
                deleteLast();
                break;

            case "calculate":
                calculate();
                break;

            case "angle":
                angleMode = angleMode === "DEG" ? "RAD" : "DEG";
                updateDisplay();
                break;

            case "ans":
                insertValue("ans");
                break;
        }
    });
});

document.getElementById("historyToggle").addEventListener("click", () => {
    historyPanel.classList.toggle("hidden");
});

document.getElementById("clearHistory").addEventListener("click", () => {
    history = [];
    renderHistory();
});

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (/^[0-9.]$/.test(event.key)) {
        insertValue(event.key);
    } else if ("+-*/^()%!".includes(event.key)) {
        insertValue(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculate();
    } else if (event.key === "Backspace") {
        deleteLast();
    } else if (event.key === "Escape") {
        clearAll();
    }
});

updateDisplay();
renderHistory();
