/* =========================================================
   IQRAR FOCUS+
   Web Application
   ========================================================= */

const STORAGE_KEY = "iqrar_focus_plus_v1";

let state = loadState();

let timerInterval = null;
let timerSeconds = Number(state.focusDuration || 25) * 60;
let timerRunning = false;

let calendarDate = new Date();

let currentQuiz = null;
let currentQuizQuestion = 0;
let currentQuizScore = 0;

/* =========================================================
   DEFAULT STATE
   ========================================================= */

function defaultState() {
    return {
        goal: 120,
        focusDuration: 25,
        tasks: [],
        studyMinutes: {},
        studiedDates: [],
        streak: 0,
        bestStreak: 0,
        questionsAttempted: 0,
        questionsCorrect: 0
    };
}

/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return defaultState();
        }

        const parsed = JSON.parse(saved);

        return {
            ...defaultState(),
            ...parsed,
            tasks: Array.isArray(parsed.tasks)
                ? parsed.tasks
                : [],
            studyMinutes:
                parsed.studyMinutes &&
                typeof parsed.studyMinutes === "object"
                    ? parsed.studyMinutes
                    : {},
            studiedDates: Array.isArray(parsed.studiedDates)
                ? parsed.studiedDates
                : []
        };
    } catch (error) {
        console.error("Could not load saved data:", error);
        return defaultState();
    }
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );
    } catch (error) {
        console.error("Could not save data:", error);
    }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function navigate(pageName) {
    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active");
        });

    document
        .querySelectorAll(".nav-btn")
        .forEach(button => {
            button.classList.remove("active");
        });

    const page = document.getElementById(pageName);

    if (page) {
        page.classList.add("active");
    }

    const button = document.querySelector(
        `.nav-btn[data-page="${pageName}"]`
    );

    if (button) {
        button.classList.add("active");
    }

    updatePageSubtitle(pageName);

    if (pageName === "dashboard") {
        renderDashboard();
    }

    if (pageName === "study") {
        renderStudy();
        renderCalendar();
    }

    if (pageName === "focus") {
        updateTimerDisplay();
    }

    if (pageName === "questions") {
        loadQuestionFiles();
    }

    if (pageName === "analytics") {
        renderAnalytics();
    }

    if (pageName === "achievements") {
        renderAchievements();
    }

    if (pageName === "settings") {
        renderSettings();
    }
}

function updatePageSubtitle(pageName) {
    const subtitles = {
        dashboard: "Your personal study dashboard",
        study: "Plan and organize your study",
        focus: "Deep work without distractions",
        questions: "Practice and test yourself",
        analytics: "Understand your progress",
        achievements: "Track your milestones",
        settings: "Customize your experience"
    };

    const element =
        document.getElementById("page-subtitle");

    if (element) {
        element.textContent =
            subtitles[pageName] || "";
    }
}

/* =========================================================
   DATE
   ========================================================= */

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayKey() {
    return formatDate(new Date());
}

function updateTodayDate() {
    const element =
        document.getElementById("today-date");

    if (!element) {
        return;
    }

    element.textContent =
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
}

/* =========================================================
   TASKS
   ========================================================= */

function addTask(event) {
    event.preventDefault();

    const input =
        document.getElementById("task-input");

    const subject =
        document.getElementById("task-subject");

    const minutes =
        document.getElementById("task-minutes");

    if (!input) {
        return;
    }

    const text = input.value.trim();

    if (!text) {
        showToast("Enter a study task first.");
        return;
    }

    const subjectValue =
        subject
            ? subject.value.trim()
            : "General";

    const minutesValue =
        minutes
            ? Math.max(
                1,
                Number(minutes.value) || 60
            )
            : 60;

    state.tasks.push({
        id: Date.now(),
        text: text,
        subject: subjectValue || "General",
        minutes: minutesValue,
        completed: false,
        created: getTodayKey()
    });

    saveState();

    input.value = "";

    if (minutes) {
        minutes.value = "";
    }

    renderStudy();
    renderDashboard();
    updateStats();

    showToast("Task added ✓");
}

