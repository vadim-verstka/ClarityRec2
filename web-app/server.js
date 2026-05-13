const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage
const users = [
  { id: '1', username: 'admin', password: 'cradmin123', role: 'admin' }
];
const userCards = {}; // { userId: [cardIds] }
const userLikes = {}; // { userId: [cardId] }

// Generate 30 random cards with fixed seed for consistency
const categories = ['Technology', 'Sports', 'Music', 'Movies', 'Books', 'Food', 'Travel', 'Art'];
const cards = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  title: `Card ${i + 1}`,
  description: `This is a brief description for card ${i + 1}.`,
  category: categories[i % categories.length],
  image: `https://picsum.photos/seed/${i + 1}/300/200`
}));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !users.find(u => u.id === token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = users.find(u => u.id === token);
  next();
}

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// Get all users (admin only)
app.get('/api/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const userList = users.filter(u => u.role !== 'admin').map(u => ({ id: u.id, username: u.username }));
  res.json({ users: userList });
});

// Create new user
app.post('/api/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  const newUser = {
    id: String(users.length + 1),
    username,
    password: 'default123',
    role: 'user'
  };
  
  users.push(newUser);
  res.json({ user: { id: newUser.id, username: newUser.username } });
});

// Get cards for user
app.get('/api/cards/:userId', (req, res) => {
  const { userId } = req.params;
  const likes = userLikes[userId] || [];
  
  let availableCards;
  if (likes.length >= 5) {
    // Get recommended cards from recommendation module
    availableCards = cards; // Will be filtered by frontend based on recommendations
  } else {
    // Random cards
    availableCards = [...cards].sort(() => Math.random() - 0.5).slice(0, 10);
  }
  
  res.json({ cards: availableCards, hasRecommendations: likes.length >= 5 });
});

// Like a card
app.post('/api/cards/:userId/like', async (req, res) => {
  const { userId } = req.params;
  const { cardId } = req.body;
  
  if (!userLikes[userId]) {
    userLikes[userId] = [];
  }
  
  userLikes[userId].push(cardId);
  const card = cards.find(c => c.id === cardId);
  
  // Send event to recommendation module
  try {
    await fetch('http://localhost:3001/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `user_${userId}`,
        event: 'like',
        item: cardId,
        category: card.category
      })
    });
  } catch (error) {
    console.error('Failed to send event to recommendation module:', error);
  }
  
  const totalLikes = userLikes[userId].length;
  res.json({ success: true, totalLikes });
});

// Get user like count
app.get('/api/users/:userId/likes', (req, res) => {
  const { userId } = req.params;
  const likes = userLikes[userId] || [];
  res.json({ totalLikes: likes.length });
});

app.listen(PORT, () => {
  console.log(`Web App running on port ${PORT}`);
  console.log(`Admin login: admin / cradmin123`);
});
