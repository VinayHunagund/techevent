const { questions, roundTimers } = require('./data');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const roundNumber = parseInt(req.query.round) || 1;

    const roundQuestions = questions
      .filter(q => q.round_number === roundNumber)
      .map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        marks: q.marks
      }));

    const timerMinutes = roundTimers[roundNumber] || 30;

    res.json({
      success: true,
      questions: roundQuestions,
      timerMinutes: timerMinutes,
      roundNumber: roundNumber
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
