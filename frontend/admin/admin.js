// Global variables
let submissions = [];
let teams = [];
let questions = [];
let bannedTeams = [];
let currentEditTeam = null;

// Format time taken from seconds to MM:SS
function formatTimeTaken(seconds) {
    if (!seconds || seconds <= 0) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

// Load data on page load (only if already logged in)
document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        loadSubmissions();
    }
});

// Fetch submissions from server
async function loadSubmissions() {
    try {
        const response = await fetch('/api/admin/submissions');
        const data = await response.json();

        if (!data.success) {
            showError('Failed to load submissions');
            return;
        }

        submissions = data.submissions;
        teams = data.teams || [];
        questions = data.questions;

        // Update statistics
        updateStatistics();

        // Display submissions table
        displaySubmissionsTable();

        // Display banned teams table
        displayBannedTeamsTable();

    } catch (error) {
        console.error('Error loading submissions:', error);
        showError('Network error loading submissions');
    }
}

// Update statistics cards
function updateStatistics() {
    // Use registered teams count for total teams
    const totalTeams = teams.length;
    document.getElementById('totalSubmissions').textContent = totalTeams;

    // Group submissions by team name to calculate total scores per team
    const groupedSubmissions = {};
    submissions.forEach(submission => {
        if (!groupedSubmissions[submission.teamName]) {
            groupedSubmissions[submission.teamName] = [];
        }
        groupedSubmissions[submission.teamName].push(submission);
    });

    // Calculate total scores for each team that has submitted
    const teamTotals = Object.values(groupedSubmissions).map(teamSubmissions => {
        return teamSubmissions.reduce((sum, sub) => sum + sub.score, 0);
    });

    if (teamTotals.length === 0) {
        document.getElementById('avgScore').textContent = '0';
        document.getElementById('highestScore').textContent = '0';
        return;
    }

    const totalScore = teamTotals.reduce((sum, score) => sum + score, 0);
    const avgScore = Math.round(totalScore / teamTotals.length);
    const highestScore = Math.max(...teamTotals);

    document.getElementById('avgScore').textContent = avgScore;
    document.getElementById('highestScore').textContent = highestScore;
}

