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

// API для отправки событий (любых триггеров)
app.post('/api/events', (req, res) => {
  const { userId, eventType, itemId, itemCategory } = req.body;
  
  if (!userId || !eventType || !itemId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!userDataStore[userId]) {
    userDataStore[userId] = { events: [], recommendations: null };
  }
  
  // Записываем событие (любой тип триггера)
  userDataStore[userId].events.push({
    eventType,
    itemId,
    itemCategory,
    timestamp: new Date().toISOString()
  });
  
  // Подсчитываем веса по категориям для всех типов событий
  const categoryCounts = {};
  userDataStore[userId].events.forEach(event => {
    if (event.itemCategory) {
      // Разные типы событий могут иметь разный вес
      let weightChange = 0;
      
      if (event.eventType === 'like') {
        weightChange = 1;
      } else if (event.eventType === 'unlike') {
        weightChange = -1;
      } else if (event.eventType === 'read_more') {
        // Раскрытие текста тоже считается как интерес, но с меньшим весом
        weightChange = 0.5;
      }
      // Можно легко добавить другие типы событий здесь
      
      categoryCounts[event.itemCategory] = (categoryCounts[event.itemCategory] || 0) + weightChange;
      
      // Не допускаем отрицательных значений
      if (categoryCounts[event.itemCategory] <= 0) {
        delete categoryCounts[event.itemCategory];
      }
    }
  });
  
  // Формируем рекомендации с весами и типами триггеров
  const recommendations = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      weight: count,
      trigger: 'multiple' // Общий триггер, детализация в событиях
    }))
    .sort((a, b) => b.weight - a.weight);
  
  userDataStore[userId].recommendations = recommendations;
  
  // Считаем общее количество активных событий (для порога активации рекомендаций)
  const totalLikes = userDataStore[userId].events.filter(e => e.eventType === 'like').length;
  const totalUnlikes = userDataStore[userId].events.filter(e => e.eventType === 'unlike').length;
  const activeLikes = totalLikes - totalUnlikes;
  
  res.json({ 
    success: true, 
    totalLikes: activeLikes,
    recommendations 
  });
});

// API для получения рекомендаций
app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userDataStore[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Считаем активные лайки (like - unlike)
  const totalLikes = userDataStore[userId].events.filter(e => e.eventType === 'like').length;
  const totalUnlikes = userDataStore[userId].events.filter(e => e.eventType === 'unlike').length;
  const activeLikes = totalLikes - totalUnlikes;
  
  // Для формирования рекомендаций нужно минимум 5 активных лайков
  if (activeLikes < 5) {
    return res.status(403).json({ 
      error: 'Not enough data for recommendations',
      likesCount: activeLikes,
      required: 5
    });
  }
  
  // Возвращаем рекомендации и события для модуля объяснений
  res.json({
    success: true,
    recommendations: userDataStore[userId].recommendations || [],
    events: userDataStore[userId].events
  });
});

// API для получения событий пользователя
app.get('/api/events/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userDataStore[userId]) {
    return res.json({ success: true, events: [] });
  }
  
  res.json({ success: true, events: userDataStore[userId].events });
});

app.listen(PORT, () => {
  console.log(`Recommendation Module running on port ${PORT}`);
});
