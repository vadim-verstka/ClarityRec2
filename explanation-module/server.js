const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(bodyParser.json());

// Хранилище объяснений
const explanationsStore = {};
// Хранилище событий (синхронизируется с recommendation module через API)
const eventsStore = {};

// API для генерации объяснений на основе рекомендаций
app.post('/api/generate-explanation', (req, res) => {
  const { userId, recommendations, events } = req.body;
  
  if (!userId || !recommendations) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Сохраняем события для последующего использования
  if (events && events.length > 0) {
    eventsStore[userId] = events;
  }
  
  // Генерируем объяснения для каждой рекомендации
  const explanation = {
    userId,
    generatedAt: new Date().toISOString(),
    summary: `Сформировано ${recommendations.length} рекомендаций на основе ваших предпочтений`,
    items: recommendations.map(rec => {
      // Находим все события для этой категории
      const allEvents = events || (eventsStore[userId] ? eventsStore[userId] : []);
      const categoryEvents = allEvents.filter(e => e.itemCategory === rec.category);
      const triggersDescription = categoryEvents.length > 0 
        ? [...new Set(categoryEvents.map(e => e.eventType))].join(', ')
        : rec.trigger;
      
      return {
        category: rec.category,
        weight: rec.weight,
        trigger: triggersDescription,
        explanation: `Категория "${rec.category}" рекомендована с весом ${rec.weight}, потому что вы проявили интерес через события: ${triggersDescription}`
      };
    })
  };
  
  explanationsStore[userId] = explanation;
  
  res.json({ success: true, explanation });
});

// API для получения объяснений пользователя
app.get('/api/explanation/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!explanationsStore[userId]) {
    return res.status(404).json({ 
      error: 'Explanation not found',
      message: 'Нет данных для формирования объяснений'
    });
  }
  
  res.json({ success: true, explanation: explanationsStore[userId] });
});

// API для получения событий пользователя (для детализации объяснений)
app.get('/api/events/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!eventsStore[userId]) {
    return res.json({ success: true, events: [] });
  }
  
  res.json({ success: true, events: eventsStore[userId] });
});

app.listen(PORT, () => {
  console.log(`Explanation Module running on port ${PORT}`);
});
