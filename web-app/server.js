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
  'Короткое описание.',
  'Ещё один короткий текст.',
  'Небольшой контент.',
  'Три строки текста максимум.',
  'Увлекательный контент о последнем достижении. Это подробное описание содержит много интересной информации, которую стоит изучить подробнее. Здесь ещё больше деталей, которые раскрывают тему глубже и позволяют понять суть явления. Дополнительные абзацы делают текст объёмным и насыщенным фактами...',
  'Невероятные события и эмоции. Здесь раскрываются детали, которые захватывают дух и заставляют задуматься о многом. Мы подготовили для вас развёрнутый материал с анализом ключевых моментов. Изучите все аспекты этого удивительного явления в нашем подробном обзоре...',
  'Лучшее в своем жанре. Этот материал представляет собой вершину мастерства и заслуживает особого внимания. Мы собрали самые важные факты и мнения экспертов. Погрузитесь в мир профессионализма и узнайте секреты успеха...',
  'Обязательно к просмотру. Мы подготовили для вас эксклюзивный контент с множеством интересных деталей. Узнайте первыми о новинках и тенденциях. Полный обзор возможностей и перспектив развития...',
  'Захватывающая история. Погрузитесь в мир невероятных приключений и откройте для себя новые горизонты. Вас ждут удивительные открытия на каждом шагу. Прочитайте до конца, чтобы узнать все подробности...',
  'Незабываемые впечатления. Этот опыт изменит ваше представление о вещах и откроет новые возможности. Мы расскажем о том, как достичь максимальных результатов. Следуйте нашим рекомендациям для лучшего эффекта...',
  'Просто и вкусно. Секреты приготовления блюд, которые покорят ваши вкусовые рецепторы. Пошаговые инструкции от шеф-поваров. Узнайте тонкости выбора ингредиентов и техники подачи...',
  'Погрузитесь в новый мир. Вас ждут удивительные открытия и незабываемые эмоции. Исследуйте неизвестные грани привычных вещей. Откройте для себя новые горизонты понимания...',
  'Технологии будущего уже здесь. Узнайте о последних достижениях науки и техники. Экспертный анализ трендов и прогнозы на будущее. Будьте в курсе всех инноваций...',
  'Для активных людей. Советы и рекомендации для тех, кто ведет активный образ жизни. Практические руководства и проверенные методики. Достигайте своих целей с нашими советами...',
  'Музыкальное событие года. Эксклюзивная информация о концертах и альбомах. Интервью с исполнителями и рецензии критиков. Не пропустите главные премьеры сезона...',
  'Шедевр кинематографа. Разбор фильма, который стал настоящим событием. Анализ режиссуры, актёрской игры и операторской работы. Узнайте, что скрывается за кадром...',
  'Литературное открытие. Книги, которые стоит прочитать каждому. Обзоры новинок и классики. Мнения писателей и литературных критиков...',
  'Романтика и приключения. Истории, которые трогают сердце. Эмоциональные сюжеты и яркие персонажи. Погрузитесь в мир любви и страсти...',
  'Кулинарный шедевр. Рецепты от лучших шеф-поваров мира. Секреты приготовления изысканных блюд. Научитесь создавать кулинарные шедевры дома...',
  'Игровой опыт нового уровня. Обзоры игр, которые стоит попробовать. Геймплей, графика, сюжет — полный анализ. Выберите свою следующую любимую игру...'
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
    const token = 'admin-token-' + Date.now();
    res.json({ success: true, user: currentUser, token: token });
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});

