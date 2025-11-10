// Configuration du niveau
const LEVEL = {
    id: "classic",
    name: "Classic Escape",
    rows: 7,  // Augmenté de 6 à 7 pour correspondre au JSON
    cols: 6,
    exit: { row: 6, columns: [2, 3] },  // Ajusté pour la 7ème ligne
    pieces: [
        // Pièce principale (rouge)
        { id: "d", type: "d", row: 1, col: 2, width: 2, height: 2 },
        // Pièce horizontale
        { id: "b1", type: "b", row: 3, col: 2, width: 2, height: 1 },
        // Pièces verticales
        { id: "c1", type: "c", row: 1, col: 1, width: 1, height: 2 },
        { id: "c2", type: "c", row: 1, col: 4, width: 1, height: 2 },
        { id: "c3", type: "c", row: 4, col: 1, width: 1, height: 2 },  // Ajusté pour commencer à la ligne 4
        { id: "c4", type: "c", row: 4, col: 4, width: 1, height: 2 },  // Ajusté pour commencer à la ligne 4
        // Petits carrés
        { id: "a1", type: "a", row: 4, col: 2, width: 1, height: 1 },
        { id: "a2", type: "a", row: 4, col: 3, width: 1, height: 1 },
        { id: "a3", type: "a", row: 5, col: 2, width: 1, height: 1 },  // Déplacé à la ligne 5
        { id: "a4", type: "a", row: 5, col: 3, width: 1, height: 1 }   // Déplacé à la ligne 5
    ]
};

// État initial du jeu
const initialState = {
    pieces: new Map(),
    history: [],
    draggedPiece: null,
    dragStartX: 0,
    dragStartY: 0,
    victory: false,
    startTime: null,
    timer: null
};

// Récupération des éléments DOM
const boardElement = document.getElementById('board');
const moveCounterElement = document.getElementById('moveCounter');
const elapsedTimeElement = document.getElementById('elapsedTime');
const historyListElement = document.getElementById('historyList');
const undoButton = document.getElementById('undoButton');
const resetButton = document.getElementById('resetButton');
const replayButton = document.getElementById('replayButton');
const restartButton = document.getElementById('restartButton');
const playbackButton = document.getElementById('playbackButton');
const victoryOverlay = document.getElementById('victoryOverlay');
const victorySummary = document.getElementById('victorySummary');

let state = { ...initialState };

function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function startTimer() {
    stopTimer();
    state.startTime = performance.now();
    state.timer = setInterval(updateElapsed, 250);
    updateElapsed();
}

function stopTimer() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
}

function updateUI() {
    // Mettre à jour le compteur de mouvements
    moveCounterElement.textContent = state.history.length;
    
    // Activer/désactiver les boutons en fonction de l'état
    undoButton.disabled = state.victory || state.history.length === 0 || state.isDragging;
    playbackButton.disabled = state.victory || state.history.length === 0 || state.isDragging;
    resetButton.disabled = false;
    
    // Mettre à jour l'historique des mouvements
    updateMoveHistory();
}

function updateElapsed() {
    if (!state.startTime) {
        elapsedTimeElement.textContent = "00:00";
        return;
    }
    elapsedTimeElement.textContent = formatTime(performance.now() - state.startTime);
}

function disableAllButtons(disabled) {
    const buttons = [
        undoButton, 
        resetButton, 
        playbackButton, 
        replayButton, 
        restartButton
    ];
    
    buttons.forEach(button => {
        if (button) button.disabled = disabled;
    });
}

function resetState() {
    // Réinitialiser l'état du jeu
    state.pieces.clear();
    state.history = [];
    state.undone = [];
    state.victory = false;
    state.isDragging = false;
    state.draggedPiece = null;
    state.dragStartX = 0;
    state.dragStartY = 0;
    state.replaying = false;
    state.dragContext = null;
    state.startTime = 0;
    state.timer = null;
    
    // Réinitialiser l'interface
    moveCounterElement.textContent = "0";
    elapsedTimeElement.textContent = "00:00";
    historyListElement.innerHTML = "";
    victoryOverlay.hidden = true;
    
    // Réactiver tous les boutons
    disableAllButtons(false);
    
    // Désactiver les boutons inutiles au démarrage
    undoButton.disabled = true;
    playbackButton.disabled = true;
    replayButton.disabled = true;
}

