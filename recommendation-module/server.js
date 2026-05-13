const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In-memory storage for user events and recommendations
const userEvents = {}; // { userId: [{ event, item, category }] }
const userRecommendations = {}; // { userId: [{ category, weight }] }

// API: Receive events from any website
app.post('/api/events', (req, res) => {
  const { userId, event, item, category } = req.body;
  
  if (!userId || !event) {
    return res.status(400).json({ error: 'userId and event are required' });
  }

  if (!userEvents[userId]) {
    userEvents[userId] = [];
  }

  userEvents[userId].push({ event, item, category, timestamp: Date.now() });

  // Check if we have enough events to generate recommendations (5 likes)
  const likes = userEvents[userId].filter(e => e.event === 'like');
  
  if (likes.length >= 5) {
    const recommendations = generateRecommendations(userId);
    userRecommendations[userId] = recommendations;
    
    return res.json({ 
      message: 'Event recorded', 
      recommendationsReady: true,
      totalLikes: likes.length 
    });
  }

  res.json({ 
    message: 'Event recorded', 
    recommendationsReady: false,
    totalLikes: likes.length 
  });
});

// Generate recommendations based on user events
function generateRecommendations(userId) {
  const events = userEvents[userId] || [];
  const likes = events.filter(e => e.event === 'like');
  
  // Count category occurrences
  const categoryCount = {};
  likes.forEach(like => {
    const cat = like.category;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Convert to array with weights and sort by weight descending
  const recommendations = Object.entries(categoryCount)
    .map(([category, count]) => ({
      category,
      weight: count
    }))
    .sort((a, b) => b.weight - a.weight);

  return recommendations;
}

// API: Get recommendations for a user
app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  const recommendations = userRecommendations[userId] || [];
  
  res.json({ recommendations });
});

// API: Check if recommendations are ready
app.get('/api/status/:userId', (req, res) => {
  const { userId } = req.params;
  const events = userEvents[userId] || [];
  const likes = events.filter(e => e.event === 'like');
  const hasRecommendations = !!userRecommendations[userId];
  
  res.json({ 
    totalLikes: likes.length,
    hasRecommendations,
    recommendationsReady: likes.length >= 5
  });
});

// API: Get all events for a user (for explanation module)
app.get('/api/user-data/:userId', (req, res) => {
  const { userId } = req.params;
  const events = userEvents[userId] || [];
  const recommendations = userRecommendations[userId] || [];
  
  // Allow access from any origin for integration
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ events, recommendations });
});

app.listen(PORT, () => {
  console.log(`Recommendation Module running on port ${PORT}`);
});
