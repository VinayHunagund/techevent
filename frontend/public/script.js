// Global variables
let questions = [];
let timerInterval = null;
let timeRemaining = 0;
let isSubmitted = false;
let roundStartTime = null;
let fullscreenCheckInterval = null;
let isFullscreenEnforced = true;

// Global 90-minute timer constants
const GLOBAL_TIMER_MINUTES = 90;
const GLOBAL_TIMER_SECONDS = GLOBAL_TIMER_MINUTES * 60;

// Check if team name exists
const teamName = sessionStorage.getItem('teamName');
if (!teamName) {
    window.location.href = 'index.html';
}

// Check if round is selected
const selectedRound = sessionStorage.getItem('selectedRound');
if (!selectedRound) {
    window.location.href = 'rounds.html';
}

// Display team name and round number
document.getElementById('teamNameDisplay').textContent = teamName;
document.getElementById('roundNumberDisplay').textContent = selectedRound;

// Prevent back button
window.history.pushState(null, '', window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, '', window.location.href);
    if (!isSubmitted) {
        alert('Please use the Submit button to complete the round.');
    }
};

// Make sure isFullscreenEnforced is set to true for proper monitoring
isFullscreenEnforced = true;

// Prevent refresh - save timer state when leaving
window.addEventListener('beforeunload', function (e) {
    if (!isSubmitted) {
        // Save remaining time to localStorage
        saveTimerState();
        e.preventDefault();
        e.returnValue = '';
        return 'Are you sure you want to leave? Your answers may not be saved.';
    }
});

// Disable right-click and common keyboard shortcuts
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

document.addEventListener('keydown', function (e) {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
    }

    // Prevent F11 (fullscreen toggle) and Escape
    if (e.keyCode === 122 || e.keyCode === 27) {
        e.preventDefault();
    }
});

// Fullscreen functions
function enterFullscreen() {
    const docElm = document.documentElement;
    if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
    } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
    } else if (docElm.webkitRequestFullScreen) {
        docElm.webkitRequestFullScreen();
    } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
    }
}

function isFullscreen() {
    return !!(document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement);
}

function startFullscreenMonitoring() {
    // Add a grace period before monitoring starts
    // This prevents banning during page navigation when fullscreen is temporarily lost
    setTimeout(() => {
        // Only start monitoring if enforcement is still active (wasn't disabled during navigation)
        if (!isFullscreenEnforced || isSubmitted) return;

        // Check fullscreen status every 500ms
        fullscreenCheckInterval = setInterval(() => {
            if (!isFullscreen() && isFullscreenEnforced && !isSubmitted) {
                // User exited fullscreen - ban them
                banTeam();
            }
        }, 500);

        // Also listen for fullscreen change events
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }, 5000); // 5 second grace period for page load
}

function handleFullscreenChange() {
    if (!isFullscreen() && isFullscreenEnforced && !isSubmitted) {
        banTeam();
    }
}

function banTeam() {
    // Stop monitoring
    if (fullscreenCheckInterval) {
        clearInterval(fullscreenCheckInterval);
    }

    // Mark team as banned in localStorage
    const bannedKey = `banned_${teamName}`;
    localStorage.setItem(bannedKey, 'true');

    // Store ban time
    const banTimeKey = `${teamName}_ban_time`;
    localStorage.setItem(banTimeKey, new Date().toISOString());

    // Clear session data
    sessionStorage.removeItem('teamName');
    sessionStorage.removeItem('selectedRound');

    // Show ban message
    showBanMessage();
}

function isTeamBanned() {
    const bannedKey = `banned_${teamName}`;
    return localStorage.getItem(bannedKey) === 'true';
}

