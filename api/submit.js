const { submissions, questions } = require('./data');

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
    return userAnswer === correctAnswerData;
  } else if (questionType === 'text') {
    let correctAnswers = [];
    try {
      correctAnswers = JSON.parse(correctAnswerData);
    } catch (e) {
      correctAnswers = [correctAnswerData];
    }

    const normalizedUserAnswer = normalizeText(userAnswer);

    return correctAnswers.some(correctAns =>
      normalizeText(correctAns) === normalizedUserAnswer
    );
  }
  return false;
}

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { teamName, roundNumber, answers, timeTaken } = req.body;

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
    const submissionKey = `${teamName.trim().toLowerCase()}-${roundNumber}`;
    if (submissions.has(submissionKey)) {
      return res.status(400).json({ success: false, message: `This team has already submitted answers for Round ${roundNumber}` });
    }

    // Calculate score
    let totalScore = 0;
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer && checkAnswer(userAnswer, question.correct_answer, question.type)) {
        totalScore += question.marks;
      }
    });

    // Save submission
    const submittedAt = new Date().toISOString();
    const timeTakenSeconds = timeTaken || 0;
    
    submissions.set(submissionKey, {
      teamName: teamName.trim(),
      roundNumber: roundNumber,
      answers: answers,
      score: totalScore,
      submittedAt: submittedAt,
      timeTaken: timeTakenSeconds
    });

    res.json({
      success: true,
      message: 'Submission successful!',
      score: totalScore
    });

  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({ success: false, message: 'Server error during submission' });
  }
};
