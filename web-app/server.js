const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище пользователей
const users = {};
let currentUser = null;

// Генерация случайных карточек
const categories = ['Технологии', 'Спорт', 'Музыка', 'Кино', 'Книги', 'Путешествия', 'Еда', 'Игры'];
const titles = [
  'Новый прорыв в AI', 'Чемпионат мира по футболу', 'Лучшие хиты года', 
  'Новый блокбастер', 'Бестселлер сезона', 'Путешествие в горы',
  'Рецепт идеальной пасты', 'Новая RPG игра', 'Гаджет будущего',
  'Марафон для начинающих', 'Концерт звезд', 'Фильм года',
  'Научная фантастика', 'Отпуск на море', 'Веганские блюда',
  'Стратегия онлайн', 'Квантовые вычисления', 'Йога для всех',
  'Джазовый вечер', 'Документальное кино', 'Исторический роман',
  'Поход в лес', 'Суши дома', 'Инди-игра', 'Блокчейн технологии',
  'Баскетбол', 'Рок фестиваль', 'Триллер', 'Поэзия', 'Круиз',
  'Десерты', 'Шутер', 'Робототехника'
];
const descriptions = [
  'Увлекательный контент о последнем достижении',
  'Невероятные события и эмоции',
  'Лучшее в своем жанре',
  'Обязательно к просмотру',
  'Захватывающая история',
  'Незабываемые впечатления',
  'Просто и вкусно',
  'Погрузитесь в новый мир',
  'Технологии будущего уже здесь',
  'Для активных людей',
  'Музыкальное событие года',
  'Шедевр кинематографа',
  'Литературное открытие',
  'Романтика и приключения',
  'Кулинарный шедевр',
  'Игровой опыт нового уровня'
];

function generateCards() {
  const cards = [];
  for (let i = 0; i < 30; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    cards.push({
      id: i + 1,
      title: titles[i % titles.length],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      category: category,
      image: `https://picsum.photos/seed/${i + 1}/300/200`
    });
  }
  return cards;
}

const allCards = generateCards();

// API для авторизации админа
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  
  if (login === 'admin' && password === 'cradmin123') {
    currentUser = { role: 'admin', username: 'admin' };
    res.json({ success: true, user: currentUser });
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});

