class ClickGame {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.circle = document.getElementById('circle');
        this.startScreen = document.getElementById('startScreen');
        this.endScreen = document.getElementById('endScreen');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
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
        this.tinybirdToken = 'p.eyJ1IjogIjM3NDg3MmJmLWU1NzMtNDMwOS05YmJhLTIxMjE3MWViYWQ0OSIsICJpZCI6ICIxMzljZjNmMC0xYWMzLTQ2YTEtYmNiNS1mODdjNGUzZjAwYTMiLCAiaG9zdCI6ICJ1c19lYXN0In0.4SDxPx2Kxec2l0_90Wkn5zdsZz7T6T9m1152VYDX9xo';
        this.userId = this.getUserId();
        this.gameId = null;
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.circle.addEventListener('click', () => this.handleCircleClick());
        
        // Prevent context menu on right click
        this.gameArea.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Load analytics on init
        this.loadAnalytics();
    }
    
    getUserId() {
        let userId = localStorage.getItem('clickGameUserId');
        if (!userId) {
            userId = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('clickGameUserId', userId);
        }
        return userId;
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
                const elapsed = (Date.now() - this.startTime) / 1000;
                this.timeDisplay.textContent = elapsed.toFixed(2);
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
        
        const finalTime = (Date.now() - this.startTime) / 1000;
        this.finalTimeDisplay.textContent = finalTime.toFixed(2);
        
        // Send game event to Tinybird
        await this.sendGameEvent(finalTime);
        
        // Wait 2 seconds to allow events to propagate to Tinybird
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reload analytics after game completion
        await this.loadAnalytics();
        
        this.circle.style.display = 'none';
        this.endScreen.style.display = 'block';
    }
    
    resetGame() {
        this.endScreen.style.display = 'none';
        this.startScreen.style.display = 'block';
        this.circle.style.display = 'none';
        
        this.clicks = 0;
        this.isGameActive = false;
        this.timeDisplay.textContent = '0.00';
        this.clicksDisplay.textContent = '0';
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
    }
    
    async sendGameEvent(gameDuration) {
        try {
            const eventData = {
                user_id: this.userId,
                game_duration: gameDuration,
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
        const response = await fetch(`${this.tinybirdHost}/v0/pipes/${endpoint}.json?user_id=${this.userId}`, {
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
    
    updateAnalyticsDisplay(bestScore, avgScore, totalGames, scoreTrend) {
        // Update analytics elements if they exist
        const bestElement = document.getElementById('bestScore');
        const avgElement = document.getElementById('avgScore');
        const totalElement = document.getElementById('totalGames');
        
        if (bestElement && bestScore.length > 0) {
            bestElement.textContent = bestScore[0].best_score?.toFixed(2) || 'N/A';
        }
        
        if (avgElement && avgScore.length > 0) {
            avgElement.textContent = avgScore[0].average_score?.toFixed(2) || 'N/A';
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
                     title="Game ${index + 1}: ${point.game_duration.toFixed(2)}s">
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