function createBoard() {
    // Vider le plateau
    boardElement.innerHTML = '';
    
    // Définir la grille CSS
    boardElement.style.setProperty('--rows', LEVEL.rows);
    boardElement.style.setProperty('--cols', LEVEL.cols);
    
    // Créer les cellules du plateau
    const fragment = document.createDocumentFragment();
    
    for (let row = 0; row < LEVEL.rows; row++) {
        for (let col = 0; col < LEVEL.cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Vérifier si c'est un mur ou une sortie en fonction de la grille
            const isWall = (row === 0) ||  // Mur du haut
                          (col === 0) ||   // Mur de gauche
                          (col === LEVEL.cols - 1) ||  // Mur de droite
                          (row === LEVEL.rows - 1 && (col === 0 || col === 1 || col === 4 || col === 5));  // Mur du bas avec sortie au milieu
            
            const isExit = row === LEVEL.exit.row && 
                          col >= LEVEL.exit.columns[0] && 
                          col <= LEVEL.exit.columns[1];
            
            if (isWall && !isExit) {
                cell.classList.add('wall');
            } else if (isExit) {
                cell.classList.add('exit');
            }
            
            fragment.appendChild(cell);
        }
    }
    
    boardElement.appendChild(fragment);
}

function createPieceElement(piece) {
    const element = document.createElement("div");
    element.className = "piece";
    element.dataset.id = piece.id;
    element.dataset.type = piece.type;
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `Piece ${piece.type}`);
    boardElement.appendChild(element);
    return element;
}

function getMetrics() {
    const rect = boardElement.getBoundingClientRect();
    const style = getComputedStyle(boardElement);
    const gap = parseFloat(style.gap) || 0;
    const paddingX = parseFloat(style.paddingLeft) || 0;
    const paddingY = parseFloat(style.paddingTop) || 0;
    const usableWidth = rect.width - paddingX * 2 - gap * (state.level.cols - 1);
    const usableHeight = rect.height - paddingY * 2 - gap * (state.level.rows - 1);

    return {
        cellWidth: usableWidth / state.level.cols,
        cellHeight: usableHeight / state.level.rows,
        gap,
        paddingX,
        paddingY,
    };
}

function placePieces() {
    // Réinitialiser les pièces
    state.pieces.clear();
    
    // Créer chaque pièce
    for (const pieceDef of LEVEL.pieces) {
        const piece = {
            ...pieceDef,
            element: createPieceElement(pieceDef)
        };
        
        // Ajouter la pièce à l'état
        state.pieces.set(piece.id, piece);
        
        // Positionner la pièce
        updatePiecePosition(piece);
    }
}

function updatePiecePosition(piece, metrics = getMetrics()) {
    const { cellWidth, cellHeight, gap, paddingX, paddingY } = metrics;
    const x = paddingX + piece.col * (cellWidth + gap);
    const y = paddingY + piece.row * (cellHeight + gap);
    const width = piece.width * cellWidth + (piece.width - 1) * gap;
    const height = piece.height * cellHeight + (piece.height - 1) * gap;

    piece.element.style.transform = `translate(${x}px, ${y}px)`;
    piece.element.style.width = `${width}px`;
    piece.element.style.height = `${height}px`;
}

function refreshPieces() {
    const metrics = getMetrics();
    state.pieces.forEach((piece) => updatePiecePosition(piece, metrics));
}

