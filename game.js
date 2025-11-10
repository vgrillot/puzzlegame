const LEVELS = [
    {
        id: "classic",
        name: "Classic Escape",
        rows: 6,
        cols: 6,
        exit: { row: 5, columns: [2, 3] },
        pieces: [
            { id: "d1", type: "d", row: 1, col: 2, width: 2, height: 2 },
            { id: "b1", type: "b", row: 3, col: 2, width: 2, height: 1 },
            { id: "c1", type: "c", row: 1, col: 1, width: 1, height: 2 },
            { id: "c2", type: "c", row: 1, col: 4, width: 1, height: 2 },
            { id: "c3", type: "c", row: 3, col: 1, width: 1, height: 2 },
            { id: "c4", type: "c", row: 3, col: 4, width: 1, height: 2 },
            { id: "a1", type: "a", row: 4, col: 2, width: 1, height: 1 },
            { id: "a2", type: "a", row: 4, col: 3, width: 1, height: 1 },
            { id: "a3", type: "a", row: 4, col: 1, width: 1, height: 1 },
            { id: "a4", type: "a", row: 4, col: 4, width: 1, height: 1 },
        ],
    },
];

const boardElement = document.getElementById("board");
const moveCounterElement = document.getElementById("moveCounter");
const elapsedTimeElement = document.getElementById("elapsedTime");
const historyListElement = document.getElementById("historyList");
const undoButton = document.getElementById("undoButton");
const resetButton = document.getElementById("resetButton");
const playbackButton = document.getElementById("playbackButton");
const replayButton = document.getElementById("replayButton");
const restartButton = document.getElementById("restartButton");
const victoryOverlay = document.getElementById("victoryOverlay");
const victorySummary = document.getElementById("victorySummary");

const state = {
    level: LEVELS[0],
    pieces: new Map(),
    history: [],
    undone: [],
    dragContext: null,
    startTime: 0,
    timerHandle: null,
    victory: false,
    replaying: false,
};

function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function startTimer() {
    stopTimer();
    state.startTime = performance.now();
    state.timerHandle = setInterval(updateElapsed, 250);
    updateElapsed();
}

function stopTimer() {
    if (state.timerHandle) {
        clearInterval(state.timerHandle);
        state.timerHandle = null;
    }
}

function updateElapsed() {
    if (!state.startTime) {
        elapsedTimeElement.textContent = "00:00";
        return;
    }
    elapsedTimeElement.textContent = formatTime(performance.now() - state.startTime);
}

function resetState() {
    state.pieces.clear();
    state.history = [];
    state.undone = [];
    state.victory = false;
    state.replaying = false;
    state.dragContext = null;
    moveCounterElement.textContent = "0";
    historyListElement.innerHTML = "";
    victoryOverlay.hidden = true;
    undoButton.disabled = true;
    playbackButton.disabled = true;
}