function toggleTask(id) {
    const task =
        state.tasks.find(
            item => Number(item.id) === Number(id)
        );

    if (!task) {
        return;
    }

    task.completed = !task.completed;

    saveState();

    renderStudy();
    renderDashboard();
    updateStats();
    renderAchievements();

    showToast(
        task.completed
            ? "Task completed 🎉"
            : "Task marked incomplete"
    );
}

function deleteTask(id) {
    state.tasks =
        state.tasks.filter(
            task => Number(task.id) !== Number(id)
        );

    saveState();

    renderStudy();
    renderDashboard();
    updateStats();
    renderAchievements();

    showToast("Task deleted");
}

function clearTasks() {
    if (!state.tasks.length) {
        showToast("There are no tasks to clear.");
        return;
    }

    if (!confirm("Clear all study tasks?")) {
        return;
    }

    state.tasks = [];

    saveState();

    renderStudy();
    renderDashboard();
    updateStats();
    renderAchievements();

    showToast("Tasks cleared");
}

function taskHTML(task) {
    return `
        <div class="task-item ${
            task.completed ? "completed" : ""
        }">

            <button
                class="task-check"
                onclick="toggleTask(${Number(task.id)})"
                aria-label="Complete task">
                ${task.completed ? "✓" : ""}
            </button>

            <div class="task-info">

                <strong>
                    ${escapeHTML(task.text)}
                </strong>

                <span>
                    ${escapeHTML(
                        task.subject || "General"
                    )}
                    • ${Number(task.minutes) || 0} min
                </span>

            </div>

            <button
                class="task-delete"
                onclick="deleteTask(${Number(task.id)})"
                aria-label="Delete task">
                ×
            </button>

        </div>
    `;
}

/* =========================================================
   STUDY PAGE
   ========================================================= */