function canOccupy(piece, row, col) {
    if (row < 0 || col < 0) {
        return false;
    }
    if (row + piece.height > state.level.rows || col + piece.width > state.level.cols) {
        return false;
    }

    for (let r = row; r < row + piece.height; r += 1) {
        for (let c = col; c < col + piece.width; c += 1) {
            const isBorder = r === 0 || c === 0 || r === state.level.rows - 1 || c === state.level.cols - 1;
            const isExit =
                r === state.level.exit.row &&
                c >= state.level.exit.columns[0] &&
                c <= state.level.exit.columns[1];

            // Seule la pièce rouge (type 'd') peut aller sur la sortie
            if (isExit && piece.type !== 'd') {
                return false;
            }

            if (isBorder && !isExit) {
                return false;
            }

            for (const other of state.pieces.values()) {
                if (other.id === piece.id) {
                    continue;
                }
                if (
                    r >= other.row &&
                    r < other.row + other.height &&
                    c >= other.col &&
                    c < other.col + other.width
                ) {
                    return false;
                }
            }
        }
    }

    return true;
}

// Vérifie si un mouvement est valide (case par case, orthogonal uniquement)
function isValidMove(piece, fromRow, fromCol, toRow, toCol) {
    // Calculer la différence de position
    const deltaRow = toRow - fromRow;
    const deltaCol = toCol - fromCol;
    
    // Le mouvement doit être orthogonal (pas diagonal)
    if (deltaRow !== 0 && deltaCol !== 0) {
        return false;
    }
    
    // Le mouvement doit être d'exactement une case dans une direction
    const totalMove = Math.abs(deltaRow) + Math.abs(deltaCol);
    if (totalMove !== 1) {
        return false;
    }
    
    // Vérifier que la destination est libre avec canOccupy
    // (qui vérifie déjà les collisions, les bordures et la sortie)
    return canOccupy(piece, toRow, toCol);
}

function recordMove(piece, fromRow, fromCol) {
    state.history.push({ 
        pieceId: piece.id, 
        fromRow, 
        fromCol, 
        toRow: piece.row, 
        toCol: piece.col 
    });
    state.undone = [];
    
    // Mettre à jour l'interface
    updateUI();
}

function updateMoveHistory() {
    historyListElement.innerHTML = '';
    state.history.forEach((move, index) => {
        const li = document.createElement('li');
        li.textContent = `Move ${index + 1}: ${move.pieceId} to (${move.toRow}, ${move.toCol})`;
        historyListElement.appendChild(li);
    });
    
    // Faire défiler vers le bas pour voir le dernier mouvement
    if (historyListElement.lastElementChild) {
        historyListElement.lastElementChild.scrollIntoView({ behavior: 'smooth' });
    }
}

function movePiece(piece, row, col) {
    // Sauvegarder l'ancienne position
    const fromRow = piece.row;
    const fromCol = piece.col;
    
    // Mettre à jour la position de la pièce
    piece.row = row;
    piece.col = col;
    
    // Mettre à jour la position visuelle
    updatePiecePosition(piece);
    
    // Enregistrer le mouvement
    recordMove(piece, fromRow, fromCol);
    
    // Vérifier la victoire
    checkVictory();
    
    // Mettre à jour l'interface
    updateUI();
}

function handlePointerMove(event) {
    if (!state.isDragging || !state.draggedPiece) return;
    
    event.preventDefault();
    
    const piece = state.draggedPiece;
    const metrics = getMetrics();
    const cellSize = Math.min(metrics.cellWidth, metrics.cellHeight);
    
    // Calculer le déplacement en nombre de cellules depuis la position originale
    const dx = Math.round((event.clientX - state.dragStartX) / cellSize);
    const dy = Math.round((event.clientY - state.dragStartY) / cellSize);
    
    // Calculer la nouvelle position en cellules (toujours depuis l'origine du drag)
    const newCol = state.originalX + dx;
    const newRow = state.originalY + dy;
    
    // Ne rien faire si la position n'a pas changé
    if (newRow === piece.row && newCol === piece.col) {
        return;
    }
    
    // Vérifier si on peut bouger d'une case depuis la position actuelle
    if (isValidMove(piece, piece.row, piece.col, newRow, newCol)) {
        // Mouvement valide : mettre à jour la position
        piece.row = newRow;
        piece.col = newCol;
        updatePiecePosition(piece);
        
        // Mettre à jour la position de référence pour le prochain mouvement
        state.dragStartX = event.clientX;
        state.dragStartY = event.clientY;
        state.originalX = newCol;
        state.originalY = newRow;
    }
    // Si le mouvement n'est pas valide, la pièce reste à sa position actuelle (pas de bounce)
}