// API для получения текущего пользователя
app.get('/api/current-user', (req, res) => {
  if (currentUser) {
    res.json({ success: true, user: currentUser });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API для выхода
app.post('/api/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// API для получения списка пользователей (только админ)
app.get('/api/users', (req, res) => {
  if (!currentUser || currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const userList = Object.keys(users).map(id => ({
    id,
    name: users[id].name,
    likesCount: users[id].likedCards ? users[id].likedCards.length : 0,
    createdAt: users[id].createdAt
  }));
  
  res.json({ success: true, users: userList });
});

// API для создания пользователя
app.post('/api/users', (req, res) => {
  if (!currentUser || currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const { name } = req.body;
  const userId = `user_${Date.now()}`;
  
  users[userId] = {
    id: userId,
    name,
    likedCards: [],
    recommendations: null,
    explanation: null,
    createdAt: new Date().toISOString()
  };
  
  currentUser = { role: 'user', userId, username: name, tempAdmin: { role: 'admin', username: 'admin' } };
  
  res.json({ success: true, user: users[userId] });
});

// API для переключения на пользователя
app.post('/api/users/:userId/switch', (req, res) => {
  if (!currentUser || currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const { userId } = req.params;
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  currentUser = { role: 'user', userId, username: users[userId].name };
  
  res.json({ success: true, user: users[userId] });
});

// API для получения карточек пользователя
app.get('/api/cards', (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const user = users[currentUser.userId];
  const likesCount = user.likedCards ? user.likedCards.length : 0;
  
  if (likesCount >= 5 && user.recommendations) {
    // Возвращаем рекомендованные карточки
    const recommendedCategories = user.recommendations.map(r => r.category);
    let recommendedCards = allCards.filter(card => 
      recommendedCategories.includes(card.category)
    );
    
    // Сортируем по весу рекомендаций
    const categoryWeights = {};
    user.recommendations.forEach(r => {
      categoryWeights[r.category] = r.weight;
    });
    
    recommendedCards.sort((a, b) => {
      return (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0);
    });
    
    // Если недостаточно рекомендованных, дополняем случайными
    if (recommendedCards.length < 10) {
      const otherCards = allCards.filter(card => 
        !recommendedCategories.includes(card.category)
      );
      while (recommendedCards.length < 10 && otherCards.length > 0) {
        const randomCard = otherCards.splice(Math.floor(Math.random() * otherCards.length), 1)[0];
        recommendedCards.push(randomCard);
      }
    }
    
    res.json({ 
      success: true, 
      cards: recommendedCards.slice(0, 10),
      isRecommended: true,
      likesCount
    });
  } else {
    // Возвращаем случайные карточки
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    res.json({ 
      success: true, 
      cards: shuffled.slice(0, 10),
      isRecommended: false,
      likesCount
    });
  }
});

// API для лайка карточки
app.post('/api/cards/:cardId/like', async (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const { cardId } = req.params;
  const user = users[currentUser.userId];
  const card = allCards.find(c => c.id === parseInt(cardId));
  
  if (!card) {
    return res.status(404).json({ error: 'Карточка не найдена' });
  }
  
  if (!user.likedCards) {
    user.likedCards = [];
  }
  
  if (!user.likedCards.includes(parseInt(cardId))) {
    user.likedCards.push(parseInt(cardId));
    
    // Отправляем событие в модуль рекомендаций
    try {
      const recResponse = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          eventType: 'like',
          itemId: cardId,
          itemCategory: card.category
        })
      });
      
      const recData = await recResponse.json();
      
      if (recData.success && user.likedCards.length >= 5) {
        user.recommendations = recData.recommendations;
        
        // Отправляем данные в модуль объяснений
        try {
          const expResponse = await fetch('http://localhost:3002/api/generate-explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.userId,
              recommendations: user.recommendations
            })
          });
          
          const expData = await expResponse.json();
          if (expData.success) {
            user.explanation = expData.explanation;
          }
        } catch (e) {
          console.error('Ошибка при получении объяснения:', e.message);
        }
      }
    } catch (e) {
      console.error('Ошибка при отправке события:', e.message);
    }
  }
  
  res.json({ 
    success: true, 
    likesCount: user.likedCards.length,
    hasRecommendations: user.likedCards.length >= 5
  });
});

// API для снятия лайка
app.post('/api/cards/:cardId/unlike', async (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const { cardId } = req.params;
  const user = users[currentUser.userId];
  const card = allCards.find(c => c.id === parseInt(cardId));
  
  if (!card) {
    return res.status(404).json({ error: 'Карточка не найдена' });
  }
  
  if (!user.likedCards) {
    user.likedCards = [];
  }
  
  const cardIndex = user.likedCards.indexOf(parseInt(cardId));
  if (cardIndex > -1) {
    user.likedCards.splice(cardIndex, 1);
    
    try {
      const recResponse = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          eventType: 'unlike',
          itemId: cardId,
          itemCategory: card.category
        })
      });
      
      const recData = await recResponse.json();
      
      if (recData.success && recData.recommendations) {
        user.recommendations = recData.recommendations;
        
        if (user.likedCards.length < 5 || !user.recommendations || user.recommendations.length === 0) {
          user.recommendations = null;
          user.explanation = null;
        } else {
          try {
            const expResponse = await fetch('http://localhost:3002/api/generate-explanation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.userId,
                recommendations: user.recommendations
              })
            });
            
            const expData = await expResponse.json();
            if (expData.success) {
              user.explanation = expData.explanation;
            }
          } catch (e) {
            console.error('Ошибка при обновлении объяснения:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('Ошибка при отправке события unlike:', e.message);
    }
  }
  
  res.json({ 
    success: true, 
    likesCount: user.likedCards.length,
    hasRecommendations: user.likedCards.length >= 5 && user.recommendations !== null
  });
});

// API для получения объяснений
app.get('/api/explanation', (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const user = users[currentUser.userId];
  
  if (!user.explanation) {
    return res.json({ 
      success: true, 
      hasExplanation: false,
      message: 'Нет данных для формирования объяснений. Необходимо минимум 5 лайков.'
    });
  }
  
  res.json({ 
    success: true, 
    hasExplanation: true,
    explanation: user.explanation
  });
});

// Обработка всех остальных запросов - отдаем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Web Application running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