function createBoard(level) {
    boardElement.innerHTML = "";
    boardElement.style.setProperty("--rows", String(level.rows));
    boardElement.style.setProperty("--cols", String(level.cols));

    const fragment = document.createDocumentFragment();
    for (let row = 0; row < level.rows; row += 1) {
        for (let col = 0; col < level.cols; col += 1) {
            const cell = document.createElement("div");
            cell.className = "cell";

            const isBorder = row === 0 || col === 0 || row === level.rows - 1 || col === level.cols - 1;
            const isExit =
                row === level.exit.row &&
                col >= level.exit.columns[0] &&
                col <= level.exit.columns[1];

            if (isBorder && !isExit) {
                cell.classList.add("wall");
            }
            if (isExit) {
                cell.classList.add("exit");
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

function placePieces(level) {
    const metrics = getMetrics();
    level.pieces.forEach((definition) => {
        const piece = { ...definition, element: createPieceElement(definition) };
        state.pieces.set(piece.id, piece);
        updatePiecePosition(piece, metrics);
    });
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

function recordMove(piece, fromRow, fromCol) {
    state.history.push({ pieceId: piece.id, fromRow, fromCol, toRow: piece.row, toCol: piece.col });
    state.undone = [];
    moveCounterElement.textContent = String(state.history.length);

    const item = document.createElement("li");
    item.textContent = `${piece.id.toUpperCase()}: (${fromRow}, ${fromCol}) → (${piece.row}, ${piece.col})`;
    historyListElement.appendChild(item);
    historyListElement.scrollTop = historyListElement.scrollHeight;

    undoButton.disabled = state.history.length === 0;
    playbackButton.disabled = state.history.length === 0;
}

function movePiece(piece, row, col) {
    const fromRow = piece.row;
    const fromCol = piece.col;
    piece.row = row;
    piece.col = col;
    updatePiecePosition(piece);
    recordMove(piece, fromRow, fromCol);
    checkVictory();
}

function undoLastMove() {
    if (state.victory || state.replaying) {
        return;
    }
    const move = state.history.pop();
    if (!move) {
        return;
    }
    const piece = state.pieces.get(move.pieceId);
    if (!piece) {
        return;
    }
    piece.row = move.fromRow;
    piece.col = move.fromCol;
    updatePiecePosition(piece);
    state.undone.push(move);
    moveCounterElement.textContent = String(state.history.length);
    if (historyListElement.lastElementChild) {
        historyListElement.removeChild(historyListElement.lastElementChild);
    }
    undoButton.disabled = state.history.length === 0;
    playbackButton.disabled = state.history.length === 0;
}

function checkVictory() {
    const goal = [...state.pieces.values()].find((p) => p.type === "d");
    if (!goal) {
        return;
    }
    const exitRow = state.level.exit.row;
    const exitColumns = state.level.exit.columns;
    const insideExit =
        goal.row + goal.height - 1 === exitRow &&
        goal.col >= exitColumns[0] &&
        goal.col + goal.width - 1 <= exitColumns[1];
    const pastExit = goal.row + goal.height > exitRow;

    if (insideExit && pastExit) {
        state.victory = true;
        stopTimer();
        victorySummary.textContent = `Solved in ${state.history.length} moves, time ${elapsedTimeElement.textContent}.`;
        victoryOverlay.hidden = false;
    }
}

function onPointerDown(event) {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains("piece")) {
        return;
    }
    if (state.victory || state.replaying) {
        return;
    }

    const piece = state.pieces.get(event.target.dataset.id || "");
    if (!piece) {
        return;
    }

    event.target.setPointerCapture(event.pointerId);
    state.dragContext = {
        pointerId: event.pointerId,
        piece,
        originX: event.clientX,
        originY: event.clientY,
        baseRow: piece.row,
        baseCol: piece.col,
        metrics: getMetrics(),
    };
}

function onPointerMove(event) {
    if (!state.dragContext || event.pointerId !== state.dragContext.pointerId) {
        return;
    }
    const { piece, originX, originY, metrics, baseRow, baseCol } = state.dragContext;
    const deltaX = event.clientX - originX;
    const deltaY = event.clientY - originY;

    const threshold = Math.min(metrics.cellWidth, metrics.cellHeight) * 0.4;
    const colShift = Math.round(deltaX / threshold);
    const rowShift = Math.round(deltaY / threshold);

    let targetRow = baseRow + rowShift;
    let targetCol = baseCol + colShift;

    if (piece.width > piece.height) {
        targetRow = baseRow;
    } else if (piece.height > piece.width) {
        targetCol = baseCol;
    }

    const directionRow = Math.sign(targetRow - piece.row);
    const directionCol = Math.sign(targetCol - piece.col);

    let currentRow = piece.row;
    let currentCol = piece.col;
    let moved = false;

    while (currentRow !== targetRow || currentCol !== targetCol) {
        const nextRow = currentRow + directionRow;
        const nextCol = currentCol + directionCol;
        if (!canOccupy(piece, nextRow, nextCol)) {
            break;
        }
        currentRow = nextRow;
        currentCol = nextCol;
        moved = true;
    }

    if (moved) {
        piece.row = currentRow;
        piece.col = currentCol;
        updatePiecePosition(piece, metrics);
    }
}

function onPointerUp(event) {
    if (!state.dragContext || event.pointerId !== state.dragContext.pointerId) {
        return;
    }

    event.target.releasePointerCapture(event.pointerId);
    const { piece, baseRow, baseCol } = state.dragContext;
    state.dragContext = null;

    if (piece.row !== baseRow || piece.col !== baseCol) {
        movePiece(piece, piece.row, piece.col);
    } else {
        refreshPieces();
    }
}

function setupPointerHandlers() {
    boardElement.addEventListener("pointerdown", onPointerDown);
    boardElement.addEventListener("pointermove", onPointerMove);
    boardElement.addEventListener("pointerup", onPointerUp);
    boardElement.addEventListener("pointercancel", onPointerUp);
}

async function playBackMoves() {
    if (state.history.length === 0 || state.replaying) {
        return;
    }

    state.replaying = true;
    disableAllButtons(true);

    const snapshot = state.history.slice();

    state.pieces.forEach((piece, id) => {
        const start = snapshot.find((move) => move.pieceId === id);
        if (start) {
            piece.row = start.fromRow;
            piece.col = start.fromCol;
            updatePiecePosition(piece);
        }
    });

    await wait(250);

    for (const move of snapshot) {
        const piece = state.pieces.get(move.pieceId);
        if (!piece) {
            continue;
        }
        piece.row = move.toRow;
        piece.col = move.toCol;
        updatePiecePosition(piece);
        await wait(250);
    }

    disableAllButtons(false);
    state.replaying = false;
}

function disableAllButtons(disabled) {
    [undoButton, resetButton, playbackButton, replayButton, restartButton].forEach((button) => {
        if (button) {
            button.disabled = disabled;
        }
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLevel(level) {
    stopTimer();
    resetState();
    state.level = level;
    createBoard(level);
    placePieces(level);
    startTimer();
    resetButton.disabled = false;
    replayButton.disabled = state.history.length === 0;
}

function setupControls() {
    undoButton.addEventListener("click", undoLastMove);
    resetButton.addEventListener("click", () => loadLevel(state.level));
    restartButton.addEventListener("click", () => {
        victoryOverlay.hidden = true;
        loadLevel(state.level);
    });
    playbackButton.addEventListener("click", playBackMoves);
    replayButton.addEventListener("click", () => {
        victoryOverlay.hidden = true;
        playBackMoves();
    });
    window.addEventListener("resize", refreshPieces);
}

function init() {
    loadLevel(state.level);
    setupPointerHandlers();
    setupControls();
}

init();