function checkVictory() {
    // Vérifier si le jeu est déjà gagné
    if (state.victory) return;
    
    // Trouver la pièce rouge (type 'd')
    const redPiece = Array.from(state.pieces.values()).find(p => p.type === 'd');
    if (!redPiece) return;
    
    // Vérifier si la pièce rouge est sur la sortie
    const isOnExit = redPiece.row + redPiece.height - 1 === state.level.exit.row &&
                    redPiece.col >= state.level.exit.columns[0] &&
                    redPiece.col + redPiece.width - 1 <= state.level.exit.columns[1];
    
    if (isOnExit) {
        // Marquer la victoire
        state.victory = true;
        stopTimer();
        
        // Afficher le message de victoire
        const timeElapsed = elapsedTimeElement.textContent;
        const moves = state.history.length;
        victorySummary.textContent = `Victoire en ${moves} coups et ${timeElapsed} !`;
        
        // Afficher l'overlay de victoire
        victoryOverlay.hidden = false;
        
        // Désactiver les contrôles
        disableAllButtons(true);
        replayButton.disabled = false;
        restartButton.disabled = false;
    }
}

function handlePointerDown(event) {
    if (state.victory || !event.target.closest('.piece')) return;
    
    const pieceElement = event.target.closest('.piece');
    const pieceId = pieceElement.dataset.id;
    const piece = state.pieces.get(pieceId);
    
    if (!piece) return;
    
    event.preventDefault();
    
    // Capturer le pointeur pour les événements de déplacement
    pieceElement.setPointerCapture(event.pointerId);
    
    // Sauvegarder la position de départ du glissement
    state.isDragging = true;
    state.draggedPiece = piece;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.originalX = piece.col;
    state.originalY = piece.row;
    
    // Ajouter une classe pour le style pendant le glissement
    pieceElement.classList.add('dragging');
}

function handlePointerUp(event) {
    if (!state.isDragging || !state.draggedPiece) {
        return;
    }
    
    event.preventDefault();
    
    const piece = state.draggedPiece;
    const pieceElement = document.querySelector(`.piece[data-id="${piece.id}"]`);
    
    // Vérifier si la position a changé
    if (piece.row !== state.originalY || piece.col !== state.originalX) {
        // Enregistrer le mouvement
        recordMove(piece, state.originalY, state.originalX);
        
        // Vérifier la victoire
        checkVictory();
        
        // Mettre à jour l'interface
        updateUI();
    }
    
    // Retirer la classe de style de glissement
    if (pieceElement) {
        pieceElement.classList.remove('dragging');
        
        // Forcer une mise à jour de la position pour s'assurer qu'elle est alignée sur la grille
        updatePiecePosition(piece);
    }
    
    // Réinitialiser l'état de glisser-déposer
    state.isDragging = false;
    state.draggedPiece = null;
    
    // Libérer la capture du pointeur
    if (event.target.releasePointerCapture) {
        event.target.releasePointerCapture(event.pointerId);
    }
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLevel() {
    // Arrêter tout ce qui est en cours
    stopTimer();
    
    // Réinitialiser complètement l'état
    resetState();
    
    // Mettre à jour le niveau
    state.level = LEVEL;
    
    // Recréer le plateau et les pièces
    createBoard();
    placePieces();
    
    // Redémarrer le chronomètre
    state.startTime = performance.now();
    startTimer();
    
    // Activer/désactiver les boutons appropriés
    resetButton.disabled = false;
    replayButton.disabled = true;
}

// Variable pour éviter d'ajouter les écouteurs plusieurs fois
let listenersInitialized = false;

function setupEventListeners() {
    // Ne configurer les écouteurs qu'une seule fois
    if (listenersInitialized) return;
    listenersInitialized = true;
    
    // Gestion des clics sur les boutons
    undoButton.addEventListener('click', handleUndo);
    resetButton.addEventListener('click', handleReset);
    replayButton.addEventListener('click', handleReplay);
    restartButton.addEventListener('click', handleRestart);
    playbackButton.addEventListener('click', handleReplay);
    
    // Gestion des événements de glisser-déposer
    boardElement.addEventListener('pointerdown', handlePointerDown);
    boardElement.addEventListener('pointermove', handlePointerMove);
    boardElement.addEventListener('pointerup', handlePointerUp);
    boardElement.addEventListener('pointercancel', handlePointerUp);
    
    // Empêcher le comportement par défaut du navigateur
    boardElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Gérer le redimensionnement de la fenêtre
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (!state.isDragging) {
                refreshPieces();
            }
        }, 100);
    });
}