function showBanMessage() {
    // Hide all content
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
        ">
            <h1 style="color: #ff4444; font-size: 3em; margin-bottom: 20px;">⛔ ACCESS DENIED</h1>
            <p style="font-size: 1.5em; margin-bottom: 20px;">Your team has been disqualified.</p>
            <p style="font-size: 1.2em; color: #ff8888;">Reason: Exited full-screen mode during the competition.</p>
            <p style="font-size: 1em; margin-top: 30px; color: #888;">Contact the administrator if you believe this is an error.</p>
        </div>
    `;
}

// Load questions on page load
document.addEventListener('DOMContentLoaded', function () {
    // Check if team was banned for exiting fullscreen
    if (isTeamBanned()) {
        showBanMessage();
        return;
    }

    // Initialize round navigation bar
    initRoundNavigation();

    // Automatically enter fullscreen when page loads
    // (user already consented via the "Enter Full Screen & Start" button on the entry page)
    enterFullscreen();

    // Start fullscreen monitoring and load questions directly
    if (!fullscreenCheckInterval) {
        startFullscreenMonitoring();
    }
    loadQuestions();
});

// Fetch questions from server
async function loadQuestions() {
    try {
        const response = await fetch(`/api/questions?round=${selectedRound}`);
        const data = await response.json();

        if (!data.success) {
            showError('Failed to load questions. Please contact admin.');
            return;
        }

        questions = data.questions;

        // Display questions
        displayQuestions();

        // Set round start time for the current session
        roundStartTime = Date.now();

        // Start/resume the global 90-minute timer
        startGlobalTimer();

    } catch (error) {
        console.error('Error loading questions:', error);
        showError('Network error. Please check your connection.');
    }
}

// Display questions dynamically
function displayQuestions() {
    const container = document.getElementById('questionsContainer');

    // Show database tables only for Round 1
    if (selectedRound === '1') {
        document.getElementById('databaseTablesSection').style.display = 'block';
    }
    // Show DSA challenge scenario for Round 2
    else if (selectedRound === '2') {
        document.getElementById('dsaChallengeSection').style.display = 'block';
    }
    // Show flowchart images for Round 4
    else if (selectedRound === '4') {
        document.getElementById('flowchartSection').style.display = 'block';
    }

    if (questions.length === 0) {
        const loadingDiv = document.createElement('p');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'No questions available.';
        container.appendChild(loadingDiv);
        return;
    }

    // For Round 4, insert questions after each flowchart
    if (selectedRound === '4') {
        questions.forEach((question, index) => {
            // Find the flowchart block for this question
            const flowchartBlock = document.querySelector(`.flowchart-question-block[data-question-id="${question.id}"]`);

            if (flowchartBlock) {
                // Create question block to insert after flowchart
                const questionBlock = createQuestionBlock(question, index);
                flowchartBlock.appendChild(questionBlock);
            } else {
                // Fallback: add to container if no matching flowchart found
                const questionBlock = createQuestionBlock(question, index);
                container.appendChild(questionBlock);
            }
        });
    } else {
        // Normal display for other rounds
        questions.forEach((question, index) => {
            const questionBlock = createQuestionBlock(question, index);
            container.appendChild(questionBlock);
        });
    }
}

// Helper function to create a question block
function createQuestionBlock(question, index) {
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';

    const questionHeader = document.createElement('div');
    questionHeader.className = 'question-header';
    questionHeader.innerHTML = `
        <span class="question-number">Question ${index + 1}</span>
        <span class="question-marks">${question.marks} marks</span>
    `;

    const questionText = document.createElement('p');
    questionText.className = 'question-text';
    questionText.textContent = question.question;

    questionBlock.appendChild(questionHeader);
    questionBlock.appendChild(questionText);

    if (question.type === 'mcq') {
        // MCQ options
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        question.options.forEach((option, optIdx) => {
            const optionItem = document.createElement('div');
            optionItem.className = 'option-item';
            optionItem.innerHTML = `
                <label>
                    <input type="radio" name="q${question.id}" value="${option}" data-question-id="${question.id}">
                    ${option}
                </label>
            `;
            optionsDiv.appendChild(optionItem);
        });

        questionBlock.appendChild(optionsDiv);

    } else if (question.type === 'text') {
        // Text input - use textarea for longer answers
        const textArea = document.createElement('textarea');
        textArea.className = 'text-answer';
        textArea.placeholder = 'Enter your answer here...';
        textArea.dataset.questionId = question.id;
        textArea.rows = 4;

        questionBlock.appendChild(textArea);
    }

    return questionBlock;
}

// ===== GLOBAL 90-MINUTE TIMER =====

// Get or set the global timer start time
function getGlobalTimerStart() {
    const key = `globalTimerStart_${teamName}`;
    return localStorage.getItem(key);
}

function setGlobalTimerStart() {
    const key = `globalTimerStart_${teamName}`;
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, Date.now().toString());
    }
}

function getGlobalTimeRemaining() {
    const startTime = getGlobalTimerStart();
    if (!startTime) return GLOBAL_TIMER_SECONDS;
    const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
    return Math.max(0, GLOBAL_TIMER_SECONDS - elapsed);
}

// Start the global timer
function startGlobalTimer() {
    // Set start time if not already set (first challenge entry)
    setGlobalTimerStart();

    // Get remaining time
    timeRemaining = getGlobalTimeRemaining();

    // Check if already expired
    if (timeRemaining <= 0) {
        showTimeOverMessage();
        return;
    }

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining = getGlobalTimeRemaining();
        updateTimerDisplay();

        // Change timer color based on time remaining
        const timerElement = document.getElementById('timer');
        if (timeRemaining <= 60) {
            timerElement.className = 'timer danger';
        } else if (timeRemaining <= 300) {
            timerElement.className = 'timer warning';
        }

        // Time is up
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            showTimeOverMessage();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}

// Show "Time is Over" message
function showTimeOverMessage() {
    // Auto-submit current round if not already submitted
    if (!isSubmitted) {
        submitAnswers();
    }

    // Replace page with time over message
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            text-align: center;
            padding: 20px;
        ">
            <div style="font-size: 5em; margin-bottom: 20px;">⏰</div>
            <h1 style="color: #ff4444; font-size: 3em; margin-bottom: 20px;">Time is Over!</h1>
            <p style="font-size: 1.5em; margin-bottom: 15px; color: #e0e0e0;">The 90-minute competition time has ended.</p>
            <p style="font-size: 1.2em; color: rgba(255,255,255,0.6); margin-bottom: 30px;">Your answers have been submitted automatically.</p>
            <div style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 68, 68, 0.3);
                border-radius: 20px;
                padding: 25px 40px;
            ">
                <p style="font-size: 1.3em; color: #00d4ff;">🎉 Thank You for Participating! 🎉</p>
            </div>
            <p style="margin-top: 30px; color: rgba(255,255,255,0.3); font-size: 0.9em;">~:Developed by:~ Vinay S H and Pavan T M</p>
        </div>
    `;
}

