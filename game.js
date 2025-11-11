// Variable pour stocker le niveau actuel
let currentLevel = null;

// Fonction pour parser un niveau depuis le format JSON
function parseLevel(levelData) {
    const grid = levelData.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Structures pour stocker les informations extraites
    const pieces = [];
    let exit = null;
    const visited = new Set();
    const pieceCounters = { v: 0, h: 0, d: 0, a: 0 };
    
    // Scanner la grille pour trouver les pièces et la sortie
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = grid[row][col];
            const key = `${row},${col}`;
            
            // Ignorer les cellules déjà visitées
            if (visited.has(key)) continue;
            
            // Détecter les sorties
            if (cell === 'f') {
                if (!exit) {
                    exit = { row, columns: [col, col] };
                } else {
                    // Mettre à jour la ligne de sortie (prendre la plus basse)
                    exit.row = Math.max(exit.row, row);
                    // Étendre la plage de colonnes
                    exit.columns[0] = Math.min(exit.columns[0], col);
                    exit.columns[1] = Math.max(exit.columns[1], col);
                }
                visited.add(key);
                continue;
            }
            
            // Ignorer les cases vides et les espaces
            if (cell === '.' || cell === ' ') {
                visited.add(key);
                continue;
            }
            
            // Détecter les pièces
            if (cell === 'v' || cell === 'h' || cell === 'd' || cell === 'a') {
                const piece = detectPiece(grid, row, col, cell, visited);
                if (piece) {
                    pieceCounters[cell]++;
                    piece.id = cell === 'd' ? 'd' : `${cell}${pieceCounters[cell]}`;
                    pieces.push(piece);
                }
            }
        }
    }
    
    return {
        id: levelData.id,
        name: levelData.name,
        rows,
        cols,
        exit,
        pieces,
        grid
    };
}

