const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Генерация объяснений на основе рекомендаций
app.post('/api/explain', (req, res) => {
    const { userId, recommendations } = req.body;
    
    if (!recommendations || !Array.isArray(recommendations)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Необходим массив recommendations' 
        });
    }
    
    // Генерируем объяснения для каждой рекомендации
    const items = recommendations.map(rec => {
        // Группируем события по триггерам
        const triggerCounts = {};
        rec.events.forEach(ev => {
            if (!triggerCounts[ev.trigger]) {
                triggerCounts[ev.trigger] = { count: 0, totalWeight: 0 };
            }
            triggerCounts[ev.trigger].count++;
            triggerCounts[ev.trigger].totalWeight += ev.weight;
        });
        
        // Формируем список событий для отображения
        const events = Object.entries(triggerCounts).map(([trigger, data]) => ({
            trigger,
            count: data.count,
            weight: data.totalWeight
        }));
        
        return {
            category: rec.entity,
            totalWeight: rec.totalWeight,
            events: events
        };
    });
    
    // Генерируем краткое резюме
    let summary = '';
    if (items.length === 0) {
        summary = 'Пока нет достаточных данных для формирования рекомендаций.';
    } else {
        const topCategory = items[0].category;
        const topWeight = items[0].totalWeight;
        summary = `На основе вашей активности сформировано ${items.length} рекомендаций. Наиболее предпочтительная категория: "${topCategory}" (вес: ${topWeight}).`;
    }
    
    res.json({
        success: true,
        explanation: {
            summary,
            items
        }
    });
});

app.listen(PORT, () => {
    console.log(`Explanation Module running on port ${PORT}`);
});
