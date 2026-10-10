
const passageElement = document.getElementById("passage");
const input = document.getElementById("typingInput");

const wpmElement = document.getElementById("wpm");
const accuracyElement = document.getElementById("accuracy");
const timeElement = document.getElementById("time");
const errorsElement = document.getElementById("errors");
const statusElement = document.getElementById("status");

const resultPanel = document.getElementById("result");
const modes = document.querySelectorAll(".mode");

const passages = [
    "Success comes from consistent practice and a willingness to learn from every mistake.",
    "Great developers solve problems, test ideas, and create useful solutions for people.",
    "Focus on accuracy before speed. Small improvements can lead to extraordinary results."
];

let duration = 30;
let remaining = duration;
let startedAt = null;
let timerId = null;
let running = false;
let finished = false;
let targetText = "";

function choosePassage() {
    targetText = passages[Math.floor(Math.random() * passages.length)];
    passageElement.replaceChildren();

    for (const character of targetText) {
        const span = document.createElement("span");
        span.textContent = character;
        passageElement.appendChild(span);
    }
}

function getStats() {
    const typed = input.value;
    let correct = 0;
    let errors = 0;

    for (let i = 0; i < typed.length; i++) {
        if (i < targetText.length && typed[i] === targetText[i]) {
            correct++;
        } else {
            errors++;
        }
    }

    const elapsed = startedAt
        ? Math.max((Date.now() - startedAt) / 1000, 0.001)
        : 0;

    const wpm = elapsed
        ? Math.round((correct / 5) / (elapsed / 60))
        : 0;

    const accuracy = typed.length
        ? Math.round(correct / typed.length * 100)
        : 100;

    return { typed, correct, errors, wpm, accuracy };
}

// Convert a passage into individual words.
function getWords(text) {
    return text.match(/[a-zA-Z0-9']+/g) || [];
}

// Compare typed words with the original passage.
function compareWords(originalText, typedText) {
    const expected = getWords(originalText);
    const actual = getWords(typedText);

    const m = expected.length;
    const n = actual.length;

    // Build an edit-distance table.
    const dp = Array.from(
        { length: m + 1 },
        () => Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (expected[i - 1].toLowerCase() === actual[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j - 1], // Wrong word
                    dp[i][j - 1],     // Extra word
                    dp[i - 1][j]      // Missed word
                );
            }
        }
    }

    const wrong = [];
    const extra = [];
    const missed = [];

    let i = m;
    let j = n;

    // Trace back to identify the errors.
    while (i > 0 || j > 0) {
        if (
            i > 0 && j > 0 &&
            expected[i - 1].toLowerCase() === actual[j - 1].toLowerCase()
        ) {
            i--;
            j--;
        } else if (
            i > 0 && j > 0 &&
            dp[i][j] === dp[i - 1][j - 1] + 1
        ) {
            wrong.unshift({
                typed: actual[j - 1],
                expected: expected[i - 1]
            });
            i--;
            j--;
        } else if (
            j > 0 &&
            dp[i][j] === dp[i][j - 1] + 1
        ) {
            extra.unshift(actual[j - 1]);
            j--;
        } else {
            missed.unshift(expected[i - 1]);
            i--;
        }
    }

    return { wrong, extra, missed };
}

function showWordReview() {
    const review = compareWords(targetText, input.value);

    const wrongCount = document.getElementById("wrongWordsCount");
    const extraCount = document.getElementById("extraWordsCount");
    const missedCount = document.getElementById("missedWordsCount");
    const reviewList = document.getElementById("wordReview");

    if (!wrongCount || !extraCount || !missedCount || !reviewList) {
        console.warn("Word review HTML elements are missing.");
        return;
    }

    wrongCount.textContent = review.wrong.length;
    extraCount.textContent = review.extra.length;
    missedCount.textContent = review.missed.length;

    reviewList.replaceChildren();

    function addReviewItem(label, value, className) {
        const item = document.createElement("div");
        item.className = "word-review-item " + className;
        item.textContent = label + ": " + value;
        reviewList.appendChild(item);
    }

    if (
        review.wrong.length === 0 &&
        review.extra.length === 0 &&
        review.missed.length === 0
    ) {
        addReviewItem(
            "Excellent!",
            "All words match the passage.",
            "word-correct"
        );
        return;
    }

    review.wrong.forEach(word => {
        addReviewItem(
            "Wrong: " + word.typed,
            "Correct: " + word.expected,
            "word-wrong"
        );
    });

    review.extra.forEach(word => {
        addReviewItem("Extra word", word, "word-extra");
    });

    review.missed.forEach(word => {
        addReviewItem("Missed word", word, "word-missed");
    });
}

function updateDisplay() {
    const stats = getStats();

    for (let i = 0; i < passageElement.children.length; i++) {
        const span = passageElement.children[i];
        span.className = "";

        if (i < stats.typed.length) {
            span.classList.add(
                stats.typed[i] === targetText[i]
                    ? "correct"
                    : "incorrect"
            );
        }

        if (i === stats.typed.length && !finished) {
            span.classList.add("current");
        }
    }

    wpmElement.textContent = stats.wpm;
    accuracyElement.textContent = stats.accuracy + "%";
    errorsElement.textContent = stats.errors;
}

function updateTimer() {
    if (!running || !startedAt) return;

    const elapsed = (Date.now() - startedAt) / 1000;
    remaining = Math.max(0, duration - Math.floor(elapsed));

    timeElement.textContent = remaining + "s";
    updateDisplay();

    if (remaining <= 0) {
        finishTest();
    }
}

function startTest() {
    if (running || finished) return;

    running = true;
    startedAt = Date.now();

    statusElement.textContent = "Keep going! You're doing great.";
    timerId = setInterval(updateTimer, 100);
}

function finishTest() {
    if (finished) return;

    finished = true;
    running = false;

    clearInterval(timerId);
    timerId = null;

    remaining = 0;
    timeElement.textContent = "0s";
    input.disabled = true;

    const stats = getStats();

    updateDisplay();

    document.getElementById("finalWpm").textContent = stats.wpm;
    document.getElementById("finalAccuracy").textContent =
        stats.accuracy + "%";
    document.getElementById("finalCorrect").textContent = stats.correct;

    // Show wrong, extra and missed words.
    showWordReview();

    statusElement.textContent = "Test complete!";
    resultPanel.hidden = false;
}

function resetTest() {
    clearInterval(timerId);
    timerId = null;

    running = false;
    finished = false;
    startedAt = null;
    remaining = duration;

    input.value = "";
    input.disabled = false;

    timeElement.textContent = remaining + "s";
    resultPanel.hidden = true;
    statusElement.textContent = "Ready when you are.";

    choosePassage();
    updateDisplay();
}

input.addEventListener("input", () => {
    if (finished) return;

    if (!running && input.value.length > 0) {
        startTest();
    }

    if (input.value.length >= targetText.length) {
        finishTest();
        return;
    }

    updateDisplay();
});

modes.forEach(button => {
    button.addEventListener("click", () => {
        duration = Number(button.dataset.time);

        modes.forEach(mode => mode.classList.remove("active"));
        button.classList.add("active");

        resetTest();
    });
});

document.getElementById("resetButton").addEventListener("click", resetTest);
document.getElementById("againButton").addEventListener("click", resetTest);

document.getElementById("themeButton").addEventListener("click", () => {
    document.body.classList.toggle("light");
});

choosePassage();
resetTest();