// Save timer state (for beforeunload - no longer per-round, just saves global)
function saveTimerState() {
    // Global timer is timestamp-based, no need to save remaining time
}

function clearTimerState() {
    // No per-round state to clear
}

// Auto-submit when timer reaches zero
function autoSubmit() {
    alert('⏰ Time is up! Your answers will be submitted automatically.');
    submitAnswers();
}

// Submit button click handler
document.getElementById('submitBtn').addEventListener('click', function () {
    if (isSubmitted) {
        return;
    }

    // Show confirmation modal
    document.getElementById('confirmModal').classList.add('show');
});

// Confirm Yes button
document.getElementById('confirmYes').addEventListener('click', function () {
    document.getElementById('confirmModal').classList.remove('show');
    submitAnswers();
});

// Confirm No button
document.getElementById('confirmNo').addEventListener('click', function () {
    document.getElementById('confirmModal').classList.remove('show');
});

// Submit answers to server
async function submitAnswers() {
    if (isSubmitted) {
        return;
    }

    // Collect answers
    const answers = {};

    questions.forEach(question => {
        if (question.type === 'mcq') {
            const selected = document.querySelector(`input[name="q${question.id}"]:checked`);
            answers[question.id] = selected ? selected.value : '';
        } else if (question.type === 'text') {
            const textArea = document.querySelector(`textarea[data-question-id="${question.id}"]`);
            answers[question.id] = textArea ? textArea.value.trim() : '';
        }
    });

    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Calculate time taken for this round (current session only)
    const currentSessionTime = roundStartTime ? Math.floor((Date.now() - roundStartTime) / 1000) : 0;
    const timeTakenSeconds = currentSessionTime;

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamName: teamName,
                roundNumber: parseInt(selectedRound),
                answers: answers,
                timeTaken: timeTakenSeconds
            })
        });

        const data = await response.json();

        if (data.success) {
            // Mark as submitted
            isSubmitted = true;

            // Stop timer
            if (timerInterval) {
                clearInterval(timerInterval);
            }

            // Clear saved timer state since submission is complete
            clearTimerState();

            // Mark this round as completed in localStorage
            const completedRounds = JSON.parse(localStorage.getItem(`completed_${teamName}`) || '[]');
            if (!completedRounds.includes(parseInt(selectedRound))) {
                completedRounds.push(parseInt(selectedRound));
                localStorage.setItem(`completed_${teamName}`, JSON.stringify(completedRounds));
            }

            // Check if ALL 4 challenges are now completed
            if (completedRounds.length >= 4 && [1, 2, 3, 4].every(r => completedRounds.includes(r))) {
                // Show the "Thank you for participating" page immediately
                document.body.innerHTML = `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%);
                        color: white;
                        font-family: 'Segoe UI', Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div style="font-size: 5em; margin-bottom: 20px;">🏆</div>
                        <h1 style="
                            font-family: 'Orbitron', sans-serif;
                            font-size: 3rem;
                            font-weight: 900;
                            background: linear-gradient(135deg, #00d4ff, #ff006e, #8338ec);
                            background-size: 300% 300%;
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            margin-bottom: 20px;
                        ">Congratulations!</h1>
                        <p style="font-size: 1.4rem; color: #e0e0e0; margin-bottom: 15px; letter-spacing: 1px;">
                            You have completed all 4 challenges!
                        </p>
                        <div style="
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(0, 212, 255, 0.3);
                            border-radius: 20px;
                            padding: 30px 40px;
                            margin-top: 20px;
                            backdrop-filter: blur(10px);
                        ">
                            <p style="font-size: 1.8rem; color: #00d4ff; font-weight: 600; margin-bottom: 10px;">
                                🎉 Thank You for Participating! 🎉
                            </p>
                            <p style="color: rgba(255,255,255,0.6); font-size: 1.1rem; letter-spacing: 1px;">
                                Team: <strong style="color: #ff006e;">${teamName}</strong>
                            </p>
                        </div>
                        <div style="
                            margin-top: 40px;
                            padding: 15px 30px;
                            border-radius: 50px;
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        ">
                            <p style="color: rgba(255,255,255,0.5); font-size: 0.95rem;">
                                ~:Developed by:~ Vinay S H and Pavan T M
                            </p>
                        </div>
                    </div>
                `;
            } else {
                // Not all rounds done yet — auto-advance to the next round
                // Find the next uncompleted round (sequential order)
                const currentRound = parseInt(selectedRound);
                let nextRound = null;
                for (let i = 1; i <= 4; i++) {
                    const candidate = ((currentRound - 1 + i) % 4) + 1; // wraps: after 4 goes to 1
                    if (!completedRounds.includes(candidate)) {
                        nextRound = candidate;
                        break;
                    }
                }

                if (nextRound) {
                    // Disable fullscreen enforcement during navigation
                    isFullscreenEnforced = false;
                    if (fullscreenCheckInterval) {
                        clearInterval(fullscreenCheckInterval);
                    }

                    sessionStorage.setItem('selectedRound', nextRound.toString());
                    window.location.href = 'round.html';
                }
            }

        } else {
            showError(data.message || 'Submission failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Answers';
        }

    } catch (error) {
        console.error('Error submitting answers:', error);
        showError('Network error during submission. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Answers';
    }
}

