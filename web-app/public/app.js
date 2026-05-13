// State
let currentUser = null;
let currentUserId = null;
let likedCards = [];

// DOM Elements
const loginPage = document.getElementById('login-page');
const adminDashboard = document.getElementById('admin-dashboard');
const userFeed = document.getElementById('user-feed');
const userProfile = document.getElementById('user-profile');
const createModal = document.getElementById('create-user-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const usersList = document.getElementById('users-list');
const cardsContainer = document.getElementById('cards-container');
const explanationContent = document.getElementById('explanation-content');

// Show/Hide Pages
function showPage(page) {
    [loginPage, adminDashboard, userFeed, userProfile].forEach(p => p.classList.add('hidden'));
    page.classList.remove('hidden');
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            if (data.user.role === 'admin') {
                loadUsers();
                showPage(adminDashboard);
            } else {
                currentUserId = data.user.id;
                loadUserFeed();
                showPage(userFeed);
            }
        } else {
            loginError.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        loginError.textContent = 'Connection error';
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    currentUserId = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.textContent = '';
    showPage(loginPage);
});

// Load Users (Admin)
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': currentUser.id }
        });

        const data = await response.json();
        
        if (response.ok) {
            usersList.innerHTML = '';
            data.users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.textContent = user.username;
                userCard.addEventListener('click', () => goToUser(user));
                usersList.appendChild(userCard);
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Go to User Feed
function goToUser(user) {
    currentUserId = user.id;
    document.getElementById('current-username').textContent = user.username;
    document.getElementById('profile-username').textContent = user.username;
    loadUserFeed();
    showPage(userFeed);
}

// Create User Modal
document.getElementById('create-user-btn').addEventListener('click', () => {
    createModal.classList.remove('hidden');
});

document.getElementById('cancel-create-user').addEventListener('click', () => {
    createModal.classList.add('hidden');
    document.getElementById('new-username').value = '';
});

document.getElementById('confirm-create-user').addEventListener('click', async () => {
    const username = document.getElementById('new-username').value;
    
    if (!username) return;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': currentUser.id 
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            createModal.classList.add('hidden');
            document.getElementById('new-username').value = '';
            goToUser(data.user);
        }
    } catch (error) {
        console.error('Failed to create user:', error);
    }
});

// Load User Feed
async function loadUserFeed() {
    try {
        const response = await fetch(`/api/cards/${currentUserId}`);
        const data = await response.json();

        if (response.ok) {
            likedCards = [];
            cardsContainer.innerHTML = '';
            
            const statusText = data.hasRecommendations 
                ? 'Showing recommended cards based on your likes!' 
                : 'Like 5 cards to get personalized recommendations!';
            document.getElementById('feed-status').textContent = statusText;

            // Get recommendations if available
            let recommendations = [];
            if (data.hasRecommendations) {
                try {
                    const recResponse = await fetch(`http://localhost:3001/api/recommendations/user_${currentUserId}`);
                    const recData = await recResponse.json();
                    recommendations = recData.recommendations || [];
                } catch (error) {
                    console.error('Failed to get recommendations:', error);
                }
            }

            // Filter and sort cards based on recommendations
            let displayCards = data.cards;
            if (data.hasRecommendations && recommendations.length > 0) {
                const categoryOrder = {};
                recommendations.forEach((rec, index) => {
                    categoryOrder[rec.category] = recommendations.length - index;
                });

                displayCards = [...data.cards].sort((a, b) => {
                    const aWeight = categoryOrder[a.category] || 0;
                    const bWeight = categoryOrder[b.category] || 0;
                    return bWeight - aWeight;
                });
            }

            displayCards.forEach(card => {
                const cardEl = createCardElement(card);
                cardsContainer.appendChild(cardEl);
            });

            // Show back button for admin
            const backBtn = document.getElementById('back-to-admin');
            if (currentUser && currentUser.role === 'admin') {
                backBtn.classList.remove('hidden');
            } else {
                backBtn.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load cards:', error);
    }
}

// Create Card Element
function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.innerHTML = `
        <img src="${card.image}" alt="${card.title}">
        <div class="card-content">
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description}</div>
            <div class="card-category">${card.category}</div>
            <button class="like-btn" data-card-id="${card.id}">❤️ Like</button>
        </div>
    `;

    const likeBtn = cardEl.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => handleLike(card, likeBtn));

    return cardEl;
}

// Handle Like
async function handleLike(card, btn) {
    if (likedCards.includes(card.id)) return;

    try {
        const response = await fetch(`/api/cards/${currentUserId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: card.id })
        });

        const data = await response.json();

        if (response.ok) {
            likedCards.push(card.id);
            btn.classList.add('liked');
            btn.textContent = '✓ Liked';
            btn.disabled = true;

            // Check if we reached 5 likes
            if (data.totalLikes >= 5) {
                // Generate explanation
                try {
                    const userDataResponse = await fetch(`http://localhost:3001/api/user-data/user_${currentUserId}`);
                    const userData = await userDataResponse.json();

                    await fetch('http://localhost:3002/api/generate-explanation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: `user_${currentUserId}`,
                            recommendations: userData.recommendations,
                            events: userData.events
                        })
                    });
                } catch (error) {
                    console.error('Failed to generate explanation:', error);
                }

                // Reload feed with recommendations
                setTimeout(() => loadUserFeed(), 1000);
            }
        }
    } catch (error) {
        console.error('Failed to like card:', error);
    }
}

// Profile Link
document.getElementById('profile-link').addEventListener('click', (e) => {
    e.preventDefault();
    loadProfile();
    showPage(userProfile);
});

// Load Profile
async function loadProfile() {
    try {
        const response = await fetch(`http://localhost:3002/api/explanation/user_${currentUserId}`);
        
        if (response.ok) {
            const data = await response.json();
            const explanation = data.explanation;

            if (explanation) {
                let html = `<p>${explanation.explanationText.replace(/\n/g, '<br>')}</p>`;
                
                if (explanation.triggers && explanation.triggers.length > 0) {
                    html += '<h3>Triggers (Events):</h3>';
                    explanation.triggers.forEach(trigger => {
                        html += `<div class="explanation-item">
                            <strong>Event:</strong> ${trigger.event} | 
                            <strong>Category:</strong> ${trigger.category}
                        </div>`;
                    });
                }

                if (explanation.recommendations && explanation.recommendations.length > 0) {
                    html += '<h3>Recommendations:</h3>';
                    explanation.recommendations.forEach(rec => {
                        html += `<div class="explanation-item">
                            <strong>Category:</strong> ${rec.category} | 
                            <strong>Weight:</strong> ${rec.weight}
                        </div>`;
                    });
                }

                explanationContent.innerHTML = html;
            } else {
                explanationContent.innerHTML = '<div class="no-explanation">No explanation available yet.</div>';
            }
        } else {
            explanationContent.innerHTML = '<div class="no-explanation">No explanation available. Like at least 5 cards to get recommendations!</div>';
        }
    } catch (error) {
        explanationContent.innerHTML = '<div class="no-explanation">No explanation available. Like at least 5 cards to get recommendations!</div>';
    }
}

// Back Buttons
document.getElementById('back-to-feed').addEventListener('click', () => {
    showPage(userFeed);
});

document.getElementById('back-to-admin').addEventListener('click', () => {
    loadUsers();
    showPage(adminDashboard);
});

// Initialize
showPage(loginPage);