// Display submissions in table
function displaySubmissionsTable() {
    const container = document.getElementById('tableContainer');

    if (teams.length === 0) {
        container.innerHTML = '<p class="no-data">No teams registered yet. Waiting for teams to register...</p>';
        return;
    }

    // Group submissions by team name
    const groupedSubmissions = {};
    submissions.forEach(submission => {
        if (!groupedSubmissions[submission.teamName]) {
            groupedSubmissions[submission.teamName] = {};
        }
        groupedSubmissions[submission.teamName][submission.roundNumber] = submission;
    });

    // Build teams array from registered teams (not just submissions)
    const teamsArray = teams.map(team => {
        const teamName = team.teamName;
        const rounds = groupedSubmissions[teamName] || {};
        // Calculate total score and total time for ranking
        let totalScore = 0;
        let totalTimeTaken = 0;
        for (let i = 1; i <= 4; i++) {
            if (rounds[i]) {
                totalScore += rounds[i].score;
                totalTimeTaken += (rounds[i].timeTaken || 0);
            }
        }
        return { teamName, rounds, totalScore, totalTimeTaken, registeredAt: team.registeredAt };
    }).sort((a, b) => b.totalScore - a.totalScore); // Sort by total score descending

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Team Name</th>
                    <th>Round 1<br><small style="font-size: 0.7em; opacity: 0.8;">(Score | Time Taken)</small></th>
                    <th>Round 2<br><small style="font-size: 0.7em; opacity: 0.8;">(Score | Time Taken)</small></th>
                    <th>Round 3<br><small style="font-size: 0.7em; opacity: 0.8;">(Score | Time Taken)</small></th>
                    <th>Round 4<br><small style="font-size: 0.7em; opacity: 0.8;">(Score | Time Taken)</small></th>
                    <th>Total Score</th>
                    <th>Total Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    teamsArray.forEach((teamData, index) => {
        const rank = index + 1;
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        tableHTML += `
            <tr>
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td><strong>${escapeHtml(teamData.teamName)}</strong></td>
        `;

        // Add scores and time taken for each round
        for (let roundNum = 1; roundNum <= 4; roundNum++) {
            if (teamData.rounds[roundNum]) {
                const submission = teamData.rounds[roundNum];
                const timeTakenFormatted = formatTimeTaken(submission.timeTaken);
                tableHTML += `
                    <td>
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                            <span class="score-badge">${submission.score}</span>
                            <small style="color: #28a745; font-size: 0.75em; font-weight: 600;">${timeTakenFormatted}</small>
                        </div>
                        <div class="round-actions">
                            <button class="btn-view small-btn" onclick="viewDetails('${escapeHtml(submission.teamName)}', ${submission.roundNumber})">V</button>
                            <button class="btn-edit small-btn" onclick="openEditModal('${escapeHtml(submission.teamName)}', ${submission.roundNumber}, ${submission.score})">E</button>
                        </div>
                    </td>
                `;
            } else {
                tableHTML += `
                    <td><span class="score-badge" style="background: #6c757d;">-</span></td>
                `;
            }
        }

        // Add total score, total time, and actions
        const totalTimeFormatted = formatTimeTaken(teamData.totalTimeTaken);
        tableHTML += `
                <td><strong>${teamData.totalScore}</strong></td>
                <td><span style="color: #007bff; font-weight: 600;">${totalTimeFormatted}</span></td>
                <td>
                    <button class="btn-view" onclick="viewAllRounds('${escapeHtml(teamData.teamName)}')">View All</button>
                    <button class="btn-delete" onclick="deleteTeam('${escapeHtml(teamData.teamName)}')">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// View submission details
function viewDetails(teamName, roundNumber) {
    const submission = submissions.find(sub => sub.teamName === teamName && sub.roundNumber === roundNumber);
    if (!submission) {
        alert('Submission not found');
        return;
    }

    const timeTakenFormatted = formatTimeTaken(submission.timeTaken);

    // Filter questions for this specific round only
    const roundQuestions = questions.filter(q => q.roundNumber === roundNumber);

    let detailsHTML = `
        <h3>Team: ${escapeHtml(teamName)}</h3>
        <p><strong>Round:</strong> ${roundNumber}</p>
        <p><strong>Total Score:</strong> ${submission.score}</p>
        <p><strong>Time Taken:</strong> <span style="color: #28a745; font-weight: 600;">${timeTakenFormatted}</span></p>
        <p><strong>Submitted At:</strong> ${new Date(submission.submittedAt).toLocaleString()}</p>
        <hr style="margin: 20px 0;">
    `;

    roundQuestions.forEach((question, index) => {
        const userAnswer = submission.answers[question.id] || 'No answer';
        const correctAnswer = Array.isArray(question.correctAnswer)
            ? question.correctAnswer.join(' / ')
            : question.correctAnswer;

        // Check if answer is correct
        const isCorrect = checkAnswer(userAnswer, question.correctAnswer, question.type);
        const statusClass = isCorrect ? 'correct' : 'incorrect';
        const statusIcon = isCorrect ? '✅' : '❌';
        const scoreText = isCorrect ? `+${question.marks} marks` : '0 marks';

        detailsHTML += `
            <div class="answer-row ${statusClass}">
                <div class="answer-question">
                    <span class="status-icon">${statusIcon}</span>
                    <strong>Question ${index + 1}:</strong> ${escapeHtml(question.question)}
                </div>
                <div class="answer-section">
                    <div class="answer-block">
                        <span class="answer-label">Team's Answer:</span>
                        <div class="answer-box">${escapeHtml(userAnswer)}</div>
                    </div>
                    <div class="answer-block">
                        <span class="answer-label">Correct Answer:</span>
                        <div class="answer-box correct-answer-box">${escapeHtml(correctAnswer)}</div>
                    </div>
                </div>
                <div class="score-info">
                    <span class="answer-label">Score:</span> <strong>${scoreText}</strong>
                </div>
            </div>
        `;
    });

    document.getElementById('detailsContent').innerHTML = detailsHTML;
    document.getElementById('detailsModal').classList.add('show');
}

// View all rounds for a team
function viewAllRounds(teamName) {
    // Get all rounds for this team
    const teamSubmissions = submissions.filter(sub => sub.teamName === teamName);

    if (teamSubmissions.length === 0) {
        alert('No submissions found for this team');
        return;
    }

    let detailsHTML = `
        <h3>All Rounds - Team: ${escapeHtml(teamName)}</h3>
        <hr style="margin: 20px 0;">
    `;

    // Sort by round number
    teamSubmissions.sort((a, b) => a.roundNumber - b.roundNumber);

    // Calculate total score
    const totalScore = teamSubmissions.reduce((sum, sub) => sum + sub.score, 0);

    detailsHTML += `
        <p><strong>Total Score:</strong> ${totalScore}</p>
        <p><strong>Rounds Participated:</strong> ${teamSubmissions.length}</p>
        <hr style="margin: 20px 0;">
    `;

    teamSubmissions.forEach(submission => {
        const timeTakenFormatted = formatTimeTaken(submission.timeTaken);
        detailsHTML += `
            <div class="round-summary">
                <h4>Round ${submission.roundNumber}: ${submission.score} points</h4>
                <p><strong>Time Taken:</strong> <span style="color: #28a745; font-weight: 600;">${timeTakenFormatted}</span></p>
                <p><strong>Submitted At:</strong> ${new Date(submission.submittedAt).toLocaleString()}</p>
                <button class="btn-view" style="margin-top: 10px;" onclick="viewDetails('${escapeHtml(submission.teamName)}', ${submission.roundNumber})">View Round Details</button>
                <hr style="margin: 20px 0;">
            </div>
        `;
    });

    document.getElementById('detailsContent').innerHTML = detailsHTML;
    document.getElementById('detailsModal').classList.add('show');
}

// Check if answer is correct (client-side for display)
function checkAnswer(userAnswer, correctAnswerData, questionType) {
    if (!userAnswer || userAnswer === 'No answer') return false;

    if (questionType === 'mcq') {
        return userAnswer === correctAnswerData;
    } else if (questionType === 'text') {
        const correctAnswers = Array.isArray(correctAnswerData) ? correctAnswerData : [correctAnswerData];
        const normalizedUserAnswer = normalizeText(userAnswer);
        return correctAnswers.some(correctAns => normalizeText(correctAns) === normalizedUserAnswer);
    }
    return false;
}

// Normalize text for comparison
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Open edit score modal
function openEditModal(teamName, roundNumber, currentScore) {
    currentEditTeam = { name: teamName, round: roundNumber };
    document.getElementById('editTeamName').textContent = `${teamName} (Round ${roundNumber})`;
    document.getElementById('newScore').value = currentScore;
    document.getElementById('editModal').classList.add('show');
}

// Close modals
function closeModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    currentEditTeam = null;
}

// Save edited score
async function saveScore() {
    const newScore = parseInt(document.getElementById('newScore').value);

    if (isNaN(newScore) || newScore < 0) {
        alert('Please enter a valid score');
        return;
    }

    try {
        const response = await fetch('/api/admin/update-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamName: currentEditTeam.name,
                roundNumber: currentEditTeam.round,
                newScore: newScore
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Score updated successfully!');
            closeEditModal();
            refreshData();
        } else {
            alert('Failed to update score: ' + data.message);
        }

    } catch (error) {
        console.error('Error updating score:', error);
        alert('Network error updating score');
    }
}

// Refresh data
function refreshData() {
    loadSubmissions();
}

// Delete team
async function deleteTeam(teamName) {
    if (!confirm(`Are you sure you want to delete all submissions for team "${teamName}"?\n\nThis action cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin/delete-team', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamName: teamName })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Team "${teamName}" has been deleted successfully.`);
            refreshData();
        } else {
            alert('Failed to delete team: ' + data.message);
        }

    } catch (error) {
        console.error('Error deleting team:', error);
        alert('Network error deleting team');
    }
}

