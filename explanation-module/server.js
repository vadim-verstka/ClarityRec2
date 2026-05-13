const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// In-memory storage for explanations
const explanations = {}; // { userId: { recommendations, triggers, explanationText } }

// API: Receive recommendation data and generate explanations
app.post('/api/generate-explanation', (req, res) => {
  const { userId, recommendations, events } = req.body;
  
  if (!userId || !recommendations) {
    return res.status(400).json({ error: 'userId and recommendations are required' });
  }

  // Analyze recommendations and create explanations
  const explanation = generateExplanation(userId, recommendations, events);
  explanations[userId] = explanation;
  
  res.json({ 
    message: 'Explanation generated',
    explanation 
  });
});

// Generate human-readable explanation
function generateExplanation(userId, recommendations, events) {
  const likes = events ? events.filter(e => e.event === 'like') : [];
  
  // Create explanation text
  let explanationText = 'Based on your activity, we have identified the following preferences:\n\n';
  
  recommendations.forEach((rec, index) => {
    explanationText += `${index + 1}. Category "${rec.category}" - Weight: ${rec.weight}\n`;
    explanationText += `   This recommendation is based on ${rec.weight} like(s) in this category.\n\n`;
  });

  // Identify triggers
  const triggers = likes.map(like => ({
    event: like.event,
    category: like.category,
    item: like.item
  }));

  return {
    userId,
    recommendations,
    triggers,
    explanationText,
    generatedAt: new Date().toISOString()
  };
}

// API: Get explanation for a user
app.get('/api/explanation/:userId', (req, res) => {
  const { userId } = req.params;
  const explanation = explanations[userId];
  
  if (!explanation) {
    return res.status(404).json({ error: 'No explanation available for this user' });
  }
  
  res.json({ explanation });
});

// API: Check if explanation exists
app.get('/api/explanation-status/:userId', (req, res) => {
  const { userId } = req.params;
  const hasExplanation = !!explanations[userId];
  
  res.json({ hasExplanation });
});

app.listen(PORT, () => {
  console.log(`Explanation Module running on port ${PORT}`);
});