function renderStudy() {
    const list =
        document.getElementById(
            "study-task-list"
        );

    if (!list) {
        return;
    }

    if (!state.tasks.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div>📚</div>
                <strong>No tasks yet</strong>
                <span>
                    Add your first study task above.
                </span>
            </div>
        `;
    } else {
        list.innerHTML =
            state.tasks
                .map(taskHTML)
                .join("");
    }

    const label =
        document.getElementById(
            "task-count-label"
        );

    if (label) {
        label.textContent =
            `${state.tasks.length} task${
                state.tasks.length === 1
                    ? ""
                    : "s"
            }`;
    }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
    const container =
        document.getElementById(
            "dashboard-tasks"
        );

    if (!container) {
        return;
    }

    const tasks =
        state.tasks.slice(0, 5);

    if (!tasks.length) {
        container.innerHTML = `
            <div class="empty-state compact">
                <div>🎯</div>
                <strong>No tasks planned</strong>
                <span>
                    Go to Study and create your plan.
                </span>
            </div>
        `;
    } else {
        container.innerHTML =
            tasks
                .map(taskHTML)
                .join("");
    }

    updateStats();
}

function updateStats() {
    const completed =
        state.tasks.filter(
            task => task.completed
        ).length;

    const total =
        state.tasks.length;

    const todayMinutes =
        getStudyMinutes(
            getTodayKey()
        );

    const goal =
        Math.max(
            1,
            Number(state.goal) || 120
        );

    const percentage =
        Math.min(
            100,
            Math.round(
                (todayMinutes / goal) * 100
            )
        );

    setText(
        "stat-streak",
        `${state.streak} days`
    );

    setText(
        "stat-time",
        `${todayMinutes} min`
    );

    setText(
        "stat-tasks",
        `${completed} / ${total}`
    );

    setText(
        "stat-goal",
        `${goal} min`
    );

    setText(
        "hero-progress",
        `${percentage}%`
    );

    setText(
        "focus-total",
        `${todayMinutes} minutes`
    );
}

/* =========================================================
   STUDY TIME
   ========================================================= */

function getStudyMinutes(dateKey) {
    return Number(
        state.studyMinutes[dateKey] || 0
    );
}

function addStudyMinutes(minutes) {
    const amount =
        Math.max(
            0,
            Math.round(
                Number(minutes) || 0
            )
        );

    if (!amount) {
        return;
    }

    const key =
        getTodayKey();

    state.studyMinutes[key] =
        getStudyMinutes(key) + amount;

    markTodayStudied();

    saveState();

    updateStats();
    renderAnalytics();
    renderAchievements();
}

function markTodayStudied() {
    const today =
        getTodayKey();

    if (
        !state.studiedDates.includes(today)
    ) {
        state.studiedDates.push(today);
    }

    calculateStreak();
}

function calculateStreak() {
    const dates =
        new Set(state.studiedDates);

    let streak = 0;

    const cursor =
        new Date();

    while (true) {
        const key =
            formatDate(cursor);

        if (!dates.has(key)) {
            break;
        }

        streak++;

        cursor.setDate(
            cursor.getDate() - 1
        );
    }

    state.streak = streak;

    if (
        streak >
        Number(state.bestStreak || 0)
    ) {
        state.bestStreak = streak;
    }

    saveState();
}

/* =========================================================
   FOCUS TIMER
   ========================================================= */

function setTimer(minutes) {
    if (timerRunning) {
        return;
    }

    const value =
        Math.max(
            1,
            Number(minutes) || 25
        );

    timerSeconds =
        value * 60;

    updateTimerDisplay();

    setText(
        "focus-mode",
        "FOCUS SESSION"
    );

    setText(
        "timer-start",
        "Start"
    );

    setText(
        "timer-status",
        "Ready when you are."
    );
}

function toggleTimer() {
    if (timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (timerRunning) {
        return;
    }

    if (timerSeconds <= 0) {
        timerSeconds =
            Number(state.focusDuration || 25) * 60;
    }

    timerRunning = true;

    setText(
        "timer-start",
        "Pause"
    );

    setText(
        "timer-status",
        "Stay focused. You've got this."
    );

    timerInterval =
        setInterval(
            timerTick,
            1000
        );
}

function pauseTimer() {
    timerRunning = false;

    clearInterval(
        timerInterval
    );

    timerInterval = null;

    setText(
        "timer-start",
        "Resume"
    );

    setText(
        "timer-status",
        "Session paused."
    );
}

function resetTimer() {
    clearInterval(
        timerInterval
    );

    timerInterval = null;

    timerRunning = false;

    timerSeconds =
        Math.max(
            1,
            Number(
                state.focusDuration
            ) || 25
        ) * 60;

    updateTimerDisplay();

    setText(
        "timer-start",
        "Start"
    );

    setText(
        "timer-status",
        "Ready when you are."
    );

    setText(
        "focus-mode",
        "FOCUS SESSION"
    );
}

function timerTick() {
    if (!timerRunning) {
        return;
    }

    if (timerSeconds <= 1) {
        timerSeconds = 0;

        updateTimerDisplay();

        finishTimer();

        return;
    }

    timerSeconds--;

    updateTimerDisplay();
}

function finishTimer() {
    clearInterval(
        timerInterval
    );

    timerInterval = null;

    timerRunning = false;

    const sessionMinutes =
        Math.max(
            1,
            Number(
                state.focusDuration
            ) || 25
        );

    addStudyMinutes(
        sessionMinutes
    );

    timerSeconds =
        sessionMinutes * 60;

    updateTimerDisplay();

    setText(
        "timer-start",
        "Start"
    );

    setText(
        "timer-status",
        "Session complete! 🎉"
    );

    setText(
        "focus-mode",
        "SESSION COMPLETE"
    );

    showToast(
        `${sessionMinutes} minutes added 🎉`
    );
}

function updateTimerDisplay() {
    const safeSeconds =
        Math.max(
            0,
            Number(timerSeconds) || 0
        );

    const minutes =
        Math.floor(
            safeSeconds / 60
        );

    const seconds =
        safeSeconds % 60;

    const value =
        `${String(minutes).padStart(2, "0")}:${
            String(seconds).padStart(2, "0")
        }`;

    setText(
        "timer",
        value
    );

    setText(
        "mini-timer",
        value
    );
}

/* =========================================================
   CALENDAR
   ========================================================= */

function changeMonth(direction) {
    const amount =
        Number(direction) || 0;

    calendarDate.setMonth(
        calendarDate.getMonth() + amount
    );

    renderCalendar();
}

function renderCalendar() {
    const calendar =
        document.getElementById(
            "calendar"
        );

    const title =
        document.getElementById(
            "calendar-month"
        );

    if (!calendar || !title) {
        return;
    }

    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();

    title.textContent =
        calendarDate.toLocaleDateString(
            undefined,
            {
                month: "long",
                year: "numeric"
            }
        );

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    const previousDays =
        new Date(
            year,
            month,
            0
        ).getDate();

    let html = "";

    const weekdayNames =
        [
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat"
        ];

    weekdayNames.forEach(day => {
        html += `
            <div class="calendar-weekday">
                ${day}
            </div>
        `;
    });

    for (
        let i = firstDay - 1;
        i >= 0;
        i--
    ) {
        html += `
            <div class="calendar-day muted">
                ${previousDays - i}
            </div>
        `;
    }

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {
        const date =
            new Date(
                year,
                month,
                day
            );

        const key =
            formatDate(date);

        const studied =
            state.studiedDates.includes(
                key
            );

        const today =
            key === getTodayKey();

        html += `
            <button
                type="button"
                class="calendar-day ${
                    studied ? "studied" : ""
                } ${
                    today ? "today" : ""
                }"
                onclick="toggleCalendarDate('${key}')">

                <span>
                    ${day}
                </span>

                ${
                    studied
                        ? "<small>✓</small>"
                        : ""
                }

            </button>
        `;
    }

    calendar.innerHTML = html;
}

function toggleCalendarDate(key) {
    if (!key) {
        return;
    }

    const index =
        state.studiedDates.indexOf(key);

    if (index >= 0) {
        state.studiedDates.splice(
            index,
            1
        );
    } else {
        state.studiedDates.push(key);
    }

    calculateStreak();

    saveState();

    renderCalendar();
    updateStats();
    renderAchievements();
    renderAnalytics();

    showToast(
        "Calendar updated ✓"
    );
}

/* =========================================================
   ANALYTICS
   ========================================================= */

function getLastSevenDays() {
    const days = [];

    const now =
        new Date();

    for (
        let i = 6;
        i >= 0;
        i--
    ) {
        const date =
            new Date(now);

        date.setDate(
            now.getDate() - i
        );

        const key =
            formatDate(date);

        days.push({
            date: date,
            key: key,
            minutes:
                getStudyMinutes(key)
        });
    }

    return days;
}

function renderAnalytics() {
    const total =
        Object.values(
            state.studyMinutes
        ).reduce(
            (sum, value) =>
                sum +
                Number(value || 0),
            0
        );

    const completed =
        state.tasks.filter(
            task => task.completed
        ).length;

    setText(
        "analytics-time",
        `${total} min`
    );

    setText(
        "analytics-best",
        `${state.bestStreak} days`
    );

    setText(
        "analytics-completed",
        completed
    );

    setText(
        "analytics-questions",
        state.questionsAttempted
    );

    const accuracy =
        state.questionsAttempted > 0
            ? (
                state.questionsCorrect /
                state.questionsAttempted *
                100
            )
            : 0;

    setText(
        "analytics-accuracy",
        `${accuracy.toFixed(1)}%`
    );

    const chart =
        document.getElementById(
            "weekly-chart"
        );

    if (!chart) {
        return;
    }

    const days =
        getLastSevenDays();

    const max =
        Math.max(
            60,
            ...days.map(
                day => day.minutes
            )
        );

    chart.innerHTML =
        days.map(day => {
            const height =
                day.minutes > 0
                    ? Math.max(
                        4,
                        day.minutes /
                        max *
                        100
                    )
                    : 0;

            return `
                <div class="chart-column">

                    <div class="chart-value">
                        ${day.minutes}
                    </div>

                    <div
                        class="chart-bar"
                        style="height:${height}%">
                    </div>

                    <span>
                        ${day.date.toLocaleDateString(
                            undefined,
                            {
                                weekday: "short"
                            }
                        )}
                    </span>

                </div>
            `;
        }).join("");
}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function renderAchievements() {
    const container =
        document.getElementById(
            "achievement-grid"
        );

    if (!container) {
        return;
    }

    const totalMinutes =
        Object.values(
            state.studyMinutes
        ).reduce(
            (sum, value) =>
                sum +
                Number(value || 0),
            0
        );

    const completed =
        state.tasks.filter(
            task => task.completed
        ).length;

    const achievements = [
        {
            icon: "🌱",
            title: "First Step",
            description:
                "Complete your first study task.",
            unlocked:
                completed >= 1
        },

        {
            icon: "🔥",
            title: "3 Day Streak",
            description:
                "Study for 3 consecutive days.",
            unlocked:
                state.bestStreak >= 3
        },

        {
            icon: "🚀",
            title: "7 Day Streak",
            description:
                "Study for 7 consecutive days.",
            unlocked:
                state.bestStreak >= 7
        },

        {
            icon: "⏱",
            title: "1 Hour",
            description:
                "Study for at least 60 minutes.",
            unlocked:
                totalMinutes >= 60
        },

        {
            icon: "📚",
            title: "5 Hours",
            description:
                "Reach 300 total study minutes.",
            unlocked:
                totalMinutes >= 300
        },

        {
            icon: "🎯",
            title: "Question Solver",
            description:
                "Attempt your first question.",
            unlocked:
                state.questionsAttempted >= 1
        },

        {
            icon: "🏆",
            title: "100 Questions",
            description:
                "Attempt 100 questions.",
            unlocked:
                state.questionsAttempted >= 100
        },

        {
            icon: "💎",
            title: "Consistent",
            description:
                "Study on 14 different days.",
            unlocked:
                new Set(
                    state.studiedDates
                ).size >= 14
        }
    ];

    container.innerHTML =
        achievements.map(item => {
            return `
                <div class="achievement-card ${
                    item.unlocked
                        ? "unlocked"
                        : "locked"
                }">

                    <div class="achievement-icon">
                        ${item.icon}
                    </div>

                    <div>

                        <h3>
                            ${escapeHTML(
                                item.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                item.description
                            )}
                        </p>

                        <span>
                            ${
                                item.unlocked
                                    ? "✓ Unlocked"
                                    : "🔒 Locked"
                            }
                        </span>

                    </div>

                </div>
            `;
        }).join("");
}

/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettings() {
    const goal =
        document.getElementById(
            "goal-input"
        );

    const duration =
        document.getElementById(
            "focus-duration"
        );

    if (goal) {
        goal.value =
            state.goal;
    }

    if (duration) {
        duration.value =
            state.focusDuration;
    }
}

function saveGoal() {
    const input =
        document.getElementById(
            "goal-input"
        );

    if (!input) {
        return;
    }

    const value =
        Math.max(
            1,
            Number(input.value) || 120
        );

    state.goal = value;

    saveState();

    updateStats();

    showToast(
        "Daily goal saved ✓"
    );
}

function saveFocusDuration() {
    const select =
        document.getElementById(
            "focus-duration"
        );

    if (!select) {
        return;
    }

    const value =
        Math.max(
            1,
            Number(select.value) || 25
        );

    state.focusDuration = value;

    if (!timerRunning) {
        timerSeconds =
            value * 60;

        updateTimerDisplay();

        setText(
            "timer-start",
            "Start"
        );
    }

    saveState();

    showToast(
        "Focus duration saved ✓"
    );
}

/* =========================================================
   QUESTION BANK
   ========================================================= */

async function loadQuestionFiles() {
    const container =
        document.getElementById(
            "question-file-list"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="panel loading-state">

            <div class="loader"></div>

            <span>
                Looking for question files...
            </span>

        </div>
    `;

    try {
        const response =
            await fetch(
                "data/questions/index.json",
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                "Question manifest not found."
            );
        }

        const manifest =
            await response.json();

        renderQuestionFiles(
            manifest
        );

    } catch (error) {
        console.log(
            "Question manifest error:",
            error
        );

        container.innerHTML = `
            <div class="panel empty-state">

                <div>📄</div>

                <strong>
                    No question banks found
                </strong>

                <span>
                    Add your question-bank JSON
                    files inside:
                </span>

                <code>
                    data/questions/
                </code>

                <small>
                    And create:
                    data/questions/index.json
                </small>

            </div>
        `;
    }
}

