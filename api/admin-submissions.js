const { submissions, teams } = require('./data');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get all submissions
    const allSubmissions = Array.from(submissions.values());
    
    // Get all teams
    const allTeams = Array.from(teams.values());

    res.json({
      success: true,
      submissions: allSubmissions,
      teams: allTeams,
      totalSubmissions: allSubmissions.length,
      totalTeams: allTeams.length
    });

  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
