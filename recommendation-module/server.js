const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Хранилище данных пользователей
// Структура: { userId: { likes: [], recommendations: { entity: { totalWeight, events: [] } } } }
const userData = {};

// Получить данные пользователя
app.get('/api/user-data/:userId', (req, res) => {
    const { userId } = req.params;
    
    if (!userData[userId]) {
        userData[userId] = { likes: [], recommendations: {} };
    }
    
    // Считаем активные лайки
    const userRecs = userData[userId].recommendations || {};
    let activeLikes = 0;
    
    Object.values(userRecs).forEach(rec => {
        rec.events.forEach(ev => {
            if (ev.trigger === 'like') {
                activeLikes += ev.weight; // +1 или -1
            }
        });
    });
    
    res.json({ 
        likes: userData[userId].likes,
        likeCount: activeLikes,
        recommendations: userData[userId].recommendations
    });
});

// Получить рекомендации для пользователя
app.get('/api/recommendations/:userId', (req, res) => {
    const { userId } = req.params;
    
    if (!userData[userId]) {
        return res.json({ recommendations: [] });
    }
    
    const userRecs = userData[userId].recommendations || {};
    
    // Преобразуем в массив и сортируем по весу
    const recommendations = Object.entries(userRecs)
        .filter(([entity, data]) => data.totalWeight > 0)
        .map(([entity, data]) => ({
            entity,
            totalWeight: data.totalWeight,
            events: data.events
        }))
        .sort((a, b) => b.totalWeight - a.totalWeight);
    
    res.json({ recommendations });
});

// Отправить событие (универсальный эндпоинт)
// Ожидает: { userId, trigger, entity, weight }
app.post('/api/events', (req, res) => {
    const { userId, trigger, entity, weight } = req.body;
    
    if (!userId || !trigger || !entity || weight === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'Необходимы поля: userId, trigger, entity, weight' 
        });
    }
    
    // Инициализируем пользователя если нет
    if (!userData[userId]) {
        userData[userId] = { likes: [], recommendations: {} };
    }
    
    const user = userData[userId];
    
    // Инициализируем рекомендацию для этой сущности если нет
    if (!user.recommendations[entity]) {
        user.recommendations[entity] = {
            totalWeight: 0,
            events: []
        };
    }
    
    const rec = user.recommendations[entity];
    
    // Проверка на дубликат read_more (только один раз на карточку)
    if (trigger === 'read_more') {
        const alreadyExpanded = rec.events.some(ev => 
            ev.trigger === 'read_more' && ev.entityId === req.body.entityId
        );
        if (alreadyExpanded) {
            return res.json({ 
                success: true, 
                message: 'Событие уже учтено',
                recommendations: Object.entries(user.recommendations)
                    .filter(([e, d]) => d.totalWeight > 0)
                    .map(([e, d]) => ({ entity: e, totalWeight: d.totalWeight, events: d.events }))
                    .sort((a, b) => b.totalWeight - a.totalWeight)
            });
        }
    }
    
    // Добавляем событие
    const eventRecord = {
        trigger,
        weight,
        timestamp: Date.now()
    };
    
    // Для read_more сохраняем entityId чтобы не дублировать
    if (trigger === 'read_more' && req.body.entityId) {
        eventRecord.entityId = req.body.entityId;
    }
    
    rec.events.push(eventRecord);
    
    // Обновляем общий вес
    rec.totalWeight += weight;
    
    // Если это лайк, обновляем список лайков
    if (trigger === 'like') {
        if (weight > 0) {
            // Добавляем лайк (если еще нет)
            // В реальном приложении нужен cardId, здесь используем entity как упрощение
            if (!user.likes.includes(entity)) {
                user.likes.push(entity);
            }
        } else {
            // Снимаем лайк
            user.likes = user.likes.filter(l => l !== entity);
        }
    }
    
    console.log(`[REC] User ${userId}: ${trigger} on ${entity}, weight: ${weight}, total: ${rec.totalWeight}`);
    
    // Возвращаем обновленные рекомендации
    const recommendations = Object.entries(user.recommendations)
        .filter(([e, d]) => d.totalWeight > 0)
        .map(([e, d]) => ({ entity: e, totalWeight: d.totalWeight, events: d.events }))
        .sort((a, b) => b.totalWeight - a.totalWeight);
    
    res.json({ 
        success: true, 
        recommendations,
        likeCount: user.likes.length
    });
});

app.listen(PORT, () => {
    console.log(`Recommendation Module running on port ${PORT}`);
});