function renderQuestionFiles(files) {
    const container =
        document.getElementById(
            "question-file-list"
        );

    if (!container) {
        return;
    }

    if (!Array.isArray(files)) {
        container.innerHTML = `
            <div class="panel empty-state">
                <div>⚠️</div>
                <strong>
                    Invalid question manifest
                </strong>
                <span>
                    index.json must contain an array.
                </span>
            </div>
        `;

        return;
    }

    if (!files.length) {
        container.innerHTML = `
            <div class="panel empty-state">

                <div>📚</div>

                <strong>
                    No question banks available
                </strong>

                <span>
                    Add JSON question files.
                </span>

            </div>
        `;

        return;
    }

    container.innerHTML =
        files.map(file => {
            const path =
                typeof file === "string"
                    ? file
                    : file.path;

            if (!path) {
                return "";
            }

            const name =
                typeof file === "string"
                    ? file
                    : (
                        file.name ||
                        file.title ||
                        path
                    );

            return `
                <div class="question-file panel">

                    <div class="question-file-info">

                        <div class="file-icon">
                            📘
                        </div>

                        <div>

                            <h3>
                                ${escapeHTML(name)}
                            </h3>

                            <span>
                                Question Bank
                            </span>

                        </div>

                    </div>

                    <button
                        class="primary-btn"
                        onclick="openQuestionFile('${escapeAttribute(path)}')">
                        Start →
                    </button>

                </div>
            `;
        }).join("");
}

