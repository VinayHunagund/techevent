# Offline Competition Round Application

## 🎯 Overview
Complete offline web application for hosting competition rounds with 40-50 teams over local Wi-Fi.

## ✨ Features
- ✅ Fully offline operation (no internet required)
- ✅ SQLite database for local storage
- ✅ Auto-checking MCQ and text answers
- ✅ Countdown timer with auto-submit
- ✅ One submission per team
- ✅ Admin dashboard with real-time updates
- ✅ Score calculation and ranking
- ✅ CSV export functionality
- ✅ Anti-cheat measures

## 📋 Prerequisites
- Node.js (v14 or higher)
- npm or yarn

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Access the Application

**Team Access:**
- Open: `http://192.168.x.x:3000` (your local IP will be shown in terminal)
- Share this URL with all teams via Wi-Fi

**Admin Access:**
- Open: `http://192.168.x.x:3000/admin/admin.html`

## 📁 Project Structure
```
offline-round/
├── server.js              # Express server with all APIs
├── database.db            # SQLite database (auto-created)
├── package.json           # Dependencies
├── /public                # Team-side files
│   ├── index.html         # Instructions + team entry
│   ├── round.html         # Questions page
│   ├── style.css          # Styling
│   └── script.js          # Team-side logic
└── /admin                 # Admin panel
    ├── admin.html         # Admin dashboard
    └── admin.js           # Admin logic
```

## 🎮 Usage Guide

### For Teams:
1. Connect to the local Wi-Fi
2. Open the provided URL in browser
3. Read instructions carefully
4. Enter team name (minimum 3 characters)
5. Click "Start Round"
6. Answer all questions
7. Submit before timer expires

### For Admins:
1. Access admin panel using admin URL
2. View real-time submissions
3. Check auto-calculated scores
4. View detailed answers for each team
5. Manually edit scores if needed
6. Export results as CSV

## 🔧 Customization

### Adding/Editing Questions
Edit the questions in `server.js` (lines 35-75):

```javascript
insertQuestion.run(
    'Your question text here?',
    'mcq',  // or 'text'
    JSON.stringify(['Option 1', 'Option 2', 'Option 3', 'Option 4']),
    'Correct Answer',
    10  // marks
);
```

### Changing Timer Duration
Modify the timer value in `server.js` (line 82):
```javascript
db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('timer_minutes', '30');
```

### Text Answer Normalization
The system automatically:
- Converts to lowercase
- Removes spaces and special characters
- Compares with multiple correct answers

Example:
```javascript
// Both "steganography" and "stegano graphy" are accepted
JSON.stringify(['steganography', 'stegano graphy', 'stego'])
```

## 🔐 Security Features
- Answer checking ONLY on server
- One submission per team name
- Disabled inspect element (F12)
- Disabled right-click
- Back button prevention
- Refresh warning
- IP address logging

## 📊 Admin Features
- Real-time submission tracking
- Auto-refresh every 10 seconds
- Sorted by score (descending)
- View detailed answers
- Check correct/incorrect answers
- Manual score override
- CSV export with rankings

## 🌐 Network Setup
1. Create Wi-Fi hotspot on your laptop
2. Note the IP address (shown in terminal)
3. Share IP with all teams
4. Ensure all devices are on same network

## 🐛 Troubleshooting

### Teams can't access the site
- Check firewall settings
- Ensure all devices on same network
- Verify IP address is correct

### Database errors
- Delete `database.db` and restart server
- Database will be recreated automatically

### Questions not showing
- Check browser console for errors
- Verify server is running
- Check network connection

## 📝 Notes
- Database file (`database.db`) persists between restarts
- To reset competition, delete `database.db` and restart
- All data stored locally - NO cloud services
- Sample questions included - customize before event

## 🎉 Event Day Checklist
- [ ] Test with 2-3 sample teams
- [ ] Verify timer works correctly
- [ ] Check auto-submit functionality
- [ ] Test admin dashboard
- [ ] Prepare Wi-Fi hotspot
- [ ] Note down local IP address
- [ ] Have backup laptop ready
- [ ] Test CSV export
- [ ] Verify all questions are correct
- [ ] Set appropriate timer duration

## 📞 Support
For issues during the event:
1. Check server terminal for errors
2. Restart server if needed
3. Database persists - submissions safe

---
Built for offline competition rounds with 40-50 teams.
All features tested and production-ready.
