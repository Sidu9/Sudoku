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
                    cell.textContent = value;
                    cell.classList.add('fixed');
                    cell.dataset.originalValue = value;
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
                cell.dataset.originalValue = cell.textContent;
            }

            // Make cell clickable and selectable
            cell.addEventListener('click', () => {
                if (!cell.classList.contains('fixed')) {
                    // Remove selected class from all cells
                    document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
                    // Add selected class to this cell
                    cell.classList.add('selected');
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

        // Add keyboard number input support
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.setNumber(parseInt(e.key));
            } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
                this.setNumber(0);
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
            .filter(cell => cell.textContent && !cell.classList.contains('fixed')).length;
    }

    useShadowPower() {
        // Show the visual effect
        this.showPowerEffect();
        
        // Clear previously hidden cells
        this.hiddenCells.forEach(cellId => {
            const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
            if (cell) cell.classList.remove('hidden');
        });
        this.hiddenCells.clear();

        // Get only user-filled cells (cells with content that are not fixed and not locked)
        const userFilledCells = Array.from(document.querySelectorAll('.cell'))
            .filter(cell => 
                cell.textContent && 
                !cell.classList.contains('fixed') && 
                !this.lockedCells.has(cell.dataset.cellId)
            );
            
        // If no user-filled cells, don't do anything
        if (userFilledCells.length === 0) return;

        // Calculate total number of user-fillable cells (non-fixed cells)
        const totalNonFixedCells = document.querySelectorAll('.cell:not(.fixed)').length;
        
        // Calculate progress percentage based on user-filled cells
        const progressPercentage = userFilledCells.length / totalNonFixedCells;
        
        // Calculate number of cells to hide based on progress
        // 1-10 filled cells = 1 cell hidden
        // 11-20 filled cells = 2 cells hidden
        // 21-30 filled cells = 3 cells hidden
        // 31+ filled cells = 4 cells hidden
        const cellsToHide = Math.min(4, Math.max(1, Math.ceil(userFilledCells.length / 10)));
        
        console.log(`User filled cells: ${userFilledCells.length}, Progress: ${(progressPercentage * 100).toFixed(1)}%, Hiding ${cellsToHide} cells`);
        
        // Randomly select cells to hide from user-filled cells only
        const maxCellsToHide = Math.min(cellsToHide, userFilledCells.length);
        const cellsToHideArray = [...userFilledCells];
        
        for (let i = 0; i < maxCellsToHide; i++) {
            const randomIndex = Math.floor(Math.random() * cellsToHideArray.length);
            const cell = cellsToHideArray.splice(randomIndex, 1)[0];
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

    setNumber(num) {
        const selectedCell = document.querySelector('.cell.selected');
        if (!selectedCell || selectedCell.classList.contains('fixed') || 
            selectedCell.classList.contains('hidden')) return;
        
        const row = parseInt(selectedCell.dataset.row);
        const col = parseInt(selectedCell.dataset.col);
        const oldValue = selectedCell.textContent ? parseInt(selectedCell.textContent) : '';
        
        // Add to move history
        this.moveHistory.push({
            row: row,
            col: col,
            value: num === 0 ? '' : num,
            previousValue: oldValue
        });
        
        // Clear redo stack when making a new move
        this.redoStack = [];
        
        // Set the new value
        if (num === 0) {
            selectedCell.textContent = '';
        } else {
            selectedCell.textContent = num;
        }
        
        // Remove error class
        selectedCell.classList.remove('error');
        
        // Check if the move is valid
        if (num !== 0 && !this.isValidMove(row, col, num)) {
            selectedCell.classList.add('error');
        }
        
        this.updateFilledCellsCount();
        this.checkWin();
    }

    handleNumberInput(cell, value) {
        // This method is now unused since we're using div elements instead of selects
        // All handling is done in setNumber
    }

    isValidMove(row, col, value) {
        return this.isValidInRow(row, value) && 
               this.isValidInColumn(col, value) && 
               this.isValidInBox(row, col, value);
    }

    isValidInRow(row, value) {
        const cells = document.querySelectorAll(`[data-row="${row}"]`);
        return !Array.from(cells).some(cell => 
            cell.textContent === value.toString() && !cell.classList.contains('hidden') && cell !== document.querySelector('.cell.selected')
        );
    }

    isValidInColumn(col, value) {
        const cells = document.querySelectorAll(`[data-col="${col}"]`);
        return !Array.from(cells).some(cell => 
            cell.textContent === value.toString() && !cell.classList.contains('hidden') && cell !== document.querySelector('.cell.selected')
        );
    }

    isValidInBox(row, col, value) {
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        const selectedCell = document.querySelector('.cell.selected');
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = document.querySelector(
                    `[data-row="${boxRow + i}"][data-col="${boxCol + j}"]`
                );
                if (cell && 
                    cell.textContent === value.toString() && 
                    !cell.classList.contains('hidden') && 
                    cell !== selectedCell) {
                    return false;
                }
            }
        }
        return true;
    }

    checkWin() {
        const cells = document.querySelectorAll('.cell');
        return Array.from(cells).every(cell => 
            cell.textContent && 
            this.isValidMove(
                parseInt(cell.dataset.row), 
                parseInt(cell.dataset.col), 
                parseInt(cell.textContent)
            )
        );
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
        cell.textContent = lastMove.previousValue || '';
        this.redoStack.push(lastMove);
        this.updateFilledCellsCount();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const nextMove = this.redoStack.pop();
        const cell = document.querySelector(`[data-row="${nextMove.row}"][data-col="${nextMove.col}"]`);
        cell.textContent = nextMove.value || '';
        this.moveHistory.push(nextMove);
        this.updateFilledCellsCount();
    }

    checkSolution() {
        const cells = document.querySelectorAll('.cell');
        let isComplete = true;
        let isCorrect = true;

        cells.forEach(cell => {
            if (!cell.textContent) {
                isComplete = false;
            } else if (this.solution && parseInt(cell.textContent) !== this.solution[parseInt(cell.dataset.row)][parseInt(cell.dataset.col)]) {
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

        // Get only empty cells that aren't fixed or hidden
        const emptyCells = Array.from(document.querySelectorAll('.cell'))
            .filter(cell => 
                !cell.textContent && 
                !cell.classList.contains('fixed') && 
                !cell.classList.contains('hidden') &&
                !this.lockedCells.has(cell.dataset.cellId)
            );

        if (emptyCells.length === 0) return;

        // Randomly select an empty cell
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const row = parseInt(randomCell.dataset.row);
        const col = parseInt(randomCell.dataset.col);
        const correctValue = this.solution[row][col];

        // Save the move to history
        this.moveHistory.push({
            row: row,
            col: col,
            value: correctValue,
            previousValue: ''
        });

        // Clear redo stack when using hint
        this.redoStack = [];

        // Set the value and update the cell
        randomCell.textContent = correctValue;
        this.updateFilledCellsCount();
        
        // Log for debugging
        console.log(`Hint given: Row ${row}, Col ${col}, Value ${correctValue}`);
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
            cell.textContent = this.solution[row][col];
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

// Add global setNumber function
function setNumber(num) {
    window.game.setNumber(num);
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new ShadowBoss();
}); 