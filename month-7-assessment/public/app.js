(function() {
    'use strict';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    let ws = null;
    let sessionId = null;
    let myId = null;
    let isGameMaster = false;
    let currentState = 'LOBBY';
    let questionSet = false;
    let playerCount = 0;
    
    const elements = {
        joinScreen: document.getElementById('joinScreen'),
        gameScreen: document.getElementById('gameScreen'),
        joinForm: document.getElementById('joinForm'),
        usernameInput: document.getElementById('usernameInput'),
        sessionInput: document.getElementById('sessionInput'),
        joinError: document.getElementById('joinError'),
        
        sessionCode: document.getElementById('sessionCode'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        leaveBtn: document.getElementById('leaveBtn'),
        gameStatus: document.getElementById('gameStatus'),
        statusText: document.getElementById('statusText'),
        
        playerList: document.getElementById('playerList'),
        playerCount: document.getElementById('playerCount'),
        scoreList: document.getElementById('scoreList'),
        
        messagesContainer: document.getElementById('messagesContainer'),
        welcomeMessage: document.getElementById('welcomeMessage'),
        questionDisplay: document.getElementById('questionDisplay'),
        questionText: document.getElementById('questionText'),
        timer: document.getElementById('timer'),
        timerValue: document.getElementById('timerValue'),
        
        inputArea: document.getElementById('inputArea'),
        guessForm: document.getElementById('guessForm'),
        guessInput: document.getElementById('guessInput'),
        gmControls: document.getElementById('gmControls'),
        setupForm: document.getElementById('setupForm'),
        questionInput: document.getElementById('questionInput'),
        answerInput: document.getElementById('answerInput'),
        createQuestionBtn: document.getElementById('createQuestionBtn'),
        startActions: document.getElementById('startActions'),
        startGameBtn: document.getElementById('startGameBtn'),
        startGameHint: document.getElementById('startGameHint'),
        gameOverDisplay: document.getElementById('gameOverDisplay'),
        winnerText: document.getElementById('winnerText'),
        correctAnswer: document.getElementById('correctAnswer')
    };

    function connect() {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {};
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };
        
        ws.onclose = () => {
            showJoinScreen();
            showError('Connection lost. Please rejoin.');
        };
        
        ws.onerror = () => {
            showError('Connection error. Please try again.');
        };
    }
    
    function send(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
    
    function handleMessage(data) {
        const { event, ...payload } = data;
        
        switch (event) {
            case 'session_info':
                handleSessionInfo(payload);
                break;
            case 'player_joined':
                handlePlayerJoined(payload);
                break;
            case 'player_left':
                handlePlayerLeft(payload);
                break;
            case 'question_created':
                handleQuestionCreated(payload);
                break;
            case 'question_created_gm':
                handleQuestionCreatedGM(payload);
                break;
            case 'game_started':
                handleGameStarted(payload);
                break;
            case 'guess_result':
                handleGuessResult(payload);
                break;
            case 'round_ended':
                handleRoundEnded(payload);
                break;
            case 'new_game_master':
                handleNewGameMaster(payload);
                break;
            case 'timer_tick':
                handleTimerTick(payload);
                break;
            case 'error':
                showError(payload.message);
                break;
        }
    }
    
    function handleSessionInfo(data) {
        sessionId = data.sessionId;
        myId = data.yourId;
        isGameMaster = data.isGameMaster;
        currentState = data.gameState;
        playerCount = (data.players || []).length;
        questionSet = !!data.currentQuestion;
        
        elements.sessionCode.textContent = sessionId;
        updatePlayersList(data.players);
        updateScoresList(data.players);
        
        if (data.isNew) {
            showGameScreen();
            addSystemMessage(`Session created! Share code ${sessionId} with friends`);
        } else {
            showGameScreen();
            addSystemMessage(`Joined session ${sessionId}`);
        }
        
        syncState();
    }
    
    function syncState() {
        updateGameState(currentState);
        if (questionSet && currentState === 'WAITING') {
            elements.startActions.classList.remove('hidden');
            updateStartButton();
        }
        updateGMUI();
    }
    
    function handlePlayerJoined(data) {
        playerCount++;
        addSystemMessage(`${data.player.username} joined the game`);
        const li = createPlayerListItem(data.player);
        elements.playerList.appendChild(li);
        elements.playerCount.textContent = playerCount;
        updateStartButton();
    }
    
    function handlePlayerLeft(data) {
        playerCount = Math.max(0, playerCount - 1);
        addSystemMessage(`${data.username} left the game`);
        const item = elements.playerList.querySelector(`[data-player-id="${data.playerId}"]`);
        if (item) item.remove();
        elements.playerCount.textContent = playerCount;
        updateStartButton();
    }
    
    function handleQuestionCreated(data) {
        currentState = 'WAITING';
        elements.gameStatus.classList.remove('playing');
        elements.gameStatus.classList.add('waiting');
        elements.statusText.textContent = 'Ready';
        addSystemMessage(`Question set: "${data.question}"`);
    }
    
    function handleQuestionCreatedGM(data) {
        questionSet = true;
        currentState = 'WAITING';
        elements.setupForm.classList.add('hidden');
        elements.startActions.classList.remove('hidden');
        elements.gameStatus.classList.remove('playing');
        elements.gameStatus.classList.add('waiting');
        elements.statusText.textContent = 'Ready';
        updateStartButton();
        addSystemMessage(`Question set: "${data.question}"`);
    }
    
    function handleGameStarted(data) {
        currentState = 'PLAYING';
        elements.welcomeMessage.classList.add('hidden');
        elements.gameStatus.classList.remove('waiting');
        elements.gameStatus.classList.add('playing');
        elements.statusText.textContent = 'Playing';
        
        if (isGameMaster) {
            elements.gmControls.classList.add('hidden');
        } else {
            elements.questionDisplay.classList.remove('hidden');
            elements.questionText.textContent = data.question;
            elements.guessForm.classList.remove('hidden');
            elements.guessInput.value = '';
            elements.guessInput.focus();
        }
        
        elements.timerValue.textContent = data.timeLeft;
        elements.timer.classList.remove('warning');
        
        addSystemMessage('Game started! Start guessing...');
    }
    
    function handleGuessResult(data) {
        if (data.correct) {
            addSuccessMessage('You guessed correctly! You won 10 points!');
            elements.guessForm.classList.add('hidden');
        } else {
            if (data.attemptsLeft === 0) {
                addErrorMessage(data.message);
                elements.guessForm.classList.add('hidden');
            } else {
                addErrorMessage(data.message);
            }
        }
    }
    
    function handleRoundEnded(data) {
        currentState = 'ENDED';
        elements.gameStatus.classList.remove('playing');
        elements.statusText.textContent = 'Ended';
        
        elements.questionDisplay.classList.add('hidden');
        elements.guessForm.classList.add('hidden');
        elements.gmControls.classList.add('hidden');
        elements.gameOverDisplay.classList.remove('hidden');
        
        if (data.winnerId) {
            const isMe = data.winnerId === myId;
            elements.winnerText.textContent = isMe ? 'You Won!' : `${data.winnerName} Won!`;
            elements.correctAnswer.innerHTML = `Answer: <span>${data.answer}</span>`;
            addSystemMessage(`${data.winnerName} guessed correctly and earned 10 points!`);
        } else {
            elements.winnerText.textContent = 'Time\'s Up!';
            elements.correctAnswer.innerHTML = `The answer was: <span>${data.answer}</span>`;
            addSystemMessage(`Time's up! The answer was: ${data.answer}`);
        }
        
        updateScoresListFromScores(data.scores);
        elements.timer.classList.remove('warning');
    }
    
    function handleNewGameMaster(data) {
        const wasGM = isGameMaster;
        isGameMaster = data.gameMasterId === myId;
        currentState = data.gameState || 'LOBBY';
        questionSet = false;
        
        elements.gameOverDisplay.classList.add('hidden');
        elements.gameStatus.classList.remove('playing', 'waiting');
        elements.statusText.textContent = 'Lobby';
        
        if (isGameMaster) {
            addSystemMessage(`You are now the Game Master! Set a question for the players.`);
        } else if (wasGM) {
            addSystemMessage(`${data.gameMasterName} is now the Game Master`);
        }
        
        updateGMUI();
    }
    
    function handleTimerTick(data) {
        elements.timerValue.textContent = data.timeLeft;
        if (data.timeLeft <= 10) {
            elements.timer.classList.add('warning');
        }
    }
    
    function updatePlayersList(players) {
        elements.playerList.innerHTML = '';
        elements.playerCount.textContent = players.length;
        playerCount = players.length;
        
        players.forEach(player => {
            const li = createPlayerListItem({ ...player, isGameMaster: player.isGameMaster });
            elements.playerList.appendChild(li);
        });
    }
    
    function createPlayerListItem(player) {
        const li = document.createElement('li');
        const initials = player.username.substring(0, 2).toUpperCase();
        
        li.innerHTML = `
            <div class="player-avatar">${initials}</div>
            <div class="player-info">
                <span class="player-name">${escapeHtml(player.username)}</span>
                ${player.isGameMaster ? '<span class="player-tag">GM</span>' : ''}
            </div>
        `;
        li.dataset.playerId = player.id;
        
        if (player.id === myId) {
            li.querySelector('.player-name').textContent += ' (You)';
        }
        
        return li;
    }
    
    function updateScoresList(players) {
        const sorted = [...(players || [])].sort((a, b) => b.score - a.score);
        elements.scoreList.innerHTML = '';
        
        sorted.forEach((player, index) => {
            const li = document.createElement('li');
            const initials = player.username.substring(0, 2).toUpperCase();
            
            li.innerHTML = `
                <div class="player-avatar">${initials}</div>
                <div class="player-info">
                    <span class="player-name">${escapeHtml(player.username)}</span>
                </div>
                <span class="player-score">${player.score}</span>
            `;
            
            if (index === 0 && player.score > 0) {
                li.classList.add('winner');
            }
            
            elements.scoreList.appendChild(li);
        });
    }
    
    function updateScoresListFromScores(scores) {
        const sorted = [...(scores || [])].sort((a, b) => b.score - a.score);
        elements.scoreList.innerHTML = '';
        
        sorted.forEach((player, index) => {
            const li = document.createElement('li');
            const initials = player.username.substring(0, 2).toUpperCase();
            
            li.innerHTML = `
                <div class="player-avatar">${initials}</div>
                <div class="player-info">
                    <span class="player-name">${escapeHtml(player.username)}</span>
                </div>
                <span class="player-score">${player.score}</span>
            `;
            
            if (index === 0 && player.score > 0) {
                li.classList.add('winner');
            }
            
            elements.scoreList.appendChild(li);
        });
    }
    
    function updateGMUI() {
        if (isGameMaster && currentState !== 'PLAYING') {
            elements.gmControls.classList.remove('hidden');
            
            if (!questionSet) {
                elements.setupForm.classList.remove('hidden');
                elements.startActions.classList.add('hidden');
            } else {
                elements.setupForm.classList.add('hidden');
                elements.startActions.classList.remove('hidden');
                updateStartButton();
            }
        } else {
            elements.gmControls.classList.add('hidden');
        }
        
        if (!isGameMaster && currentState !== 'PLAYING' && currentState !== 'ENDED') {
            elements.guessForm.classList.remove('hidden');
        }
    }
    
    function updateStartButton() {
        const enoughPlayers = playerCount >= 3;
        if (enoughPlayers) {
            elements.startGameBtn.disabled = false;
            elements.startGameHint.textContent = 'Ready to start!';
            elements.startGameHint.style.color = 'var(--mint)';
        } else {
            elements.startGameBtn.disabled = true;
            const needed = 3 - playerCount;
            elements.startGameHint.textContent = `Need ${needed} more player${needed > 1 ? 's' : ''} to start`;
            elements.startGameHint.style.color = '';
        }
    }
    
    function updateGameState(state) {
        switch (state) {
            case 'LOBBY':
                elements.gameStatus.classList.remove('playing', 'waiting');
                elements.statusText.textContent = 'Lobby';
                elements.questionDisplay.classList.add('hidden');
                elements.gameOverDisplay.classList.add('hidden');
                break;
            case 'WAITING':
                elements.gameStatus.classList.remove('playing');
                elements.gameStatus.classList.add('waiting');
                elements.statusText.textContent = 'Ready';
                break;
            case 'PLAYING':
                elements.gameStatus.classList.remove('waiting');
                elements.gameStatus.classList.add('playing');
                elements.statusText.textContent = 'Playing';
                break;
            case 'ENDED':
                elements.gameStatus.classList.remove('playing');
                elements.statusText.textContent = 'Ended';
                break;
        }
    }
    
    function addMessage(type, text, sender = null) {
        if (elements.welcomeMessage && !elements.welcomeMessage.classList.contains('hidden')) {
            elements.welcomeMessage.classList.add('hidden');
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (type === 'system') {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <span class="message-text">${escapeHtml(text)}</span>
                </div>
            `;
        } else {
            const initials = sender ? sender.substring(0, 2).toUpperCase() : '??';
            messageDiv.innerHTML = `
                <div class="message-avatar">${initials}</div>
                <div class="message-content">
                    ${sender ? `<div class="message-sender">${escapeHtml(sender)}</div>` : ''}
                    <div class="message-text">${escapeHtml(text)}</div>
                </div>
            `;
        }
        
        elements.messagesContainer.appendChild(messageDiv);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    function addSystemMessage(text) {
        addMessage('system', text);
    }
    
    function addErrorMessage(text) {
        addMessage('error', text);
    }
    
    function addSuccessMessage(text) {
        addMessage('success', text);
    }
    
    function showJoinScreen() {
        elements.joinScreen.classList.remove('hidden');
        elements.gameScreen.classList.add('hidden');
        ws = null;
        questionSet = false;
        playerCount = 0;
    }
    
    function showGameScreen() {
        elements.joinScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <p>Welcome to the game! Waiting for players to join...</p>
            </div>
        `;
    }
    
    function showError(message) {
        const el = elements.joinError;
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            setTimeout(() => {
                el.style.display = 'none';
            }, 5000);
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Event Listeners
    elements.joinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = elements.usernameInput.value.trim();
        const sessionCode = elements.sessionInput.value.trim().toUpperCase();
        
        if (!username) {
            showError('Please enter a username');
            return;
        }
        
        connect();
        
        ws.onopen = () => {
            send({
                event: 'join',
                username: username,
                sessionId: sessionCode || null
            });
        };
    });
    
    elements.copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(sessionId).then(() => {
            const original = elements.copyCodeBtn.innerHTML;
            elements.copyCodeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;
            setTimeout(() => { elements.copyCodeBtn.innerHTML = original; }, 2000);
        });
    });
    
    elements.leaveBtn.addEventListener('click', () => {
        send({ event: 'leave' });
        if (ws) ws.close();
        showJoinScreen();
        elements.usernameInput.value = '';
        elements.sessionInput.value = '';
    });
    
    elements.guessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const guess = elements.guessInput.value.trim();
        if (!guess) return;
        
        send({ event: 'guess', answer: guess });
        elements.guessInput.value = '';
    });
    
    elements.createQuestionBtn.addEventListener('click', () => {
        const question = elements.questionInput.value.trim();
        const answer = elements.answerInput.value.trim();
        
        if (!question || question.length < 5) {
            showError('Question must be at least 5 characters');
            return;
        }
        
        if (!answer) {
            showError('Please enter an answer');
            return;
        }
        
        send({ event: 'create_question', question, answer });
        elements.questionInput.value = '';
        elements.answerInput.value = '';
    });
    
    elements.startGameBtn.addEventListener('click', () => {
        if (elements.startGameBtn.disabled) return;
        send({ event: 'start_game' });
    });
    
    window.addEventListener('beforeunload', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            send({ event: 'leave' });
        }
    });
})();