// Export to CSV
function exportToCSV() {
    if (submissions.length === 0) {
        alert('No data to export');
        return;
    }

    // Group submissions by team name
    const groupedSubmissions = {};
    submissions.forEach(submission => {
        if (!groupedSubmissions[submission.teamName]) {
            groupedSubmissions[submission.teamName] = {};
        }
        groupedSubmissions[submission.teamName][submission.roundNumber] = submission;
    });

    // Convert to array and sort by total score
    const teamsArray = Object.entries(groupedSubmissions).map(([teamName, rounds]) => {
        // Calculate total score and total time for ranking
        let totalScore = 0;
        let totalTimeTaken = 0;
        for (let i = 1; i <= 4; i++) {
            if (rounds[i]) {
                totalScore += rounds[i].score;
                totalTimeTaken += (rounds[i].timeTaken || 0);
            }
        }
        return { teamName, rounds, totalScore, totalTimeTaken };
    }).sort((a, b) => b.totalScore - a.totalScore); // Sort by total score descending

    // CSV headers
    let csv = 'Rank,Team Name,Round 1 Score,Round 1 Time,Round 2 Score,Round 2 Time,Round 3 Score,Round 3 Time,Round 4 Score,Round 4 Time,Total Score,Total Time\n';

    // CSV rows
    teamsArray.forEach((teamData, index) => {
        const rank = index + 1;

        // Get data for each round
        let roundData = [];
        for (let roundNum = 1; roundNum <= 4; roundNum++) {
            if (teamData.rounds[roundNum]) {
                const submission = teamData.rounds[roundNum];
                const timeTakenFormatted = formatTimeTaken(submission.timeTaken);
                roundData.push(`${submission.score},"${timeTakenFormatted}"`);
            } else {
                roundData.push(`-,"-"`);
            }
        }

        const totalTimeFormatted = formatTimeTaken(teamData.totalTimeTaken);
        csv += `${rank},"${escapeHtml(teamData.teamName)}",${roundData[0]},${roundData[1]},${roundData[2]},${roundData[3]},${teamData.totalScore},"${totalTimeFormatted}"\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition_results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('CSV file downloaded successfully!');
}

// Show error message
function showError(message) {
    const container = document.getElementById('tableContainer');
    container.innerHTML = `<p class="no-data" style="color: #dc3545;">${escapeHtml(message)}</p>`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Display banned teams table
function displayBannedTeamsTable() {
    const container = document.getElementById('bannedTableContainer');

    // Get banned teams from localStorage (since ban is stored client-side)
    bannedTeams = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('banned_')) {
            const teamName = key.replace('banned_', '');
            const banTime = localStorage.getItem(`${teamName}_ban_time`) || 'Unknown';
            bannedTeams.push({ teamName, banTime });
        }
    }

    if (bannedTeams.length === 0) {
        container.innerHTML = '<p class="no-data">No teams have been disqualified.</p>';
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Team Name</th>
                    <th>Reason</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    bannedTeams.forEach((team, index) => {
        tableHTML += `
            <tr style="background: #3a1f1f;">
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(team.teamName)}</strong></td>
                <td style="color: #ff8888;">Exited full-screen mode</td>
                <td>
                    <button class="btn-view" onclick="unbanTeam('${escapeHtml(team.teamName)}')">Unban</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// Unban a team
function unbanTeam(teamName) {
    if (!confirm(`Are you sure you want to unban team "${teamName}"?`)) {
        return;
    }

    // Remove ban from localStorage
    localStorage.removeItem(`banned_${teamName}`);
    localStorage.removeItem(`${teamName}_ban_time`);

    // Refresh display
    displayBannedTeamsTable();

    alert(`Team "${teamName}" has been unbanned.`);
}

// Auto-refresh every 10 seconds
setInterval(() => {
    loadSubmissions();
}, 10000);
