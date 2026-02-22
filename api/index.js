// Main API entry point for Vercel
const registerTeam = require('./register-team');
const questions = require('./questions');
const submit = require('./submit');
const adminSubmissions = require('./admin-submissions');

module.exports = (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url || '';
  
  // Route requests to appropriate handler
  if (path.startsWith('/register-team')) {
    return registerTeam(req, res);
  } else if (path.startsWith('/questions')) {
    return questions(req, res);
  } else if (path.startsWith('/submit')) {
    return submit(req, res);
  } else if (path.startsWith('/admin-submissions')) {
    return adminSubmissions(req, res);
  } else {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
};
