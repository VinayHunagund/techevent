const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 5000;

// Check environment
const isVercel = process.env.VERCEL === '1';
const useTurso = !!process.env.TURSO_DATABASE_URL;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ========== DATABASE ABSTRACTION LAYER ==========
let sqlJsDb = null;
let tursoClient = null;

// Execute SQL and return results in consistent format: [{columns, values}]
async function dbExec(sql) {
  if (useTurso) {
    const result = await tursoClient.execute(sql);
    if (!result.rows || result.rows.length === 0) return [];
    return [{
      columns: result.columns,
      values: result.rows.map(row => result.columns.map((_, i) => row[i]))
    }];
  } else {
    return sqlJsDb.exec(sql);
  }
}

// Execute SQL with parameters (INSERT, UPDATE, DELETE)
async function dbRun(sql, params = []) {
  if (useTurso) {
    await tursoClient.execute({ sql, args: params });
  } else {
    sqlJsDb.run(sql, params);
  }
}

// Save database to file (sql.js only; Turso auto-persists)
function saveDb() {
  if (!useTurso && sqlJsDb) {
    const data = sqlJsDb.export();
    const dbFilePath = path.join(__dirname, 'database.db');
    fs.writeFileSync(dbFilePath, Buffer.from(data));
  }
}

// ========== DATABASE INITIALIZATION ==========
let dbReady = null;

