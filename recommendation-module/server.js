const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Хранилище данных пользователей
// Структура: { userId: { recommendations: { entity: { totalWeight, events: [] } } } }
const userDataStore = {};

// API для получения данных пользователя (для проверки прав)
app.get('/api/user-data/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userDataStore[userId]) {
    userDataStore[userId] = { recommendations: {} };
  }
  res.json({ success: true, userId });
});

// API для отправки событий
// Ожидается: { userId, trigger, entity, weight }
app.post('/api/events', (req, res) => {
  const { userId, trigger, entity, weight } = req.body;
  
  if (!userId || !trigger || !entity || weight === undefined) {
    return res.status(400).json({ error: 'Missing required fields: userId, trigger, entity, weight' });
  }
  
  if (!userDataStore[userId]) {
    userDataStore[userId] = { recommendations: {} };
  }
  
  // Инициализируем сущность если нет
  if (!userDataStore[userId].recommendations[entity]) {
    userDataStore[userId].recommendations[entity] = {
      totalWeight: 0,
      events: []
    };
  }
  
  // Добавляем событие в историю
  userDataStore[userId].recommendations[entity].events.push({
    trigger,
    weight,
    timestamp: new Date().toISOString()
  });
  
  // Обновляем суммарный вес
  userDataStore[userId].recommendations[entity].totalWeight += weight;
  
  // Если вес стал <= 0, удаляем сущность из рекомендаций
  if (userDataStore[userId].recommendations[entity].totalWeight <= 0) {
    delete userDataStore[userId].recommendations[entity];
  }
  
  // Формируем отсортированный список рекомендаций
  const recommendations = Object.entries(userDataStore[userId].recommendations)
    .map(([entityName, data]) => ({
      entity: entityName,
      totalWeight: data.totalWeight,
      events: data.events
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);
  
  // Считаем количество лайков для порога активации
  let likeCount = 0;
  Object.values(userDataStore[userId].recommendations).forEach(data => {
    data.events.forEach(event => {
      if (event.trigger === 'like') likeCount++;
      if (event.trigger === 'unlike') likeCount--;
    });
  });
  
  res.json({ 
    success: true, 
    likeCount,
    recommendations 
  });
});

// API для получения рекомендаций
app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userDataStore[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Считаем активные лайки
  let likeCount = 0;
  Object.values(userDataStore[userId].recommendations).forEach(data => {
    data.events.forEach(event => {
      if (event.trigger === 'like') likeCount++;
      if (event.trigger === 'unlike') likeCount--;
    });
  });
  
  // Для формирования рекомендаций нужно минимум 5 активных лайков
  if (likeCount < 5) {
    return res.status(403).json({ 
      error: 'Not enough data for recommendations',
      likeCount,
      required: 5
    });
  }
  
  // Формируем и сортируем рекомендации
  const recommendations = Object.entries(userDataStore[userId].recommendations)
    .filter(([_, data]) => data.totalWeight > 0)
    .map(([entityName, data]) => ({
      entity: entityName,
      totalWeight: data.totalWeight,
      events: data.events
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);
  
  res.json({
    success: true,
    recommendations,
    events: Object.values(userDataStore[userId].recommendations).flatMap(d => d.events)
  });
});

// API для получения всех событий пользователя
app.get('/api/events/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userDataStore[userId]) {
    return res.json({ success: true, events: [] });
  }
  
  const allEvents = Object.values(userDataStore[userId].recommendations)
    .flatMap(data => data.events.map(e => ({ ...e, entity: '' })));
  
  res.json({ success: true, events: allEvents });
});

app.listen(PORT, () => {
  console.log(`Recommendation Module running on port ${PORT}`);
});