// Show error message
function showError(message) {
    const messageDiv = document.getElementById('submitMessage');
    messageDiv.textContent = message;
    messageDiv.className = 'submit-message error';
}

// Initialize round navigation bar
function initRoundNavigation() {
    const currentRound = parseInt(selectedRound);
    const completedRounds = JSON.parse(localStorage.getItem(`completed_${teamName}`) || '[]');

    for (let i = 1; i <= 4; i++) {
        const navBtn = document.querySelector(`.round-nav-btn.round-nav-${i}`);
        const statusEl = document.getElementById(`navStatus${i}`);

        if (!navBtn) continue;

        // Remove all state classes first
        navBtn.classList.remove('active', 'completed');

        if (i === currentRound) {
            navBtn.classList.add('active');
            if (statusEl) statusEl.textContent = '(current)';
        } else if (completedRounds.includes(i)) {
            navBtn.classList.add('completed');
            if (statusEl) statusEl.textContent = '(done)';
        } else {
            if (statusEl) statusEl.textContent = '';
        }
    }
}

// Show the next round navigation panel after submission
function showNextRoundPanel() {
    const panel = document.getElementById('nextRoundPanel');
    if (!panel) return;

    const currentRound = parseInt(selectedRound);
    const completedRounds = JSON.parse(localStorage.getItem(`completed_${teamName}`) || '[]');

    // Update each button in the next-round panel
    for (let i = 1; i <= 4; i++) {
        const btn = panel.querySelector(`.next-round-btn[data-round="${i}"]`);
        const statusEl = document.getElementById(`nrStatus${i}`);

        if (!btn) continue;

        btn.classList.remove('completed', 'current');

        if (completedRounds.includes(i)) {
            btn.classList.add('completed');
            if (statusEl) statusEl.textContent = '✓ Done';
        } else if (i === currentRound) {
            btn.classList.add('current');
            if (statusEl) statusEl.textContent = '✓ Just Done';
        } else {
            if (statusEl) statusEl.textContent = 'Available';
        }
    }

    // Show the panel with animation
    panel.style.display = 'block';

    // Scroll to the panel
    setTimeout(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}