// Fonction pour détecter une pièce à partir d'une cellule
function detectPiece(grid, startRow, startCol, type, visited) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Vérifier la taille de la pièce selon son type
    let width = 1;
    let height = 1;
    
    if (type === 'v') {
        // Pièce verticale: 1x2
        width = 1;
        height = 2;
        
        // Vérifier si la pièce est complète
        if (startRow + 1 < rows && grid[startRow + 1][startCol] === 'v') {
            // Marquer les cellules comme visitées
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow + 1},${startCol}`);
        } else {
            return null;
        }
    } else if (type === 'h') {
        // Pièce horizontale: 2x1
        width = 2;
        height = 1;
        
        // Vérifier si la pièce est complète
        if (startCol + 1 < cols && grid[startRow][startCol + 1] === 'h') {
            // Marquer les cellules comme visitées
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow},${startCol + 1}`);
        } else {
            return null;
        }
    } else if (type === 'd') {
        // Pièce 2x2
        width = 2;
        height = 2;
        
        // Vérifier si la pièce est complète
        if (startRow + 1 < rows && startCol + 1 < cols &&
            grid[startRow][startCol + 1] === 'd' &&
            grid[startRow + 1][startCol] === 'd' &&
            grid[startRow + 1][startCol + 1] === 'd') {
            // Marquer les cellules comme visitées
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow},${startCol + 1}`);
            visited.add(`${startRow + 1},${startCol}`);
            visited.add(`${startRow + 1},${startCol + 1}`);
        } else {
            return null;
        }
    } else if (type === 'a') {
        // Pièce 1x1
        width = 1;
        height = 1;
        visited.add(`${startRow},${startCol}`);
    }
    
    return {
        type,
        row: startRow,
        col: startCol,
        width,
        height
    };
}

// État initial du jeu
const initialState = {
    pieces: new Map(),
    history: [],
    draggedPiece: null,
    dragStartX: 0,
    dragStartY: 0,
    victory: false,
    startTime: null,
    timer: null,
    isDragging: false
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
    boardElement.style.setProperty('--rows', currentLevel.rows);
    boardElement.style.setProperty('--cols', currentLevel.cols);
    
    // Créer les cellules du plateau
    const fragment = document.createDocumentFragment();
    const grid = currentLevel.grid;
    
    for (let row = 0; row < currentLevel.rows; row++) {
        for (let col = 0; col < currentLevel.cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            const gridCell = grid[row][col];
            
            // Déterminer le type de cellule selon le caractère dans la grille
            if (gridCell === ' ') {
                // Espace vide (inatteignable)
                cell.classList.add('wall');
            } else if (gridCell === 'f') {
                // Sortie
                cell.classList.add('exit');
            } else if (gridCell === '.') {
                // Case vide jouable - pas de classe spéciale
            } else {
                // Pièce - sera dessinée par dessus, pas de classe spéciale
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
    
    // Créer chaque pièce depuis le niveau parsé
    for (const pieceDef of currentLevel.pieces) {
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
    // Vérifier les limites du plateau
    if (row < 0 || col < 0) {
        return false;
    }
    if (row + piece.height > state.level.rows || col + piece.width > state.level.cols) {
        return false;
    }

    const grid = state.level.grid;
    
    // Pour la pièce rouge, vérifier qu'elle ne peut pas être à cheval entre un mur ' ' et autre chose
    // Elle peut être à cheval entre 'f' (sortie) et '.' ou 'd' (cases normales)
    if (piece.type === 'd') {
        let hasWallCell = false;  // Cellule sur un mur ' '
        let hasNonWallCell = false;  // Cellule sur autre chose que ' '
        
        for (let r = row; r < row + piece.height; r += 1) {
            for (let c = col; c < col + piece.width; c += 1) {
                const gridCell = grid[r][c];
                if (gridCell === ' ') {
                    hasWallCell = true;
                } else {
                    hasNonWallCell = true;
                }
            }
        }
        
        // Si la pièce rouge a au moins une cellule sur un mur ' ' ET au moins une cellule ailleurs,
        // alors le mouvement est interdit (pas de position à cheval avec un mur)
        if (hasWallCell && hasNonWallCell) {
            return false;
        }
    }

    // Vérifier chaque cellule que la pièce occuperait
    for (let r = row; r < row + piece.height; r += 1) {
        for (let c = col; c < col + piece.width; c += 1) {
            const gridCell = grid[r][c];
            
            // Vérifier si c'est un mur (espace vide ' ')
            if (gridCell === ' ') {
                // Seule la pièce rouge peut aller sur les espaces de sortie
                if (piece.type !== 'd') {
                    return false;
                }
            }
            
            // Vérifier si c'est une sortie ('f')
            if (gridCell === 'f') {
                // Seule la pièce rouge peut aller sur la sortie
                if (piece.type !== 'd') {
                    return false;
                }
            }
            
            // Les cases vides '.' et les positions de pièces (v, h, d, a) sont accessibles
            // Les pièces elles-mêmes seront vérifiées ci-dessous pour les collisions
            
            // Vérifier les collisions avec d'autres pièces
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
    
    // Activer explicitement le bouton undo
    undoButton.disabled = false;
    playbackButton.disabled = false;
    
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
    
    // Calculer le déplacement brut en pixels
    const rawDx = event.clientX - state.dragStartX;
    const rawDy = event.clientY - state.dragStartY;
    const absDx = Math.abs(rawDx);
    const absDy = Math.abs(rawDy);
    
    // Calculer le déplacement en nombre de cellules
    const cellDx = Math.round(rawDx / cellSize);
    const cellDy = Math.round(rawDy / cellSize);
    
    // Vérifier si on est proche d'une position de cellule complète (alignée sur la grille)
    const remainderDx = Math.abs(rawDx - cellDx * cellSize);
    const remainderDy = Math.abs(rawDy - cellDy * cellSize);
    const isNearGridPosition = remainderDx < 10 && remainderDy < 10;
    
    // Réinitialiser la direction si on est revenu à une position de grille complète
    if (isNearGridPosition && state.dragDirection) {
        state.dragDirection = null;
    }
    
    // Déterminer la direction du mouvement dès le premier pixel
    let constrainedDx = 0;
    let constrainedDy = 0;
    
    // Si on n'a pas encore déterminé la direction, la détecter maintenant
    if (!state.dragDirection) {
        // Seuil minimal pour détecter la direction (2 pixels)
        if (absDx > 2 || absDy > 2) {
            if (absDx > absDy) {
                // Mouvement horizontal détecté
                if (state.allowedMoves.horizontal) {
                    state.dragDirection = 'horizontal';
                }
            } else {
                // Mouvement vertical détecté
                if (state.allowedMoves.vertical) {
                    state.dragDirection = 'vertical';
                }
            }
        }
    }
    
    // Appliquer la contrainte selon la direction détectée
    if (state.dragDirection === 'horizontal') {
        constrainedDx = rawDx;
        constrainedDy = 0;
        
        // Limiter le mouvement aux directions légales
        if (constrainedDx < 0 && !state.allowedMoves.left) {
            constrainedDx = 0;
        } else if (constrainedDx > 0 && !state.allowedMoves.right) {
            constrainedDx = 0;
        }
    } else if (state.dragDirection === 'vertical') {
        constrainedDx = 0;
        constrainedDy = rawDy;
        
        // Limiter le mouvement aux directions légales
        if (constrainedDy < 0 && !state.allowedMoves.up) {
            constrainedDy = 0;
        } else if (constrainedDy > 0 && !state.allowedMoves.down) {
            constrainedDy = 0;
        }
    }
    
    // Recalculer le déplacement en cellules avec les contraintes appliquées
    const dx = Math.round(constrainedDx / cellSize);
    const dy = Math.round(constrainedDy / cellSize);
    
    // Calculer la nouvelle position en cellules
    const newCol = state.originalX + dx;
    const newRow = state.originalY + dy;
    
    // Ne rien faire si la position n'a pas changé
    if (newRow === piece.row && newCol === piece.col) {
        // Appliquer le déplacement visuel même sans changement de cellule
        applyVisualDrag(piece, constrainedDx, constrainedDy, metrics);
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
        
        // Recalculer les mouvements autorisés depuis la nouvelle position
        state.allowedMoves = detectAllowedMoves(piece);
    } else {
        // Mouvement bloqué : appliquer le déplacement visuel jusqu'à la limite
        applyVisualDrag(piece, constrainedDx, constrainedDy, metrics);
    }
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

function detectAllowedMoves(piece) {
    // Vérifier chaque mouvement légal possible
    const canMoveLeft = canOccupy(piece, piece.row, piece.col - 1);
    const canMoveRight = canOccupy(piece, piece.row, piece.col + 1);
    const canMoveUp = canOccupy(piece, piece.row - 1, piece.col);
    const canMoveDown = canOccupy(piece, piece.row + 1, piece.col);
    
    return {
        left: canMoveLeft,
        right: canMoveRight,
        up: canMoveUp,
        down: canMoveDown,
        horizontal: canMoveLeft || canMoveRight,
        vertical: canMoveUp || canMoveDown
    };
}

function applyVisualDrag(piece, dx, dy, metrics) {
    // Calculer la position de base de la pièce
    const { cellWidth, cellHeight, gap, paddingX, paddingY } = metrics;
    const baseX = paddingX + piece.col * (cellWidth + gap);
    const baseY = paddingY + piece.row * (cellHeight + gap);
    const width = piece.width * cellWidth + (piece.width - 1) * gap;
    const height = piece.height * cellHeight + (piece.height - 1) * gap;
    
    // Appliquer le déplacement visuel
    piece.element.style.transform = `translate(${baseX + dx}px, ${baseY + dy}px)`;
    piece.element.style.width = `${width}px`;
    piece.element.style.height = `${height}px`;
}

function handlePointerDown(event) {
    if (state.victory || !event.target.closest('.piece')) {
        return;
    }
    
    const pieceElement = event.target.closest('.piece');
    const pieceId = pieceElement.dataset.id;
    const piece = state.pieces.get(pieceId);
    
    if (!piece) {
        return;
    }
    
    event.preventDefault();
    
    // Capturer le pointeur pour les événements de déplacement
    pieceElement.setPointerCapture(event.pointerId);
    
    // Détecter les mouvements légaux possibles
    const allowedMoves = detectAllowedMoves(piece);
    
    // Sauvegarder la position de départ du glissement
    state.isDragging = true;
    state.draggedPiece = piece;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.originalX = piece.col;
    state.originalY = piece.row;
    state.startCol = piece.col;  // Position de départ réelle (ne change jamais)
    state.startRow = piece.row;  // Position de départ réelle (ne change jamais)
    state.allowedMoves = allowedMoves;
    state.dragDirection = null;  // Direction sera détectée au premier mouvement
    
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
    
    // Retirer la classe de style de glissement
    if (pieceElement) {
        pieceElement.classList.remove('dragging');
        
        // Forcer une mise à jour de la position pour s'assurer qu'elle est alignée sur la grille
        updatePiecePosition(piece);
    }
    
    // Réinitialiser l'état de glisser-déposer AVANT de mettre à jour l'UI
    state.isDragging = false;
    const draggedPiece = state.draggedPiece;
    state.draggedPiece = null;
    state.dragDirection = null;
    state.allowedMoves = null;
    
    // Libérer la capture du pointeur
    if (event.target.releasePointerCapture) {
        event.target.releasePointerCapture(event.pointerId);
    }
    
    // Vérifier si la position a changé
    if (piece.row !== state.startRow || piece.col !== state.startCol) {
        // Enregistrer le mouvement
        recordMove(piece, state.startRow, state.startCol);
        
        // Vérifier la victoire
        checkVictory();
        
        // Mettre à jour l'interface
        updateUI();
    }
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadLevel(levelId = 'classic') {
    // Arrêter tout ce qui est en cours
    stopTimer();
    
    // Charger le fichier JSON si ce n'est pas déjà fait
    if (!currentLevel) {
        try {
            const response = await fetch('levels.json');
            const data = await response.json();
            const levelData = data.levels.find(l => l.id === levelId);
            
            if (!levelData) {
                throw new Error(`Level ${levelId} not found`);
            }
            
            // Parser le niveau
            currentLevel = parseLevel(levelData);
            console.log('Level loaded successfully:', currentLevel);
            console.log('Board size:', currentLevel.rows, 'x', currentLevel.cols);
            console.log('Pieces detected:', currentLevel.pieces.length);
            console.log('Exit position:', currentLevel.exit);
        } catch (error) {
            console.error('Failed to load level:', error);
            return;
        }
    }
    
    // Réinitialiser complètement l'état
    resetState();
    
    // Mettre à jour le niveau
    state.level = currentLevel;
    
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
    
    // Récupérer le dernier mouvement
    const lastMove = state.history.pop();
    if (!lastMove) return;
    
    // Récupérer la pièce concernée
    const piece = state.pieces.get(lastMove.pieceId);
    if (!piece) return;
    
    // Restaurer la position précédente
    piece.row = lastMove.fromRow;
    piece.col = lastMove.fromCol;
    
    // Mettre à jour la position visuelle
    updatePiecePosition(piece);
    
    // Désactiver le bouton undo s'il n'y a plus de mouvements
    if (state.history.length === 0) {
        undoButton.disabled = true;
        playbackButton.disabled = true;
    }
    
    // Mettre à jour l'interface
    updateUI();
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
    const savedHistory = [...state.history];
    const savedVictory = state.victory;
    
    try {
        // Désactiver les boutons pendant la relecture
        disableAllButtons(true);
        
        // Cacher l'overlay de victoire s'il est affiché
        victoryOverlay.hidden = true;
        state.victory = false;
        
        // Réinitialiser le plateau (sans recharger le JSON)
        const tempLevel = currentLevel;
        currentLevel = null;
        resetState();
        currentLevel = tempLevel;
        state.level = currentLevel;
        createBoard();
        placePieces();
        
        // Rejouer chaque mouvement avec un délai
        for (const move of savedHistory) {
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
        if (savedVictory) {
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
async function initGame() {
    // Ajouter les écouteurs d'événements (une seule fois)
    setupEventListeners();
    
    // Masquer l'overlay de victoire avant toute initialisation
    victoryOverlay.hidden = true;
    
    // Réinitialiser complètement l'état
    resetState();
    
    // Charger le premier niveau depuis le JSON
    await loadLevel('classic');
}

// Démarrer le jeu au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