// Ensure DB is ready before each API request
app.use('/api', async (req, res, next) => {
  if (dbReady) await dbReady;
  next();
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function initDatabase() {
  // Initialize database connection
  if (useTurso) {
    const { createClient } = require('@libsql/client');
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('Using Turso cloud database');
  } else {
    const initSqlJs = require('sql.js');
    const dbFilePath = path.join(__dirname, 'database.db');
    const SQL = await initSqlJs({
      locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
    });
    if (fs.existsSync(dbFilePath)) {
      sqlJsDb = new SQL.Database(fs.readFileSync(dbFilePath));
    } else {
      sqlJsDb = new SQL.Database();
    }
    console.log('Using local SQLite database');
  }

  // Create tables
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      type TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      marks INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      answers TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      submitted_at TEXT NOT NULL,
      ip_address TEXT,
      time_taken INTEGER DEFAULT 0,
      UNIQUE(team_name, round_number)
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS round_timers (
      round_number INTEGER PRIMARY KEY,
      timer_minutes INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT NOT NULL UNIQUE,
      registered_at TEXT NOT NULL,
      ip_address TEXT
    )`
  ];

  if (useTurso) {
    await tursoClient.batch(createTableStatements, 'write');
  } else {
    sqlJsDb.run(createTableStatements.join(';\n'));
  }

  // Insert sample questions if empty
  const questionCount = await dbExec('SELECT COUNT(*) as count FROM questions');
  if (!questionCount[0] || questionCount[0].values[0][0] === 0) {
    // ============ ROUND 1 - SQL Query Questions ============

    // Query 1: Most Frequent Demand Level
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, '1. Most Frequent Demand Level\n\nSELECT demand_level\nFROM AI_Predictions\nGROUP BY demand_level\nORDER BY COUNT(*) DESC\nLIMIT 1;',
        'text', null, JSON.stringify(['High', 'high']), 10]);

    // Query 2: Loyalty Level Generating Highest Revenue
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, '2. Loyalty Level Generating Highest Revenue\n\nSELECT c.loyalty_level\nFROM Customers c\nJOIN Orders o ON c.customer_id = o.customer_id\nGROUP BY c.loyalty_level\nORDER BY SUM(o.total_amount) DESC\nLIMIT 1;',
        'text', null, JSON.stringify(['Platinum', 'platinum']), 10]);

    // ============ ROUND 2 - Algorithm & DSA Challenge ============

    // Logic Reconstruction Question
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, 'Logic Reconstruction\n\nProblem Statement:\nArrange the following shuffled steps to form a complete algorithm that determines the minimum number of platforms required at a railway station so that no train has to wait.\n\nArrival[] and Departure[] times of trains are given.\n\nJumbled Process:\nA. Initialize platforms_needed = 0 and max_platforms = 0\nB. If next arrival time \u2264 next departure time\nC. Increment platforms_needed\nD. Decrement platforms_needed\nE. Sort arrival[] and departure[] arrays separately\nF. Move arrival pointer forward\nG. Move departure pointer forward\nH. Update max_platforms = max(max_platforms, platforms_needed)\nI. Start\nJ. While both pointers are within array length\nK. Stop and print max_platforms\nL. Initialize two pointers i = 0, j = 0\n\nWrite the correct sequence.',
        'text', null, JSON.stringify(['IEALJBCHFDGK', 'I,E,A,L,J,B,C,H,F,D,G,K', 'I E A L J B C H F D G K']), 10]);

    // DSA Question 2
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, 'DSA Problem - Question 2\n\nWhat is the output of the following code snippet?\n\nint main() {\n    static int x = 0;\n    if(x++ < 3) {\n        printf("hi ");\n        main();\n    }\n}',
        'mcq', JSON.stringify(['hi', 'hihihi', 'hihihihi', 'Infinite "hi" until crash']),
        'hihihi', 10]);

    // ============ ROUND 3 - Cloud Data Processing Center ============

    // Question 1: Identify the scheduling algorithm
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [3, '1. Identify the Scheduling Algorithm\n\nA cloud-based data processing company operates a single high-performance server that handles client data analysis jobs. The server can execute only one job at a time.\n\nThe scheduling policy followed by the server has the following characteristics:\n- At any moment, the job with the shortest remaining processing time is selected.\n- If a new job arrives with a shorter remaining time than the currently running job, the running job is preempted.\n- If two jobs have the same remaining time, the job that arrived earlier is selected.\n\nWhat is the name of this scheduling algorithm?',
        'text', null, JSON.stringify(['Shortest Remaining Time First', 'SRTF', 'shortest remaining time first', 'srtf']), 10]);

    // Question 2: Average Waiting Time
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [3, '2. Find the Average Waiting Time\n\nGiven the following jobs arriving at the server:\n\nJob ID          | Arrival Time (ms) | Processing Time (ms)\n----------------|-------------------|---------------------\nClient Job 1    | 0                 | 7\nClient Job 2    | 2                 | 4\nClient Job 3    | 4                 | 1\nClient Job 4    | 5                 | 4\nClient Job 5    | 6                 | 2\n\nUsing Shortest Remaining Time First (SRTF) scheduling, calculate the Average Waiting Time for all five jobs.',
        'text', null, JSON.stringify(['3.4', '3.4ms', '3.4 ms']), 10]);

    // Question 3: Average Turnaround Time
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [3, '3. Find the Average Turnaround Time\n\nGiven the same job data:\n\nJob ID          | Arrival Time (ms) | Processing Time (ms)\n----------------|-------------------|---------------------\nClient Job 1    | 0                 | 7\nClient Job 2    | 2                 | 4\nClient Job 3    | 4                 | 1\nClient Job 4    | 5                 | 4\nClient Job 5    | 6                 | 2\n\nUsing SRTF scheduling, calculate the Average Turnaround Time for all five jobs.',
        'text', null, JSON.stringify(['7', '7.0', '7ms', '7 ms', '7 milliseconds']), 10]);

    // Question 4: Starvation Problem
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [3, '4. Technical Name\n\nA cloud server is using Shortest Remaining Time First (SRTF) to process incoming data requests. Throughout the day, thousands of tiny 1ms "status check" packets arrive every millisecond. Meanwhile, a single 10GB "system backup" task has been sitting in the queue for 24 hours without processing a single byte.\n\nWhat is the technical name for the condition this backup task is experiencing?',
        'text', null, JSON.stringify(['Starvation', 'starvation', 'Process Starvation', 'process starvation', 'Indefinite Blocking', 'indefinite blocking']), 10]);

    // ============ ROUND 4 - Flowchart Analysis ============

    // Flowchart 1: Right Triangle Pattern
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [4, 'Question 1: Refer to Flowchart 1\n\nSelect suitable input and describe the final output of Flowchart 1 in textual format.',
        'text', null, JSON.stringify(['Right Angle Triangle', 'right angle triangle', 'Right angle triangle']), 10]);

    // Flowchart 2: Armstrong Number Check
    await dbRun(`INSERT INTO questions (round_number, question_text, type, options, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?)`,
      [4, 'Question 2: Refer to Flowchart 2\n\nWhat is Flowchart 2 designed to determine?\nWhere N = 153',
        'text', null, JSON.stringify(['Armstrong Number', 'armstrong number', 'Armstrong', 'armstrong', 'Narcissistic Number', 'narcissistic number']), 10]);

    // Set round timers
    await dbRun('INSERT INTO round_timers (round_number, timer_minutes) VALUES (?, ?)', [1, 25]);
    await dbRun('INSERT INTO round_timers (round_number, timer_minutes) VALUES (?, ?)', [2, 25]);
    await dbRun('INSERT INTO round_timers (round_number, timer_minutes) VALUES (?, ?)', [3, 25]);
    await dbRun('INSERT INTO round_timers (round_number, timer_minutes) VALUES (?, ?)', [4, 25]);

    saveDb();
    console.log('All rounds inserted: Round 1 (SQL), Round 2 (Algorithm & DSA), Round 3 (Cloud Data Processing), Round 4 (Flowchart Analysis)');
  }

  // Remove old timer setting
  const oldTimer = await dbExec('SELECT value FROM settings WHERE key = "timer_minutes"');
  if (oldTimer[0] && oldTimer[0].values.length > 0) {
    await dbRun('DELETE FROM settings WHERE key = ?', ['timer_minutes']);
    saveDb();
  }
}

// Helper function to normalize text for comparison
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Helper function to check answer
function checkAnswer(userAnswer, correctAnswerData, questionType) {
  if (questionType === 'mcq') {
    // Exact match for MCQ
    return userAnswer === correctAnswerData;
  } else if (questionType === 'text') {
    // Parse correct answers (can be array)
    let correctAnswers = [];
    try {
      correctAnswers = JSON.parse(correctAnswerData);
    } catch (e) {
      correctAnswers = [correctAnswerData];
    }

    // Normalize user answer
    const normalizedUserAnswer = normalizeText(userAnswer);

    // Check if matches any correct answer
    return correctAnswers.some(correctAns =>
      normalizeText(correctAns) === normalizedUserAnswer
    );
  }
  return false;
}

// API: Get team status (completed rounds)
app.get('/api/team-status', async (req, res) => {
  try {
    const teamName = req.query.teamName;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    const trimmedName = teamName.trim().replace(/'/g, "''");

    // Check if team exists in teams table
    const teamResult = await dbExec(`SELECT team_name FROM teams WHERE team_name = '${trimmedName}'`);
    const teamExists = teamResult[0] && teamResult[0].values.length > 0;

    // Get completed rounds from submissions table
    const submissionsResult = await dbExec(`SELECT round_number FROM submissions WHERE team_name = '${trimmedName}'`);
    const completedRounds = submissionsResult[0] ? submissionsResult[0].values.map(row => row[0]) : [];

    res.json({
      success: true,
      teamExists: teamExists,
      completedRounds: completedRounds
    });
  } catch (error) {
    console.error('Error checking team status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Register team
app.post('/api/register-team', async (req, res) => {
  try {
    const { teamName } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    const registeredAt = new Date().toISOString();

    try {
      await dbRun(`INSERT INTO teams (team_name, registered_at, ip_address) VALUES (?, ?, ?)`,
        [teamName.trim(), registeredAt, ipAddress]);
      saveDb();
      res.json({ success: true, message: 'Team registered successfully' });
    } catch (err) {
      // Team already exists
      res.json({ success: true, message: 'Team already registered' });
    }
  } catch (error) {
    console.error('Error registering team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Get questions (without correct answers) - filtered by round
app.get('/api/questions', async (req, res) => {
  try {
    const roundNumber = parseInt(req.query.round) || 1;

    const result = await dbExec(`SELECT id, question_text, type, options, marks FROM questions WHERE round_number = ${roundNumber} ORDER BY id`);
    const timerResult = await dbExec(`SELECT timer_minutes FROM round_timers WHERE round_number = ${roundNumber}`);

    const questions = result[0] ? result[0].values.map(row => ({
      id: row[0],
      question: row[1],
      type: row[2],
      options: row[3] ? JSON.parse(row[3]) : null,
      marks: row[4]
    })) : [];

    const timerMinutes = timerResult[0] && timerResult[0].values.length > 0
      ? parseInt(timerResult[0].values[0][0])
      : 30;

    res.json({
      success: true,
      questions: questions,
      timerMinutes: timerMinutes,
      roundNumber: roundNumber
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Submit answers
app.post('/api/submit', async (req, res) => {
  try {
    const { teamName, roundNumber, answers, timeTaken } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validation
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    if (!roundNumber || roundNumber < 1 || roundNumber > 4) {
      return res.status(400).json({ success: false, message: 'Invalid round number' });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid answers format' });
    }

    // Check if team already submitted for this round
    const existingResult = await dbExec(`SELECT id FROM submissions WHERE team_name = '${teamName.trim().replace(/'/g, "''")}' AND round_number = ${roundNumber}`);
    if (existingResult[0] && existingResult[0].values.length > 0) {
      return res.status(400).json({ success: false, message: `This team has already submitted answers for Round ${roundNumber}` });
    }

    // Get all questions with correct answers
    const questionsResult = await dbExec('SELECT id, type, correct_answer, marks FROM questions');
    const questions = questionsResult[0] ? questionsResult[0].values.map(row => ({
      id: row[0],
      type: row[1],
      correct_answer: row[2],
      marks: row[3]
    })) : [];

    // Calculate score
    let totalScore = 0;
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer && checkAnswer(userAnswer, question.correct_answer, question.type)) {
        totalScore += question.marks;
      }
    });

    // Save submission with current local timestamp and time taken
    const submittedAt = new Date().toISOString();
    const timeTakenSeconds = timeTaken || 0;
    await dbRun(`INSERT INTO submissions (team_name, round_number, answers, score, submitted_at, ip_address, time_taken) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [teamName.trim(), roundNumber, JSON.stringify(answers), totalScore, submittedAt, ipAddress, timeTakenSeconds]);

    saveDb();

    res.json({
      success: true,
      message: 'Submission successful!',
      score: totalScore
    });

  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({ success: false, message: 'Server error during submission: ' + error.message });
  }
});

// API: Admin - Get all submissions
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const submissionsResult = await dbExec(`
      SELECT id, team_name, round_number, answers, score, submitted_at, ip_address, time_taken 
      FROM submissions 
      ORDER BY round_number ASC, score DESC, submitted_at ASC
    `);

    const teamsResult = await dbExec(`
      SELECT team_name, registered_at, ip_address 
      FROM teams 
      ORDER BY registered_at ASC
    `);

    const questionsResult = await dbExec('SELECT id, question_text, type, correct_answer, marks, round_number FROM questions');

    const submissions = submissionsResult[0] ? submissionsResult[0].values.map(row => ({
      id: row[0],
      teamName: row[1],
      roundNumber: row[2],
      answers: JSON.parse(row[3]),
      score: row[4],
      submittedAt: row[5],
      ipAddress: row[6],
      timeTaken: row[7] || 0
    })) : [];

    const teams = teamsResult[0] ? teamsResult[0].values.map(row => ({
      teamName: row[0],
      registeredAt: row[1],
      ipAddress: row[2]
    })) : [];

    const questions = questionsResult[0] ? questionsResult[0].values.map(row => ({
      id: row[0],
      question: row[1],
      type: row[2],
      correctAnswer: row[2] === 'mcq' ? row[3] : JSON.parse(row[3]),
      marks: row[4],
      roundNumber: row[5]
    })) : [];

    res.json({
      success: true,
      submissions: submissions,
      teams: teams,
      questions: questions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Admin - Update score manually
app.post('/api/admin/update-score', async (req, res) => {
  try {
    const { teamName, roundNumber, newScore } = req.body;

    if (!teamName || !roundNumber || newScore === undefined) {
      return res.status(400).json({ success: false, message: 'Team name, round number, and score are required' });
    }

    await dbRun(`UPDATE submissions SET score = ? WHERE team_name = ? AND round_number = ?`,
      [parseInt(newScore), teamName, parseInt(roundNumber)]);
    saveDb();

    res.json({ success: true, message: 'Score updated successfully' });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Admin - Delete team and all their submissions
app.post('/api/admin/delete-team', async (req, res) => {
  try {
    const { teamName } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    // Delete all submissions for this team
    await dbRun(`DELETE FROM submissions WHERE team_name = ?`, [teamName.trim()]);
    // Delete team from teams table
    await dbRun(`DELETE FROM teams WHERE team_name = ?`, [teamName.trim()]);
    saveDb();

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Initialize database
dbReady = initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Start server only when running locally (not on Vercel)
if (!isVercel) {
  async function startServer() {
    await dbReady;

    app.listen(PORT, '0.0.0.0', () => {
      const localIp = getLocalIpAddress();
      console.log('\n========================================');
      console.log('\uD83C\uDFAF COMPETITION ROUND SERVER STARTED');
      console.log('========================================');
      console.log(`\n\uD83D\uDCE1 Server is running on port ${PORT}`);
      console.log(`\n\uD83C\uDF10 Access URLs:`);
      console.log(`   Local:    http://localhost:${PORT}`);
      console.log(`   Network:  http://${localIp}:${PORT}`);
      console.log(`\n\uD83D\uDC65 TEAM ACCESS: Share this URL with teams:`);
      console.log(`   http://${localIp}:${PORT}`);
      console.log(`\n\uD83D\uDD10 ADMIN PANEL:`);
      console.log(`   http://${localIp}:${PORT}/admin/admin.html`);
      console.log('\n========================================\n');
    });
  }

  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export for Vercel serverless
module.exports = app;