async function openQuestionFile(path) {
    if (!path) {
        showQuizError(
            "Question file path is missing."
        );

        return;
    }

    try {
        const response =
            await fetch(
                "data/questions/" +
                path,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `Could not load ${path}`
            );
        }

        const data =
            await response.json();

        let questions = [];

        if (Array.isArray(data)) {
            questions = data;
        } else if (
            data &&
            Array.isArray(data.questions)
        ) {
            questions =
                data.questions;
        }

        if (!questions.length) {
            throw new Error(
                "No questions were found in this JSON file."
            );
        }

        startQuiz(
            questions,
            path
        );

    } catch (error) {
        showQuizError(
            error.message
        );
    }
}

function startQuiz(
    questions,
    source
) {
    if (
        !Array.isArray(questions) ||
        !questions.length
    ) {
        showQuizError(
            "This question bank is empty."
        );

        return;
    }

    currentQuiz = {
        questions: questions,
        source: source
    };

    currentQuizQuestion = 0;
    currentQuizScore = 0;

    const browser =
        document.getElementById(
            "question-browser"
        );

    const area =
        document.getElementById(
            "quiz-area"
        );

    if (browser) {
        browser.classList.add(
            "hidden"
        );
    }

    if (area) {
        area.classList.remove(
            "hidden"
        );
    }

    renderQuizQuestion();
}

