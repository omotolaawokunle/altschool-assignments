const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();
const playerToSession = new Map();

function generateSessionId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generatePlayerId() {
    return Math.random().toString(36).substring(2, 10);
}

function validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    const trimmed = username.trim();
    return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9 ]+$/.test(trimmed);
}

function validateQuestion(question) {
    if (!question || typeof question !== 'string') return false;
    return question.trim().length >= 5 && question.trim().length <= 200;
}

function validateAnswer(answer) {
    if (!answer || typeof answer !== 'string') return false;
    return answer.trim().length >= 1 && answer.trim().length <= 100;
}

function broadcast(session, event, data, excludeId = null) {
    session.players.forEach((player, id) => {
        if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({ event, ...data }));
        }
    });
}

function sendTo(ws, event, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, ...data }));
    }
}

function getSessionInfo(session) {
    const players = Array.from(session.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        score: p.score,
        isGameMaster: p.id === session.gameMasterId
    }));
    return {
        sessionId: session.id,
        players,
        gameState: session.gameState,
        currentQuestion: session.currentQuestion ? { question: session.currentQuestion.question } : null,
        timeLeft: session.timeLeft || 0
    };
}

function createQuestion(session, question, answer) {
    session.currentQuestion = { question: question.trim(), answer: answer.trim().toLowerCase() };
    session.gameState = 'WAITING';
    broadcast(session, 'question_created', { question: session.currentQuestion.question }, session.gameMasterId);
}

function startGame(session) {
    if (session.gameState !== 'WAITING') return false;
    
    session.gameState = 'PLAYING';
    session.timeLeft = 60;
    session.roundStartTime = Date.now();
    session.timerInterval = setInterval(() => {
        session.timeLeft--;
        broadcast(session, 'timer_tick', { timeLeft: session.timeLeft });
        
        if (session.timeLeft <= 0) {
            endRound(session, null);
        }
    }, 1000);
    
    session.players.forEach(player => {
        player.attemptsLeft = 3;
        player.hasGuessed = false;
        player.isWinner = false;
    });
    
    broadcast(session, 'game_started', {
        question: session.currentQuestion.question,
        timeLeft: session.timeLeft
    }, session.gameMasterId);
    
    sendTo(session.players.get(session.gameMasterId).ws, 'game_started', {
        question: session.currentQuestion.question,
        answer: session.currentQuestion.answer,
        timeLeft: session.timeLeft
    });
    
    return true;
}

function handleGuess(session, player, guess) {
    if (session.gameState !== 'PLAYING') {
        sendTo(player.ws, 'error', { message: 'Game is not active' });
        return;
    }
    
    if (player.hasGuessed) {
        sendTo(player.ws, 'error', { message: 'You have already guessed' });
        return;
    }
    
    player.attemptsLeft--;
    const isCorrect = guess.trim().toLowerCase() === session.currentQuestion.answer;
    
    if (isCorrect) {
        player.hasGuessed = true;
        player.isWinner = true;
        player.score += 10;
        endRound(session, player);
        return;
    }
    
    if (player.attemptsLeft <= 0) {
        player.hasGuessed = true;
        broadcast(session, 'player_guessed', { playerId: player.id, username: player.username, correct: false });
        sendTo(player.ws, 'guess_result', { 
            correct: false, 
            attemptsLeft: 0, 
            message: 'Out of attempts! The answer was: ' + session.currentQuestion.answer
        });
        
        const allPlayersGuessed = Array.from(session.players.values()).every(p => p.hasGuessed);
        if (allPlayersGuessed) {
            endRound(session, null);
        }
        return;
    }
    
    sendTo(player.ws, 'guess_result', { 
        correct: false, 
        attemptsLeft: player.attemptsLeft,
        message: `Wrong! ${player.attemptsLeft} attempts remaining`
    });
}

function endRound(session, winner) {
    if (session.timerInterval) {
        clearInterval(session.timerInterval);
        session.timerInterval = null;
    }
    
    session.gameState = 'ENDED';
    
    const scores = Array.from(session.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        score: p.score
    }));
    
    broadcast(session, 'round_ended', {
        winnerId: winner ? winner.id : null,
        winnerName: winner ? winner.username : null,
        answer: session.currentQuestion.answer,
        scores
    });
    
    const remainingPlayers = Array.from(session.players.values()).filter(p => p.ws.readyState === WebSocket.OPEN);
    if (remainingPlayers.length > 1) {
        const currentGMIndex = remainingPlayers.findIndex(p => p.id === session.gameMasterId);
        const nextGMIndex = (currentGMIndex + 1) % remainingPlayers.length;
        const newGM = remainingPlayers[nextGMIndex];
        
        session.gameMasterId = newGM.id;
        
        setTimeout(() => {
            broadcast(session, 'new_game_master', { 
                gameMasterId: newGM.id, 
                gameMasterName: newGM.username,
                gameState: 'LOBBY'
            });
        }, 2000);
    }
}

function removePlayer(session, playerId) {
    const player = session.players.get(playerId);
    if (!player) return;
    
    session.players.delete(playerId);
    playerToSession.delete(playerId);
    
    broadcast(session, 'player_left', { playerId, username: player.username });
    
    if (session.players.size === 0) {
        if (session.timerInterval) {
            clearInterval(session.timerInterval);
        }
        sessions.delete(session.id);
        return;
    }
    
    if (session.gameState === 'PLAYING') {
        const remainingPlayers = Array.from(session.players.values()).filter(p => p.ws.readyState === WebSocket.OPEN);
        if (remainingPlayers.length < 3) {
            broadcast(session, 'error', { message: 'Not enough players. Game ended.' });
            endRound(session, null);
        }
    }
    
    if (playerId === session.gameMasterId) {
        const remaining = Array.from(session.players.values()).filter(p => p.ws.readyState === WebSocket.OPEN);
        if (remaining.length > 0) {
            session.gameMasterId = remaining[0].id;
            broadcast(session, 'new_game_master', { 
                gameMasterId: session.gameMasterId,
                gameMasterName: remaining[0].username
            });
        }
    }
    
    sendToAll(session);
}

