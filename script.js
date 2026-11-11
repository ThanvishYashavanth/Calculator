
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const angleModeDisplay = document.getElementById("angleMode");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let history = [];

const operators = ["+", "-", "*", "/", "^"];

function updateDisplay() {
    expressionDisplay.textContent = expression || " ";
    angleModeDisplay.textContent = angleMode;
}

function insertValue(value) {
    if (resultDisplay.textContent === "Error" && !expression) {
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

function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > 170) {
        throw new Error("Invalid factorial");
    }

    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function tokenize(input) {
    const tokens = [];
    const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?|([A-Za-z]+)|(\.\.\.|.) )/y;

    let i = 0;

    while (i < input.length) {
        if (/\s/.test(input[i])) {
            i++;
            continue;
        }

        const remaining = input.slice(i);
        const numberMatch = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);

        if (numberMatch) {
            tokens.push({ type: "number", value: Number(numberMatch[0]) });
            i += numberMatch[0].length;
            continue;
        }

        const wordMatch = remaining.match(/^[A-Za-z]+/);

        if (wordMatch) {
            tokens.push({ type: "word", value: wordMatch[0].toLowerCase() });
            i += wordMatch[0].length;
            continue;
        }

        const char = input[i];

        if ("+-*/^()%!".includes(char)) {
            tokens.push({ type: char, value: char });
            i++;
            continue;
        }

        throw new Error("Invalid character");
    }

    return tokens;
}

function evaluate(input) {
    const tokens = tokenize(input);
    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume(type) {
        const token = peek();
        if (!token || token.type !== type) {
            throw new Error("Unexpected expression");
        }
        position++;
        return token;
    }

    function parseExpression() {
        let value = parseTerm();

        while (peek() && ["+", "-"].includes(peek().type)) {
            const operator = tokens[position++].type;
            const right = parseTerm();
            value = operator === "+" ? value + right : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (peek() && ["*", "/", "%"].includes(peek().type)) {
            const operator = tokens[position++].type;
            const right = parseUnary();

            if (operator === "/" && right === 0) {
                throw new Error("Division by zero");
            }

            if (operator === "*") value *= right;
            if (operator === "/") value /= right;
            if (operator === "%") value %= right;
        }

        return value;
    }

    function parseUnary() {
        if (peek() && peek().type === "+") {
            position++;
            return parseUnary();
        }

        if (peek() && peek().type === "-") {
            position++;
            return -parseUnary();
        }

        return parsePower();
    }

    function parsePower() {
        let value = parsePostfix();

        if (peek() && peek().type === "^") {
            position++;
            value = Math.pow(value, parseUnary());
        }

        return value;
    }

    function parsePostfix() {
        let value = parsePrimary();

        while (peek() && peek().type === "!") {
            position++;
            value = factorial(value);
        }

        return value;
    }

    function parsePrimary() {
        const token = peek();

        if (!token) throw new Error("Incomplete expression");

        if (token.type === "number") {
            position++;
            return token.value;
        }

        if (token.type === "(") {
            position++;
            const value = parseExpression();
            consume(")");
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

            if (!functions[name]) throw new Error("Unknown function");

            consume("(");
            const argument = parseExpression();
            consume(")");

            if (name === "sin" || name === "cos" || name === "tan") {
                const angle = angleMode === "DEG"
                    ? argument * Math.PI / 180
                    : argument;

                return functions[name](angle);
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

    if (tokens.length === 0) return 0;

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
            expression,
            result: formatted
        });

        history = history.slice(0, 10);
        renderHistory();
        expression = formatted;
        updateDisplay();
    } catch (error) {
        resultDisplay.textContent = "Error";
    }
}

function renderHistory() {
    if (!history.length) {
        historyList.innerHTML = '<p class="empty-history">Your calculations will appear here.</p>';
        return;
    }

    historyList.innerHTML = "";

    history.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";

        const expressionText = document.createElement("span");
        expressionText.textContent = item.expression + " =";

        const resultText = document.createElement("span");
        resultText.textContent = item.result;

        row.append(expressionText, resultText);
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
                button.textContent = angleMode;
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
    if (/^[0-9.]$/.test(event.key)) {
        insertValue(event.key);
    } else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(event.key)) {
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