function renderQuizQuestion() {
    const area =
        document.getElementById(
            "quiz-area"
        );

    if (!area || !currentQuiz) {
        return;
    }

    const questions =
        currentQuiz.questions;

    if (
        currentQuizQuestion >=
        questions.length
    ) {
        finishQuiz();
        return;
    }

    const question =
        questions[
            currentQuizQuestion
        ];

    const options =
        Array.isArray(
            question.options
        )
            ? question.options
            : [];

    area.innerHTML = `
        <div class="quiz-card">

            <div class="quiz-top">

                <button
                    class="text-btn"
                    onclick="closeQuiz()">
                    ← Question Banks
                </button>

                <span>
                    Question
                    ${currentQuizQuestion + 1}
                    /
                    ${questions.length}
                </span>

            </div>

            <div class="quiz-score">
                Score:
                ${currentQuizScore}
            </div>

            <div class="quiz-question">
                ${escapeHTML(
                    question.question ||
                    question.text ||
                    "Question missing"
                )}
            </div>

            <div class="quiz-options">

                ${
                    options.length
                        ? options.map(
                            (option, index) => `
                                <button
                                    type="button"
                                    class="quiz-option"
                                    onclick="answerQuestion(${index})">

                                    <strong>
                                        ${String.fromCharCode(
                                            65 + index
                                        )}.
                                    </strong>

                                    ${escapeHTML(
                                        String(option)
                                    )}

                                </button>
                            `
                        ).join("")
                        : `
                            <div class="warning-box">
                                ⚠️ No options found
                                for this question.
                            </div>
                        `
                }

            </div>

            <div
                id="quiz-feedback"
                class="quiz-feedback">
            </div>

            <button
                type="button"
                id="quiz-next"
                class="primary-btn hidden"
                onclick="nextQuizQuestion()">
                Next Question →
            </button>

        </div>
    `;
}

