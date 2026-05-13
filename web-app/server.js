const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3005;
const REC_MODULE_URL = 'http://localhost:3001';
const EXP_MODULE_URL = 'http://localhost:3002';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (в реальном приложении использовать БД)
const users = [
    { id: 'admin', username: 'admin', password: 'cradmin123', role: 'admin' }
];
let userIdCounter = 1;

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
    const publicUsers = users.map(u => {
        const { password, ...rest } = u;
        return rest;
    });
    res.json({ users: publicUsers });
});

// Create user
app.post('/api/users', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, message: 'Имя обязательно' });
    }
    
    const newUser = {
        id: `user_${Date.now()}`,
        username,
        role: 'user'
    };
    
    users.push(newUser);
    res.json({ success: true, user: newUser });
});

// Proxy: Get cards (генерируем на лету или берем из модуля рекомендаций если там есть)
app.get('/api/cards', async (req, res) => {
    // Генерируем 30 карточек с разными категориями и длиной описания
    const categories = ['Технологии', 'Спорт', 'Музыка', 'Кино', 'Наука', 'Игры', 'Путешествия', 'Еда'];
    const titles = ['Новый прорыв', 'Невероятное событие', 'Лучший выбор', 'Секрет успеха', 'Тренды года', 'Уникальный шанс', 'Важное открытие', 'Сенсация дня'];
    
    const shortDesc = 'Краткое описание карточки.';
    const longDesc = 'Это подробное описание карточки, которое содержит много текста. Оно достаточно длинное, чтобы занять более трех строк в интерфейсе. Здесь рассказывается о деталях, особенностях и преимуществах. Такой текст требует кнопки раскрытия.';
    
    const cards = Array.from({ length: 30 }, (_, i) => {
        const cat = categories[i % categories.length];
        const isLong = Math.random() > 0.3; // 70% длинные
        return {
            id: `card_${i}`,
            title: `${titles[i % titles.length]} ${i+1}`,
            category: cat,
            description: isLong ? longDesc + ` (Категория: ${cat})` : shortDesc,
            image: `https://picsum.photos/seed/${i}/400/250`
        };
    });
    
    res.json({ cards });
});

// Proxy: Get user state (likes)
app.get('/api/user-state/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Запрашиваем состояние из модуля рекомендаций
        const response = await axios.get(`${REC_MODULE_URL}/api/user-data/${userId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching user state:', error.message);
        // Возвращаем пустое состояние если модуль недоступен
        res.json({ likes: [], recommendations: [] });
    }
});

// Proxy: Get recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const response = await axios.get(`${REC_MODULE_URL}/api/recommendations/${userId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching recommendations:', error.message);
        res.json({ recommendations: [] });
    }
});

// Proxy: Send events to recommendation module
app.post('/api/events', async (req, res) => {
    const eventData = req.body;
    try {
        const response = await axios.post(`${REC_MODULE_URL}/api/events`, eventData);
        res.json(response.data);
    } catch (error) {
        console.error('Error sending event:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ success: false, message: 'Модуль рекомендаций недоступен' });
        }
    }
});

// Proxy: Generate explanation
app.post('/api/explain', async (req, res) => {
    const { userId, recommendations } = req.body;
    try {
        const response = await axios.post(`${EXP_MODULE_URL}/api/explain`, {
            userId,
            recommendations
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error generating explanation:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ success: false, message: 'Модуль объяснений недоступен' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Web Application running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
