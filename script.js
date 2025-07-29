class ClickGame {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.circle = document.getElementById('circle');
        this.startScreen = document.getElementById('startScreen');
        this.endScreen = document.getElementById('endScreen');
        this.usernamePrompt = document.getElementById('usernamePrompt');
        this.calculatingScreen = document.getElementById('calculatingScreen');
        this.leaderboardScreen = document.getElementById('leaderboardScreen');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.usernameSubmit = document.getElementById('usernameSubmit');
        this.usernameInput = document.getElementById('usernameInput');
        this.leaderboardBtn = document.getElementById('leaderboardBtn');
        this.timeDisplay = document.getElementById('time');
        this.clicksDisplay = document.getElementById('clicks');
        this.finalTimeDisplay = document.getElementById('finalTime');
        
        this.clicks = 0;
        this.maxClicks = 10;
        this.startTime = 0;
        this.gameTimer = null;
        this.isGameActive = false;
        
        // Tinybird configuration
        this.tinybirdHost = 'https://api.us-east.tinybird.co';
        this.tinybirdToken = 'p.eyJ1IjogIjM3NDg3MmJmLWU1NzMtNDMwOS05YmJhLTIxMjE3MWViYWQ0OSIsICJpZCI6ICJkY2YxNDkyMi1hYmQxLTQxZjUtOWY1Mi1lN2NlNmZjM2ZmZWUiLCAiaG9zdCI6ICJ1c19lYXN0In0.WoBIk29wKgWAiz3WOMlLlHzqf4NZem7JeuuUmuTsGfg';
        this.username = this.getUsername();
        this.gameId = null;
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.newGameBtn.addEventListener('click', () => this.resetGame());
        this.usernameSubmit.addEventListener('click', () => this.submitUsername());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitUsername();
        });
        this.circle.addEventListener('click', () => this.handleCircleClick());
        this.leaderboardBtn.addEventListener('click', () => this.showGlobalLeaderboard());
        
        // Prevent context menu on right click
        this.gameArea.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Check if username exists, if not show username prompt
        if (!this.username) {
            this.showUsernamePrompt();
        } else {
            // Load analytics on init
            this.loadAnalytics();
        }
    }
    
    getUsername() {
        return localStorage.getItem('clickGameUsername');
    }
    
    showUsernamePrompt() {
        this.startScreen.style.display = 'none';
        this.usernamePrompt.style.display = 'block';
        this.usernameInput.focus();
    }
    
    submitUsername() {
        const username = this.usernameInput.value.trim();
        if (username && username.length >= 2) {
            this.username = username;
            localStorage.setItem('clickGameUsername', username);
            this.usernamePrompt.style.display = 'none';
            this.startScreen.style.display = 'block';
            this.loadAnalytics();
        } else {
            alert('Please enter a username with at least 2 characters');
        }
    }
    
    generateGameId() {
        return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    startGame() {
        this.startScreen.style.display = 'none';
        this.circle.style.display = 'block';
        this.isGameActive = true;
        this.clicks = 0;
        this.startTime = Date.now();
        this.gameId = this.generateGameId();
        
        this.updateDisplay();
        this.moveCircle();
        this.startTimer();
    }
    
    startTimer() {
        this.gameTimer = setInterval(() => {
            if (this.isGameActive) {
                const elapsed = Date.now() - this.startTime;
                this.timeDisplay.textContent = Math.round(elapsed).toString() + 'ms';
            }
        }, 10);
    }
    
    handleCircleClick() {
        if (!this.isGameActive) return;
        
        this.clicks++;
        this.updateDisplay();
        
        if (this.clicks >= this.maxClicks) {
            this.endGame();
        } else {
            this.moveCircle();
        }
    }
    
    moveCircle() {
        const gameAreaRect = this.gameArea.getBoundingClientRect();
        const circleSize = 60;
        const margin = 20;
        
        const maxX = gameAreaRect.width - circleSize - margin;
        const maxY = gameAreaRect.height - circleSize - margin;
        
        const x = Math.random() * maxX + margin;
        const y = Math.random() * maxY + margin;
        
        this.circle.style.left = x + 'px';
        this.circle.style.top = y + 'px';
    }
    
    updateDisplay() {
        this.clicksDisplay.textContent = this.clicks;
    }
    
    async endGame() {
        this.isGameActive = false;
        clearInterval(this.gameTimer);
        
        const finalTime = Date.now() - this.startTime;
        this.finalTimeDisplay.textContent = Math.round(finalTime).toString() + 'ms';
        
        // Hide circle and show calculating screen
        this.circle.style.display = 'none';
        this.calculatingScreen.style.display = 'block';
        
        // Send game event to Tinybird
        await this.sendGameEvent(finalTime);
        
        // Wait 3 seconds to allow events to propagate to Tinybird
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Hide calculating screen and show leaderboard
        this.calculatingScreen.style.display = 'none';
        await this.showLeaderboard(finalTime);
        
        // Reload analytics after game completion
        await this.loadAnalytics();
    }
    
    resetGame() {
        this.endScreen.style.display = 'none';
        this.leaderboardScreen.style.display = 'none';
        this.calculatingScreen.style.display = 'none';
        this.startScreen.style.display = 'block';
        this.circle.style.display = 'none';
        
        this.clicks = 0;
        this.isGameActive = false;
        this.timeDisplay.textContent = '0ms';
        this.clicksDisplay.textContent = '0';
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
    }
    
    async showLeaderboard(finalTime) {
        try {
            // Update player's score display
            document.getElementById('yourScore').textContent = Math.round(finalTime).toString() + 'ms';
            
            // Fetch and display leaderboard
            const leaderboard = await this.fetchLeaderboard();
            this.updateLeaderboardDisplay(leaderboard, finalTime);
            
            this.leaderboardScreen.style.display = 'block';
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            // Fallback to old end screen if leaderboard fails
            this.endScreen.style.display = 'block';
        }
    }
    
    async showGlobalLeaderboard() {
        try {
            // Hide other screens
            this.startScreen.style.display = 'none';
            this.endScreen.style.display = 'none';
            this.calculatingScreen.style.display = 'none';
            this.circle.style.display = 'none';
            
            // Show leaderboard screen without player score section
            document.getElementById('yourScore').textContent = '--';
            document.getElementById('yourRank').textContent = '#-';
            
            // Fetch and display leaderboard
            const leaderboard = await this.fetchLeaderboard();
            this.updateLeaderboardDisplay(leaderboard, null);
            
            this.leaderboardScreen.style.display = 'block';
        } catch (error) {
            console.error('Error showing global leaderboard:', error);
            alert('Failed to load leaderboard. Please try again.');
        }
    }
    
    async sendGameEvent(gameDuration) {
        try {
            // Ensure we have a valid username before sending
            if (!this.username) {
                console.error('Cannot send game event: no username set');
                return;
            }
            
            const eventData = {
                user_id: this.username,
                game_duration: Math.round(gameDuration),
                clicks: this.maxClicks,
                timestamp: new Date().toISOString(),
                game_id: this.gameId
            };
            
            const response = await fetch(`${this.tinybirdHost}/v0/events?name=click_game_events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.tinybirdToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                console.error('Failed to send game event:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending game event:', error);
        }
    }
    
    async loadAnalytics() {
        try {
            const [bestScore, avgScore, totalGames, scoreTrend] = await Promise.all([
                this.fetchAnalytics('best_score'),
                this.fetchAnalytics('average_score'),
                this.fetchAnalytics('total_games'),
                this.fetchAnalytics('score_trend')
            ]);
            
            this.updateAnalyticsDisplay(bestScore, avgScore, totalGames, scoreTrend);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }
    
    async fetchAnalytics(endpoint) {
        const response = await fetch(`${this.tinybirdHost}/v0/pipes/${endpoint}.json?username=${this.username}`, {
            headers: {
                'Authorization': `Bearer ${this.tinybirdToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
    }
    
    async fetchLeaderboard() {
        const response = await fetch(`${this.tinybirdHost}/v0/pipes/global_leaderboard.json`, {
            headers: {
                'Authorization': `Bearer ${this.tinybirdToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
    }
    
    updateLeaderboardDisplay(leaderboard, playerTime) {
        const leaderboardList = document.getElementById('leaderboardList');
        const yourRank = document.getElementById('yourRank');
        
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = '<div class="no-data">No scores yet. Be the first!</div>';
            yourRank.textContent = '#1';
            return;
        }
        
        // Find player's rank
        const playerRank = leaderboard.findIndex(entry => entry.username === this.username) + 1;
        yourRank.textContent = playerRank > 0 ? `#${playerRank}` : '#-';
        
        // Create leaderboard HTML
        const leaderboardHTML = leaderboard.slice(0, 10).map((entry, index) => {
            const isCurrentPlayer = entry.username === this.username;
            return `
                <div class="leaderboard-entry ${isCurrentPlayer ? 'current-player' : ''}">
                    <span class="rank">#${index + 1}</span>
                    <span class="username">${entry.username}</span>
                    <span class="score">${Math.round(entry.best_time)}ms</span>
                </div>
            `;
        }).join('');
        
        leaderboardList.innerHTML = leaderboardHTML;
    }
    
    updateAnalyticsDisplay(bestScore, avgScore, totalGames, scoreTrend) {
        // Update analytics elements if they exist
        const bestElement = document.getElementById('bestScore');
        const avgElement = document.getElementById('avgScore');
        const totalElement = document.getElementById('totalGames');
        
        if (bestElement && bestScore.length > 0) {
            bestElement.textContent = (Math.round(bestScore[0].best_score) || 'N/A') + (bestScore[0].best_score ? 'ms' : '');
        }
        
        if (avgElement && avgScore.length > 0) {
            avgElement.textContent = (Math.round(avgScore[0].average_score) || 'N/A') + (avgScore[0].average_score ? 'ms' : '');
        }
        
        if (totalElement && totalGames.length > 0) {
            totalElement.textContent = totalGames[0].total_games || '0';
        }
        
        // Update trend chart if element exists
        if (scoreTrend.length > 0) {
            this.updateTrendChart(scoreTrend);
        }
    }
    
    updateTrendChart(trendData) {
        const chartContainer = document.getElementById('trendChart');
        if (!chartContainer) return;
        
        // Clear existing chart
        chartContainer.innerHTML = '';
        
        if (trendData.length === 0) {
            chartContainer.innerHTML = '<div class="no-data">NO DATA YET</div>';
            return;
        }
        
        // Create simple ASCII-style chart
        const maxScore = Math.max(...trendData.map(d => d.game_duration));
        const minScore = Math.min(...trendData.map(d => d.game_duration));
        const range = maxScore - minScore || 1;
        
        const chartHTML = trendData.map((point, index) => {
            const height = Math.max(10, ((point.game_duration - minScore) / range) * 100);
            const isLatest = index === trendData.length - 1;
            
            return `
                <div class="chart-bar ${isLatest ? 'latest' : ''}" style="height: ${height}%" 
                     title="Game ${index + 1}: ${Math.round(point.game_duration)}ms">
                    <div class="bar-fill"></div>
                </div>
            `;
        }).join('');
        
        chartContainer.innerHTML = `
            <div class="chart-bars">${chartHTML}</div>
            <div class="chart-labels">
                <span>GAME 1</span>
                <span>LATEST</span>
            </div>
        `;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ClickGame();
});