function answerQuestion(selectedIndex) {
    if (!currentQuiz) {
        return;
    }

    const question =
        currentQuiz.questions[
            currentQuizQuestion
        ];

    if (!question) {
        return;
    }

    let correct =
        question.answer;

    if (
        correct === undefined ||
        correct === null
    ) {
        correct =
            question.correct_answer;
    }

    if (
        correct === undefined ||
        correct === null
    ) {
        correct =
            question.correctAnswer;
    }

    const options =
        Array.isArray(
            question.options
        )
            ? question.options
            : [];

    const correctIndex =
        getCorrectIndex(
            correct,
            options
        );

    const buttons =
        document.querySelectorAll(
            ".quiz-option"
        );

    buttons.forEach(button => {
        button.disabled = true;
    });

    const feedback =
        document.getElementById(
            "quiz-feedback"
        );

    if (!feedback) {
        return;
    }

    state.questionsAttempted++;

    if (correctIndex === null) {
        feedback.innerHTML = `
            <div class="warning-box">

                ⚠️ Answer is not available
                for this question.

            </div>
        `;
    } else if (
        Number(selectedIndex) ===
        Number(correctIndex)
    ) {
        currentQuizScore++;

        state.questionsCorrect++;

        feedback.innerHTML = `
            <div class="correct-box">

                ✅ Correct!

                ${
                    question.explanation
                        ? `
                            <br><br>
                            ${escapeHTML(
                                question.explanation
                            )}
                        `
                        : ""
                }

            </div>
        `;
    } else {
        feedback.innerHTML = `
            <div class="incorrect-box">

                ❌ Incorrect.

                <br><br>

                Correct answer:

                <strong>
                    ${String.fromCharCode(
                        65 + correctIndex
                    )}.
                    ${escapeHTML(
                        String(
                            options[
                                correctIndex
                            ]
                        )
                    )}
                </strong>

                ${
                    question.explanation
                        ? `
                            <br><br>
                            ${escapeHTML(
                                question.explanation
                            )}
                        `
                        : ""
                }

            </div>
        `;
    }

    saveState();

    renderAnalytics();
    renderAchievements();

    const nextButton =
        document.getElementById(
            "quiz-next"
        );

    if (nextButton) {
        nextButton.classList.remove(
            "hidden"
        );
    }
}

function getCorrectIndex(
    answer,
    options
) {
    if (
        answer === undefined ||
        answer === null
    ) {
        return null;
    }

    if (
        typeof answer === "number" &&
        Number.isInteger(answer)
    ) {
        return (
            answer >= 0 &&
            answer < options.length
        )
            ? answer
            : null;
    }

    if (typeof answer === "string") {
        const text =
            answer.trim();

        if (!text) {
            return null;
        }

        if (
            text.length === 1 &&
            "ABCD".includes(
                text.toUpperCase()
            )
        ) {
            const index =
                text
                    .toUpperCase()
                    .charCodeAt(0) -
                "A".charCodeAt(0);

            return (
                index >= 0 &&
                index < options.length
            )
                ? index
                : null;
        }

        const number =
            Number(text);

        if (
            Number.isInteger(number) &&
            number >= 0 &&
            number < options.length
        ) {
            return number;
        }

        const index =
            options.findIndex(
                option =>
                    String(option)
                        .trim()
                        .toLowerCase() ===
                    text.toLowerCase()
            );

        if (index >= 0) {
            return index;
        }
    }

    return null;
}

function nextQuizQuestion() {
    if (!currentQuiz) {
        return;
    }

    currentQuizQuestion++;

    renderQuizQuestion();
}

