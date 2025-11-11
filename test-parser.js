// Test script to verify JSON parsing
const fs = require('fs');

// Read the levels.json file
const data = JSON.parse(fs.readFileSync('levels.json', 'utf8'));
const levelData = data.levels.find(l => l.id === 'classic');

console.log('=== Testing Level Parser ===\n');
console.log('Raw level data:');
console.log('ID:', levelData.id);
console.log('Name:', levelData.name);
console.log('Grid:');
levelData.grid.forEach((row, i) => console.log(`  Row ${i}: "${row}"`));

// Copy the parseLevel and detectPiece functions
function parseLevel(levelData) {
    const grid = levelData.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    
    const pieces = [];
    let exit = null;
    const visited = new Set();
    const pieceCounters = { v: 0, h: 0, d: 0, a: 0 };
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = grid[row][col];
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            
            if (cell === 'f') {
                if (!exit) {
                    exit = { row, columns: [col, col] };
                } else {
                    exit.row = Math.max(exit.row, row);
                    exit.columns[0] = Math.min(exit.columns[0], col);
                    exit.columns[1] = Math.max(exit.columns[1], col);
                }
                visited.add(key);
                continue;
            }
            
            if (cell === '.' || cell === ' ') {
                visited.add(key);
                continue;
            }
            
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

function detectPiece(grid, startRow, startCol, type, visited) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    let width = 1;
    let height = 1;
    
    if (type === 'v') {
        width = 1;
        height = 2;
        
        if (startRow + 1 < rows && grid[startRow + 1][startCol] === 'v') {
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow + 1},${startCol}`);
        } else {
            return null;
        }
    } else if (type === 'h') {
        width = 2;
        height = 1;
        
        if (startCol + 1 < cols && grid[startRow][startCol + 1] === 'h') {
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow},${startCol + 1}`);
        } else {
            return null;
        }
    } else if (type === 'd') {
        width = 2;
        height = 2;
        
        if (startRow + 1 < rows && startCol + 1 < cols &&
            grid[startRow][startCol + 1] === 'd' &&
            grid[startRow + 1][startCol] === 'd' &&
            grid[startRow + 1][startCol + 1] === 'd') {
            visited.add(`${startRow},${startCol}`);
            visited.add(`${startRow},${startCol + 1}`);
            visited.add(`${startRow + 1},${startCol}`);
            visited.add(`${startRow + 1},${startCol + 1}`);
        } else {
            return null;
        }
    } else if (type === 'a') {
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

// Parse the level
const level = parseLevel(levelData);

console.log('\n=== Parsed Level ===\n');
console.log('Board size:', level.rows, 'x', level.cols);
console.log('Exit position:', level.exit);
console.log('\nPieces detected:', level.pieces.length);
level.pieces.forEach(piece => {
    console.log(`  - ${piece.id} (type: ${piece.type}): position (${piece.row}, ${piece.col}), size ${piece.width}x${piece.height}`);
});

console.log('\n=== Verification ===');
console.log('Expected pieces: 4 vertical (v), 1 horizontal (h), 1 red (d), 2 blue (a)');
console.log('Total expected: 8 pieces');
console.log('Test result:', level.pieces.length === 8 ? '✓ PASS' : '✗ FAIL');