function sendToAll(session) {
    session.players.forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
            const isGM = player.id === session.gameMasterId;
            sendTo(player.ws, 'session_info', {
                ...getSessionInfo(session),
                isGameMaster: isGM,
                yourId: player.id
            });
        }
    });
}

wss.on('connection', (ws) => {
    let playerId = null;
    
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            sendTo(ws, 'error', { message: 'Invalid JSON' });
            return;
        }
        
        const { event } = data;
        
        switch (event) {
            case 'join': {
                if (!validateUsername(data.username)) {
                    sendTo(ws, 'error', { message: 'Invalid username (2-20 chars, alphanumeric + spaces)' });
                    return;
                }
                
                let session;
                let sessionId = data.sessionId ? data.sessionId.toUpperCase().trim() : null;
                
                if (sessionId && sessions.has(sessionId)) {
                    session = sessions.get(sessionId);
                    
                    if (session.gameState === 'PLAYING') {
                        sendTo(ws, 'error', { message: 'Game in progress. Cannot join now.' });
                        return;
                    }
                    
                    if (session.players.size >= 20) {
                        sendTo(ws, 'error', { message: 'Session is full' });
                        return;
                    }
                } else {
                    sessionId = generateSessionId();
                    while (sessions.has(sessionId)) {
                        sessionId = generateSessionId();
                    }
                    
                    session = {
                        id: sessionId,
                        players: new Map(),
                        gameMasterId: null,
                        gameState: 'LOBBY',
                        currentQuestion: null,
                        timeLeft: 60,
                        roundStartTime: null,
                        timerInterval: null
                    };
                    sessions.set(sessionId, session);
                }
                
                playerId = generatePlayerId();
                const player = {
                    id: playerId,
                    username: data.username.trim(),
                    ws,
                    score: 0,
                    attemptsLeft: 3,
                    hasGuessed: false,
                    isWinner: false
                };
                
                session.players.set(playerId, player);
                playerToSession.set(playerId, session);
                
                if (session.players.size === 1) {
                    session.gameMasterId = playerId;
                }
                
                sendTo(ws, 'session_info', {
                    ...getSessionInfo(session),
                    isGameMaster: playerId === session.gameMasterId,
                    yourId: playerId,
                    isNew: !data.sessionId
                });
                
                broadcast(session, 'player_joined', { 
                    player: { id: playerId, username: player.username, score: 0 }
                }, playerId);
                break;
            }
            
            case 'create_question': {
                if (!playerId || !playerToSession.has(playerId)) {
                    sendTo(ws, 'error', { message: 'Not in a session' });
                    return;
                }
                
                const session = playerToSession.get(playerId);
                if (session.gameMasterId !== playerId) {
                    sendTo(ws, 'error', { message: 'Only game master can create questions' });
                    return;
                }
                
                if (session.gameState === 'PLAYING') {
                    sendTo(ws, 'error', { message: 'Game in progress' });
                    return;
                }
                
                if (!validateQuestion(data.question)) {
                    sendTo(ws, 'error', { message: 'Invalid question (5-200 chars)' });
                    return;
                }
                
                if (!validateAnswer(data.answer)) {
                    sendTo(ws, 'error', { message: 'Invalid answer (1-100 chars)' });
                    return;
                }
                
                createQuestion(session, data.question, data.answer);
                
                sendTo(ws, 'question_created_gm', { 
                    question: data.question,
                    answer: data.answer 
                });
                
                sendToAll(session);
                break;
            }
            
            case 'start_game': {
                if (!playerId || !playerToSession.has(playerId)) {
                    sendTo(ws, 'error', { message: 'Not in a session' });
                    return;
                }
                
                const session = playerToSession.get(playerId);
                if (session.gameMasterId !== playerId) {
                    sendTo(ws, 'error', { message: 'Only game master can start game' });
                    return;
                }
                
                if (session.gameState !== 'WAITING') {
                    sendTo(ws, 'error', { message: 'Create a question first' });
                    return;
                }
                
                if (session.players.size < 3) {
                    sendTo(ws, 'error', { message: 'Need at least 3 players to start' });
                    return;
                }
                
                startGame(session);
                break;
            }
            
            case 'guess': {
                if (!playerId || !playerToSession.has(playerId)) {
                    sendTo(ws, 'error', { message: 'Not in a session' });
                    return;
                }
                
                const session = playerToSession.get(playerId);
                const player = session.players.get(playerId);
                
                if (!player) {
                    sendTo(ws, 'error', { message: 'Player not found' });
                    return;
                }
                
                if (playerId === session.gameMasterId) {
                    sendTo(ws, 'error', { message: 'Game master cannot guess' });
                    return;
                }
                
                if (!data.answer || typeof data.answer !== 'string') {
                    sendTo(ws, 'error', { message: 'Invalid guess' });
                    return;
                }
                
                handleGuess(session, player, data.answer);
                break;
            }
            
            case 'leave': {
                if (playerId && playerToSession.has(playerId)) {
                    const session = playerToSession.get(playerId);
                    removePlayer(session, playerId);
                }
                break;
            }
        }
    });
    
    ws.on('close', () => {
        if (playerId && playerToSession.has(playerId)) {
            const session = playerToSession.get(playerId);
            removePlayer(session, playerId);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Guessing Game server running on http://localhost:${PORT}`);
});