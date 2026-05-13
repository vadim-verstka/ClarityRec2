const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(bodyParser.json());

// Хранилище объяснений
const explanationsStore = {};

// API для генерации объяснений на основе рекомендаций
app.post('/api/generate-explanation', (req, res) => {
  const { userId, recommendations } = req.body;
  
  if (!userId || !recommendations) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Генерируем объяснения для каждой рекомендации
  const explanation = {
    userId,
    generatedAt: new Date().toISOString(),
    summary: `Сформировано ${recommendations.length} рекомендаций на основе ваших предпочтений`,
    items: recommendations.map(rec => ({
      category: rec.category,
      weight: rec.weight,
      trigger: rec.trigger,
      explanation: `Категория "${rec.category}" рекомендована с весом ${rec.weight}, потому что вы проявили интерес к ней через событие "${rec.trigger}"`
    }))
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

app.listen(PORT, () => {
  console.log(`Explanation Module running on port ${PORT}`);
});
