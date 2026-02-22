const { teams } = require('./data');

// Helper function to normalize text for comparison
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
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
    const { teamName } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    const teamKey = teamName.trim().toLowerCase();
    
    if (teams.has(teamKey)) {
      return res.json({ success: true, message: 'Team already registered' });
    }

    teams.set(teamKey, {
      teamName: teamName.trim(),
      registeredAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Team registered successfully' });
  } catch (error) {
    console.error('Error registering team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
