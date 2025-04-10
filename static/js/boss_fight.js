class ShadowBoss {
    constructor() {
        this.hiddenCells = new Set();
        this.lockedCells = new Set();
        this.abilities = {
            lock: 2,
            truth: 2
        };
        this.gameStarted = false;
        this.powerInterval = null;
        this.filledCellsCount = 0;
        this.moveHistory = [];
        this.redoStack = [];
        this.solution = null;
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.lastPauseTime = null;
        this.fetchSolution();
        this.setupGame();
    }

    async fetchSolution() {
        try {
            const response = await fetch('/generate_boss_puzzle');
            const data = await response.json();
            this.solution = data.solution;
            // Initialize the board with the puzzle
            const cells = document.querySelectorAll('.cell');
            cells.forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const value = data.puzzle[row][col];
                if (value !== 0) {
                    cell.value = value;
                    cell.classList.add('fixed');
                }
            });
        } catch (error) {
            console.error('Error fetching puzzle:', error);
        }
    }

    setupGame() {
        this.setupEventListeners();
        this.startTimer();
        this.startBossPower();
        this.gameStarted = true;
        this.updateFilledCellsCount();
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            // Store original value for fixed cells
            if (cell.classList.contains('fixed')) {
                cell.dataset.originalValue = cell.value;
            }

            // Handle select change
            cell.addEventListener('change', (e) => {
                const value = e.target.value;
                this.handleNumberInput(cell, value);
            });

            // Make cell clickable
            cell.addEventListener('click', () => {
                if (!cell.classList.contains('fixed')) {
                    cell.focus();
                }
            });
            
            // Add cell ID if not present
            if (!cell.dataset.cellId) {
                const row = cell.dataset.row;
                const col = cell.dataset.col;
                cell.dataset.cellId = `cell-${row}-${col}`;
            }
        });

        // Add pause button listener
        document.getElementById('pauseTimer').addEventListener('click', () => this.togglePause());

        // Add music control
        const musicToggle = document.getElementById('musicToggle');
        const bgMusic = document.getElementById('bgMusic');
        const musicIcon = document.getElementById('musicIcon');

        musicToggle.addEventListener('click', () => {
            if (bgMusic.paused) {
                bgMusic.play();
                musicIcon.className = 'fas fa-volume-up';
            } else {
                bgMusic.pause();
                musicIcon.className = 'fas fa-volume-mute';
            }
        });
    }

    startTimer() {
        let seconds = 0;
        setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            document.getElementById('minutes').textContent = minutes;
            document.getElementById('seconds').textContent = 
                remainingSeconds.toString().padStart(2, '0');
        }, 1000);
    }

    startBossPower() {
        this.powerInterval = setInterval(() => {
            this.useShadowPower();
        }, 20000);
    }

    updateFilledCellsCount() {
        this.filledCellsCount = Array.from(document.querySelectorAll('.cell'))
            .filter(cell => cell.value && !cell.classList.contains('fixed')).length;
    }

    useShadowPower() {
        // Show the visual effect
        this.showPowerEffect();

        // Calculate number of cells to hide based on filled cells
        const maxHiddenCells = Math.min(5, Math.floor(this.filledCellsCount / 10) + 1);
        
        // Clear previously hidden cells
        this.hiddenCells.forEach(cellId => {
            const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
            if (cell) cell.classList.remove('hidden');
        });
        this.hiddenCells.clear();

        // Get all filled cells that aren't locked
        const filledCells = Array.from(document.querySelectorAll('.cell'))
            .filter(cell => 
                cell.value && 
                !cell.classList.contains('fixed') && 
                !this.lockedCells.has(cell.dataset.cellId)
            );

        // Randomly select cells to hide
        for (let i = 0; i < maxHiddenCells && filledCells.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * filledCells.length);
            const cell = filledCells.splice(randomIndex, 1)[0];
            cell.classList.add('hidden');
            this.hiddenCells.add(cell.dataset.cellId);
        }
    }

    showPowerEffect() {
        // Add visual effects
        const overlay = document.querySelector('.boss-power-overlay');
        const grid = document.querySelector('.sudoku-grid');
        
        // Activate overlay
        overlay.classList.add('active');
        
        // Add effect to grid
        grid.classList.add('power-active');
        
        // Remove effects after animation
        setTimeout(() => {
            overlay.classList.remove('active');
            grid.classList.remove('power-active');
        }, 2000);

        // Make the boss avatar pulse
        const avatar = document.querySelector('.boss-avatar');
        avatar.style.transform = 'scale(1.1)';
        avatar.style.boxShadow = '0 0 20px #ffa500';
        
        setTimeout(() => {
            avatar.style.transform = '';
            avatar.style.boxShadow = '';
        }, 2000);
    }

    handleNumberInput(cell, value) {
        // Don't modify fixed or hidden cells
        if (cell.classList.contains('fixed') || cell.classList.contains('hidden')) {
            cell.value = cell.dataset.originalValue || '';
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const oldValue = cell.value;

        // Only proceed if the value is actually changing
        if (oldValue === value) {
            return;
        }

        // Add to move history
        this.moveHistory.push({
            row: row,
            col: col,
            oldValue: oldValue,
            newValue: value
        });
        this.redoStack = []; // Clear redo stack when new move is made

        // Update filled cells count
        if (value && !oldValue) {
            this.filledCellsCount++;
        } else if (!value && oldValue) {
            this.filledCellsCount--;
        }

        // Validate the move if a number was entered
        if (value) {
            const isValid = this.isValidMove(row, col, value);
            cell.classList.toggle('error', !isValid);
            
            if (!isValid) {
                cell.classList.add('shake');
                setTimeout(() => cell.classList.remove('shake'), 500);
            }
        } else {
            cell.classList.remove('error', 'shake');
        }

        // Check if puzzle is complete
        if (this.filledCellsCount === 81) {
            this.checkSolution();
        }
    }

    isValidMove(row, col, value) {
        return this.isValidInRow(row, value) && 
               this.isValidInColumn(col, value) && 
               this.isValidInBox(row, col, value);
    }

    isValidInRow(row, value) {
        const cells = document.querySelectorAll(`[data-row="${row}"]`);
        return !Array.from(cells).some(cell => 
            cell.value === value && !cell.classList.contains('hidden')
        );
    }

    isValidInColumn(col, value) {
        const cells = document.querySelectorAll(`[data-col="${col}"]`);
        return !Array.from(cells).some(cell => 
            cell.value === value && !cell.classList.contains('hidden')
        );
    }

    isValidInBox(row, col, value) {
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = document.querySelector(
                    `[data-row="${boxRow + i}"][data-col="${boxCol + j}"]`
                );
                if (cell && cell.value === value && !cell.classList.contains('hidden')) {
                    return false;
                }
            }
        }
        return true;
    }

    checkWin() {
        const cells = document.querySelectorAll('.cell');
        return Array.from(cells).every(cell => cell.value && this.isValidMove(cell.dataset.row, cell.dataset.col, cell.value));
    }

    handleWin() {
        clearInterval(this.powerInterval);
        alert('Congratulations! You have defeated The Shadow!');
        // Add any additional win handling logic here
    }

    togglePause() {
        const pauseButton = document.getElementById('pauseTimer');
        const pauseIcon = document.getElementById('pauseIcon');
        const grid = document.querySelector('.sudoku-grid');
        
        if (!this.isPaused) {
            // Pause the game
            this.isPaused = true;
            this.lastPauseTime = Date.now();
            pauseButton.innerHTML = '<i class="fas fa-play"></i>';
            grid.style.filter = 'blur(10px)';
            grid.style.pointerEvents = 'none';
        } else {
            // Resume the game
            this.isPaused = false;
            this.totalPausedTime += Date.now() - this.lastPauseTime;
            pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            grid.style.filter = 'none';
            grid.style.pointerEvents = 'auto';
        }
    }

    undo() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        const cell = document.querySelector(`[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
        cell.value = lastMove.oldValue;
        this.redoStack.push(lastMove);
        this.updateFilledCellsCount();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const nextMove = this.redoStack.pop();
        const cell = document.querySelector(`[data-row="${nextMove.row}"][data-col="${nextMove.col}"]`);
        cell.value = nextMove.newValue;
        this.moveHistory.push(nextMove);
        this.updateFilledCellsCount();
    }

    checkSolution() {
        const cells = document.querySelectorAll('.cell');
        let isComplete = true;
        let isCorrect = true;

        cells.forEach(cell => {
            if (!cell.value) {
                isComplete = false;
            } else if (this.solution && cell.value !== this.solution[cell.dataset.row][cell.dataset.col].toString()) {
                isCorrect = false;
                cell.classList.add('error');
                setTimeout(() => cell.classList.remove('error'), 1000);
            }
        });

        if (!isComplete) {
            alert('The puzzle is not complete yet!');
        } else if (isCorrect) {
            alert('Congratulations! Your solution is correct!');
        } else {
            alert('There are some errors in your solution.');
        }
    }

    getHint() {
        if (!this.solution) return;

        const emptyCells = Array.from(document.querySelectorAll('.cell:not(.fixed)'))
            .filter(cell => !cell.value);

        if (emptyCells.length === 0) return;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const row = parseInt(randomCell.dataset.row);
        const col = parseInt(randomCell.dataset.col);
        const correctValue = this.solution[row][col].toString();

        randomCell.value = correctValue;
        randomCell.dataset.lastValue = correctValue;
        this.moveHistory.push({
            row: row,
            col: col,
            oldValue: '',
            newValue: correctValue
        });
        this.updateFilledCellsCount();
    }

    revealSolution() {
        if (!this.solution) return;
        
        if (!confirm('Are you sure you want to reveal the solution? This will end the game.')) {
            return;
        }

        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            cell.value = this.solution[row][col];
            cell.classList.add('fixed');
        });

        // End the game
        clearInterval(this.powerInterval);
        alert('Game Over - Solution Revealed');
    }
}

// Ability handling functions
function useAbility(type) {
    const game = window.game;
    if (!game || game.abilities[type] <= 0) return;

    game.abilities[type]--;
    document.querySelector(`#${type}-cell .ability-count`).textContent = 
        game.abilities[type];

    if (type === 'lock') {
        const selectedCell = document.querySelector('.cell:focus');
        if (selectedCell && !selectedCell.classList.contains('fixed')) {
            selectedCell.classList.add('locked');
            game.lockedCells.add(selectedCell.dataset.cellId);
        }
    } else if (type === 'truth') {
        game.hiddenCells.forEach(cellId => {
            const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
            if (cell) {
                cell.classList.remove('hidden');
                // Re-hide after 3 seconds
                setTimeout(() => {
                    if (game.hiddenCells.has(cellId)) {
                        cell.classList.add('hidden');
                    }
                }, 3000);
            }
        });
    }
}

// Add these new global functions
function checkSolution() {
    window.game.checkSolution();
}

function getHint() {
    window.game.getHint();
}

function undo() {
    window.game.undo();
}

function redo() {
    window.game.redo();
}

// Add the reveal solution function
function revealSolution() {
    window.game.revealSolution();
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new ShadowBoss();
}); 