function finishQuiz() {
    const area =
        document.getElementById(
            "quiz-area"
        );

    if (!area || !currentQuiz) {
        return;
    }

    const total =
        currentQuiz.questions.length;

    const percentage =
        total
            ? (
                currentQuizScore /
                total *
                100
            )
            : 0;

    area.innerHTML = `
        <div class="quiz-card result-card">

            <div class="result-icon">
                🎉
            </div>

            <h1>
                Test Completed!
            </h1>

            <strong class="result-score">
                ${currentQuizScore} / ${total}
            </strong>

            <p>
                Accuracy:
                ${percentage.toFixed(1)}%
            </p>

            <div class="timer-controls">

                <button
                    type="button"
                    class="primary-btn"
                    onclick="restartQuiz()">
                    Retake Test
                </button>

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeQuiz()">
                    Question Banks
                </button>

            </div>

        </div>
    `;
}

function restartQuiz() {
    if (!currentQuiz) {
        return;
    }

    currentQuizQuestion = 0;
    currentQuizScore = 0;

    renderQuizQuestion();
}

function closeQuiz() {
    currentQuiz = null;

    currentQuizQuestion = 0;
    currentQuizScore = 0;

    const browser =
        document.getElementById(
            "question-browser"
        );

    const area =
        document.getElementById(
            "quiz-area"
        );

    if (browser) {
        browser.classList.remove(
            "hidden"
        );
    }

    if (area) {
        area.classList.add(
            "hidden"
        );

        area.innerHTML = "";
    }

    loadQuestionFiles();
}

function showQuizError(message) {
    const area =
        document.getElementById(
            "quiz-area"
        );

    const browser =
        document.getElementById(
            "question-browser"
        );

    if (browser) {
        browser.classList.add(
            "hidden"
        );
    }

    if (!area) {
        return;
    }

    area.classList.remove(
        "hidden"
    );

    area.innerHTML = `
        <div class="panel empty-state">

            <div>⚠️</div>

            <strong>
                Could not load questions
            </strong>

            <span>
                ${escapeHTML(
                    message ||
                    "Unknown error"
                )}
            </span>

            <button
                type="button"
                class="secondary-btn"
                onclick="closeQuiz()">
                ← Back
            </button>

        </div>
    `;
}

/* =========================================================
   EXPORT / RESET
   ========================================================= */

function exportData() {
    try {
        const blob =
            new Blob(
                [
                    JSON.stringify(
                        state,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "iqrar-focus-data.json";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

        showToast(
            "Study data exported ✓"
        );
    } catch (error) {
        console.error(
            "Export failed:",
            error
        );

        showToast(
            "Export failed."
        );
    }
}

function resetAllData() {
    if (
        !confirm(
            "This will delete your saved study data. Continue?"
        )
    ) {
        return;
    }

    state =
        defaultState();

    saveState();

    resetTimer();

    renderDashboard();
    renderStudy();
    renderCalendar();
    renderAnalytics();
    renderAchievements();
    renderSettings();

    showToast(
        "All data reset"
    );
}

/* =========================================================
   UTILITIES
   ========================================================= */

function setText(
    id,
    text
) {
    const element =
        document.getElementById(
            id
        );

    if (element) {
        element.textContent =
            text;
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

function escapeAttribute(value) {
    return String(value)
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        );
}

function showToast(message) {
    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toast._timeout
    );

    toast._timeout =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            2500
        );
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        document
            .querySelectorAll(
                ".nav-btn"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        navigate(
                            button.dataset.page
                        );
                    }
                );
            });

        const form =
            document.getElementById(
                "task-form"
            );

        if (form) {
            form.addEventListener(
                "submit",
                addTask
            );
        }

        updateTodayDate();

        calculateStreak();

        renderDashboard();
        renderStudy();
        renderCalendar();
        renderAnalytics();
        renderAchievements();
        renderSettings();

        updateTimerDisplay();

        updatePageSubtitle(
            "dashboard"
        );

        const dashboard =
            document.getElementById(
                "dashboard"
            );

        if (dashboard) {
            dashboard.classList.add(
                "active"
            );
        }

        const firstNav =
            document.querySelector(
                '.nav-btn[data-page="dashboard"]'
            );

        if (firstNav) {
            firstNav.classList.add(
                "active"
            );
        }
    }
);