// Gestionnaires d'événements
function handleUndo() {
    if (state.victory || state.history.length === 0) return;
    
    const lastMove = state.history.pop();
    if (!lastMove) return;
    
    const piece = state.pieces.get(lastMove.pieceId);
    initGame();
    
    // Réappliquer les mouvements
    let delay = 0;
    const moves = [...state.history];
    
    moves.forEach((move, index) => {
        setTimeout(() => {
            const piece = state.pieces.get(move.pieceId);
            if (piece) {
                piece.row = move.toRow;
                piece.col = move.toCol;
                updatePiecePosition(piece);
                
                // Si c'est le dernier mouvement, vérifier la victoire
                if (index === moves.length - 1) {
                    checkVictory();
                }
            }
        }, 300 * (index + 1));
    });
    
    // Réactiver les contrôles après la relecture
    setTimeout(() => {
        disableAllButtons(false);
    }, 300 * (moves.length + 1));
}

function handleRestart() {
    // Réinitialiser l'état de victoire
    state.victory = false;
    
    // Cacher l'overlay de victoire
    victoryOverlay.hidden = true;
    
    // Réinitialiser le niveau
    loadLevel();
    
    // Forcer la mise à jour de l'interface
    updateUI();
}

function handleReset() {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser le niveau ?")) {
        loadLevel();
    }
}

async function handleReplay() {
    if (state.history.length === 0) return;
    
    // Sauvegarder l'état actuel
    const currentState = {
        pieces: new Map(state.pieces),
        history: [...state.history],
        victory: state.victory
    };
    
    try {
        // Désactiver les boutons pendant la relecture
        disableAllButtons(true);
        
        // Cacher l'overlay de victoire s'il est affiché
        victoryOverlay.hidden = true;
        state.victory = false;
        
        // Réinitialiser le plateau
        await loadLevel();
        
        // Rejouer chaque mouvement avec un délai
        for (const move of currentState.history) {
            const piece = state.pieces.get(move.pieceId);
            if (piece) {
                // Mettre à jour la position de la pièce
                piece.row = move.toRow;
                piece.col = move.toCol;
                updatePiecePosition(piece);
                
                // Mettre à jour l'historique visuel
                state.history.push(move);
                updateUI();
                
                // Petit délai pour la lisibilité
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Vérifier la victoire si nécessaire
        if (currentState.victory) {
            state.victory = true;
            stopTimer();
            const timeElapsed = elapsedTimeElement.textContent;
            victorySummary.textContent = `Victoire en ${state.history.length} coups et ${timeElapsed} !`;
            victoryOverlay.hidden = false;
        }
    } finally {
        // Réactiver les boutons
        disableAllButtons(false);
        replayButton.disabled = state.history.length === 0;
    }
}

// Initialisation du jeu
function initGame() {
    // Ajouter les écouteurs d'événements (une seule fois)
    setupEventListeners();
    
    // Masquer l'overlay de victoire avant toute initialisation
    victoryOverlay.hidden = true;
    
    // Réinitialiser complètement l'état
    resetState();
    
    // Définir le niveau
    state.level = LEVEL;
    
    // Créer le plateau
    createBoard();
    
    // Placer les pièces
    placePieces();
    
    // Démarrer le chronomètre
    state.startTime = performance.now();
    startTimer();
    
    // Mettre à jour l'interface
    updateUI();
}

// Démarrer le jeu au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
