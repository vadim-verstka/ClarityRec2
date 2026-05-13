const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Хранилище данных пользователей и событий
const userDataStore = {};

// API для получения данных пользователя (для проверки прав)
app.get('/api/user-data/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userDataStore[userId]) {
    userDataStore[userId] = { events: [], recommendations: null };
  }
  res.json({ success: true, userId });
});

// API для отправки событий (лайков)
app.post('/api/events', (req, res) => {
  const { userId, eventType, itemId, itemCategory } = req.body;
  
  if (!userId || !eventType || !itemId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!userDataStore[userId]) {
    userDataStore[userId] = { events: [], recommendations: null };
  }
  
  // Записываем событие
  userDataStore[userId].events.push({
    eventType,
    itemId,
    itemCategory,
    timestamp: new Date().toISOString()
  });
  
  // Подсчитываем лайки по категориям (учитываем unlike)
  const categoryCounts = {};
  userDataStore[userId].events.forEach(event => {
    if (event.itemCategory) {
      if (event.eventType === 'like') {
        categoryCounts[event.itemCategory] = (categoryCounts[event.itemCategory] || 0) + 1;
      } else if (event.eventType === 'unlike') {
        categoryCounts[event.itemCategory] = (categoryCounts[event.itemCategory] || 0) - 1;
        // Не допускаем отрицательных значений
        if (categoryCounts[event.itemCategory] <= 0) {
          delete categoryCounts[event.itemCategory];
        }
      }
    }
  });
  
  // Формируем рекомендации с весами
  const recommendations = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      weight: count,
      trigger: 'like'
    }))
    .sort((a, b) => b.weight - a.weight);
  
  userDataStore[userId].recommendations = recommendations;
  
  res.json({ 
    success: true, 
    totalLikes: userDataStore[userId].events.filter(e => e.eventType === 'like').length,
    recommendations 
  });
});

// API для получения рекомендаций
app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userDataStore[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const likesCount = userDataStore[userId].events.filter(e => e.eventType === 'like').length;
  
  if (likesCount < 5) {
    return res.status(403).json({ 
      error: 'Not enough data for recommendations',
      likesCount,
      required: 5
    });
  }
  
  res.json({
    success: true,
    recommendations: userDataStore[userId].recommendations || []
  });
});

app.listen(PORT, () => {
  console.log(`Recommendation Module running on port ${PORT}`);
});
