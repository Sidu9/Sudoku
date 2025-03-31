let currentPuzzle = null;
let solution = null;

function createBoard() {
    const board = document.getElementById('sudoku-board');
    board.innerHTML = '';
    
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = '9';
        
        // Add event listeners for input validation
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 1) {
                e.target.value = value.slice(0, 1);
            }
            if (value < 1 || value > 9) {
                e.target.value = '';
            }
        });
        
        cell.appendChild(input);
        board.appendChild(cell);
    }
}

function fillBoard(puzzle) {
    const cells = document.querySelectorAll('.cell input');
    cells.forEach((input, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const value = puzzle[row][col];
        
        if (value !== 0) {
            input.value = value;
            input.readOnly = true;
            input.parentElement.classList.add('prefilled');
        } else {
            input.value = '';
            input.readOnly = false;
            input.parentElement.classList.remove('prefilled');
        }
    });
}

function getCurrentBoard() {
    const board = [];
    const cells = document.querySelectorAll('.cell input');
    
    for (let i = 0; i < 9; i++) {
        const row = [];
        for (let j = 0; j < 9; j++) {
            const value = cells[i * 9 + j].value;
            row.push(value === '' ? 0 : parseInt(value));
        }
        board.push(row);
    }
    
    return board;
}

function checkSolution() {
    const currentBoard = getCurrentBoard();
    const message = document.getElementById('message');
    
    // Check if the board is complete
    const isComplete = currentBoard.every(row => 
        row.every(cell => cell !== 0)
    );
    
    if (!isComplete) {
        message.textContent = 'Please complete the puzzle before checking!';
        message.className = 'message error';
        return;
    }
    
    // Compare with solution
    let isCorrect = true;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] !== solution[i][j]) {
                isCorrect = false;
                break;
            }
        }
    }
    
    if (isCorrect) {
        message.textContent = 'Congratulations! You solved the puzzle correctly!';
        message.className = 'message success';
    } else {
        message.textContent = 'Sorry, the solution is not correct. Keep trying!';
        message.className = 'message error';
    }
}

async function newGame(difficulty) {
    try {
        const response = await fetch(`/generate/${difficulty}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        currentPuzzle = data.puzzle;
        solution = data.solution;
        
        createBoard();
        fillBoard(currentPuzzle);
        
        // Clear any previous messages
        const message = document.getElementById('message');
        message.textContent = '';
        message.className = 'message';
    } catch (error) {
        console.error('Error starting new game:', error);
        const message = document.getElementById('message');
        message.textContent = 'Error starting new game. Please try again.';
        message.className = 'message error';
    }
}

// Initialize the game with an easy puzzle when the page loads
window.onload = () => {
    newGame('easy');
}; 