// API для получения текущего пользователя
app.get('/api/current-user', (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Если нет заголовка авторизации или currentUser не установлен
  if (!authHeader || !currentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Проверяем токен
  if (authHeader.startsWith('Bearer ') && currentUser) {
    res.json({ success: true, user: currentUser });
  } else {
    return res.status(401).json({ error: 'Not authenticated' });
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
  
  const token = 'user-token-' + userId + '-' + Date.now();
  currentUser = { role: 'user', userId, username: name, tempAdmin: { role: 'admin', username: 'admin' } };
  
  res.json({ success: true, user: users[userId], token: token });
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
  
  const token = 'user-token-' + userId + '-' + Date.now();
  currentUser = { role: 'user', userId, username: users[userId].name };
  
  res.json({ success: true, user: users[userId], token: token });
});

// API для получения карточек пользователя
app.get('/api/cards', (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const user = users[currentUser.userId];
  const likesCount = user.likedCards ? user.likedCards.length : 0;
  const likedCardIds = user.likedCards || [];
  
  if (likesCount >= 5 && user.recommendations) {
    // Возвращаем рекомендованные карточки, исключая уже лайкнутые
    const recommendedCategories = user.recommendations.map(r => r.entity);
    
    // Фильтруем карточки: только рекомендованные категории и не лайкнутые
    let recommendedCards = allCards.filter(card => 
      recommendedCategories.includes(card.category) && 
      !likedCardIds.includes(card.id)
    );
    
    // Сортируем по весу рекомендаций
    const categoryWeights = {};
    user.recommendations.forEach(r => {
      categoryWeights[r.entity] = r.totalWeight;
    });
    
    recommendedCards.sort((a, b) => {
      return (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0);
    });
    
    // Если недостаточно рекомендованных, дополняем случайными (не лайкнутыми)
    if (recommendedCards.length < 10) {
      const otherCards = allCards.filter(card => 
        !recommendedCategories.includes(card.category) &&
        !likedCardIds.includes(card.id)
      );
      while (recommendedCards.length < 10 && otherCards.length > 0) {
        const randomCard = otherCards.splice(Math.floor(Math.random() * otherCards.length), 1)[0];
        recommendedCards.push(randomCard);
      }
    }
    
    // Если все карточки лайкнуты, возвращаем пустой массив с сообщением
    if (recommendedCards.length === 0) {
      res.json({ 
        success: true, 
        cards: [],
        isRecommended: true,
        likesCount,
        message: 'Все рекомендованные карточки уже лайкнуты!'
      });
    } else {
      res.json({ 
        success: true, 
        cards: recommendedCards.slice(0, 10),
        isRecommended: true,
        likesCount
      });
    }
  } else {
    // Возвращаем случайные карточки, исключая уже лайкнутые
    const availableCards = allCards.filter(card => 
      !likedCardIds.includes(card.id)
    );
    
    if (availableCards.length === 0) {
      res.json({ 
        success: true, 
        cards: [],
        isRecommended: false,
        likesCount,
        message: 'Все карточки уже лайкнуты!'
      });
    } else {
      const shuffled = availableCards.sort(() => Math.random() - 0.5);
      res.json({ 
        success: true, 
        cards: shuffled.slice(0, 10),
        isRecommended: false,
        likesCount
      });
    }
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
    
    // Отправляем событие в модуль рекомендаций с новым форматом
    try {
      const recResponse = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          trigger: 'like',
          entity: card.category,
          weight: 1
        })
      });
      
      const recData = await recResponse.json();
      
      // Считаем активные лайки из ответа модуля рекомендаций
      const activeLikes = recData.likeCount || user.likedCards.length;
      
      if (recData.success && activeLikes >= 5) {
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
    
    // Отправляем событие unlike в модуль рекомендаций с новым форматом
    try {
      const recResponse = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          trigger: 'unlike',
          entity: card.category,
          weight: -1
        })
      });
      
      const recData = await recResponse.json();
      
      // Считаем активные лайки из ответа модуля рекомендаций
      const activeLikes = recData.likeCount || user.likedCards.length;
      
      // Обновляем рекомендации
      if (recData.success) {
        user.recommendations = recData.recommendations && recData.recommendations.length > 0 ? recData.recommendations : null;
        
        // Если меньше 5 лайков или нет рекомендаций, очищаем
        if (activeLikes < 5 || !user.recommendations) {
          user.recommendations = null;
          user.explanation = null;
        } else {
          // Генерируем новые объяснения
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

// API для получения состояния пользователя (лайкнутые карточки)
app.get('/api/user-state', (req, res) => {
  if (!currentUser || currentUser.role !== 'user') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const user = users[currentUser.userId];
  
  res.json({ 
    success: true, 
    likedCards: user.likedCards || [],
    likesCount: user.likedCards ? user.likedCards.length : 0,
    hasRecommendations: user.recommendations !== null
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
