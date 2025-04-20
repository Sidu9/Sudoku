// Global abilities object that will be synchronized with the ShadowBoss class
const abilities = {
    truth: {
        name: "Truth Vision",
        count: 2
    },
    lock: {
        name: "Lock Cell",
        count: 2
    }
};

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
        this.init();
    }

    async init() {
        console.log("ShadowBoss.init started");
        try {
            await this.fetchSolution();
            console.log("Solution fetched successfully:", this.solution);
            this.setupGame();
        } catch (error) {
            console.error("Error in init:", error);
        }
    }

    async fetchSolution() {
        console.log("Fetching solution...");
        try {
            const response = await fetch('/generate_boss_puzzle');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Received puzzle data:", data);
            
            if (!data.solution || !Array.isArray(data.solution)) {
                throw new Error("Invalid solution data received");
            }
            
            this.solution = data.solution;
            
            // Initialize the board with the puzzle
            // Get all cells
            const cells = document.querySelectorAll('.cell');
            
            // Clear existing data on all cells first
            cells.forEach(cell => {
                cell.textContent = ''; 
                cell.classList.remove('fixed');
            });
            
            // Then set values properly from the puzzle data
            cells.forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                // Make sure we have valid row and column 
                if (!isNaN(row) && !isNaN(col) && row >= 0 && row < 9 && col >= 0 && col < 9) {
                    const value = data.puzzle[row][col];
                    if (value !== 0) {
                        cell.textContent = value;
                        cell.classList.add('fixed');
                        cell.dataset.originalValue = value;
                    }
                }
            });
            
            return this.solution;
        } catch (error) {
            console.error('Error fetching puzzle:', error);
            throw error;
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
        
        // Add direct event listeners for ability buttons
        const truthButton = document.getElementById('truth-ability-btn');
        if (truthButton) {
            console.log("Found truth ability button, adding event listener");
            // Clear any previous event listeners by cloning
            const newTruthButton = truthButton.cloneNode(true);
            truthButton.parentNode.replaceChild(newTruthButton, truthButton);
            
            // Add a new handler that uses a function reference to avoid multiple bindings
            newTruthButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log("Truth button clicked from setupEventListeners");
                revealAllCells(true);
            });
            console.log("Added click listener to truth button that calls revealAllCells");
        } else {
            console.error("Truth ability button not found by ID");
        }
        
        // Add lock button event listener
        const lockButton = document.querySelector('#lock-cell .ability-btn');
        if (lockButton) {
            console.log("Found lock ability button, adding event listener");
            // We're not going to add a direct listener, we'll let the onclick in HTML handle it
            console.log("Lock button will use the onclick attribute from HTML");
        } else {
            console.error("Lock ability button not found");
        }

        // Add music control
        const musicToggle = document.getElementById('musicToggle');
        const bgMusic = document.getElementById('bgMusic');
        const musicIcon = document.getElementById('musicIcon');

        // Ensure audio is paused initially
        bgMusic.pause();
        musicIcon.className = 'fas fa-volume-mute';

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
        
        console.log("Shadow Power: Started");
        
        // Debug hidden cells before clearing
        this.debugHiddenCells();
        
        // Clear previously hidden cells
        console.log("Shadow Power: Before clearing, hidden cells:", this.hiddenCells.size);
        this.hiddenCells.forEach(cellId => {
            // Try both selector formats to ensure we find the cell
            let cell = document.querySelector(`[data-cell-id="${cellId}"]`);
            
            // If not found, try alternative selector with direct cell ID
            if (!cell) {
                console.log("Cell not found with data-cell-id, trying alternative selector");
                cell = document.getElementById(cellId);
            }
            
            // If still not found, try by row/col from the cellId (assuming format "cell-row-col")
            if (!cell && cellId.startsWith('cell-')) {
                const parts = cellId.split('-');
                if (parts.length === 3) {
                    const row = parts[1];
                    const col = parts[2];
                    console.log(`Trying by row=${row} and col=${col}`);
                    cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                }
            }
            
            if (cell) cell.classList.remove('hidden');
        });
        
        // After revealing all previously hidden cells, clear the set
        this.hiddenCells.clear();
        console.log("Shadow Power: After clearing, hidden cells:", this.hiddenCells.size);

        // Debug hidden cells after hiding
        this.debugHiddenCells();

        // Get user-filled cells that are not fixed
        const userFilledCells = Array.from(document.querySelectorAll('.cell'))
            .filter(cell => 
                cell.textContent && 
                !cell.classList.contains('fixed')
            );
            
        console.log("Shadow Power: User filled cells count:", userFilledCells.length);
            
        // If no user-filled cells, don't do anything
        if (userFilledCells.length === 0) {
            console.log("Shadow Power: No user-filled cells, exiting");
            return;
        }

        // Check for locked cells and show resistance effect
        userFilledCells.forEach(cell => {
            if (this.lockedCells.has(cell.dataset.cellId)) {
                // Show a resistance effect when the boss tries to affect a locked cell
                const shield = document.createElement('div');
                shield.className = 'shield-effect';
                shield.style.position = 'absolute';
                shield.style.top = '0';
                shield.style.left = '0';
                shield.style.right = '0';
                shield.style.bottom = '0';
                shield.style.backgroundColor = 'rgba(30, 144, 255, 0.5)';
                shield.style.borderRadius = '50%';
                shield.style.transform = 'scale(0)';
                shield.style.transition = 'transform 0.5s ease-out';
                
                cell.appendChild(shield);
                
                // Animate the shield
                setTimeout(() => {
                    shield.style.transform = 'scale(1.5)';
                    setTimeout(() => {
                        shield.style.opacity = '0';
                        setTimeout(() => {
                            if (cell.contains(shield)) {
                                cell.removeChild(shield);
                            }
                        }, 500);
                    }, 500);
                }, 10);
            }
        });

        // Filter out locked cells for the hiding effect
        const cellsToHideFrom = userFilledCells.filter(cell => !this.lockedCells.has(cell.dataset.cellId));
        
        // If no eligible cells to hide (all are locked), don't continue
        if (cellsToHideFrom.length === 0) {
            console.log("All filled cells are locked! The Shadow's power is blocked.");
            return;
        }

        // Calculate total number of user-fillable cells (non-fixed cells)
        const totalNonFixedCells = document.querySelectorAll('.cell:not(.fixed)').length;
        
        // Calculate progress percentage based on user-filled cells
        const progressPercentage = userFilledCells.length / totalNonFixedCells;
        
        // Calculate number of cells to hide based on progress
        // 1-10 filled cells = 1 cell hidden
        // 11-20 filled cells = 2 cells hidden
        // 21-30 filled cells = 3 cells hidden
        // 31+ filled cells = 4 cells hidden
        const cellsToHide = Math.min(4, Math.max(1, Math.ceil(cellsToHideFrom.length / 10)));
        
        console.log(`User filled cells: ${userFilledCells.length}, Unlocked cells: ${cellsToHideFrom.length}, Hiding ${cellsToHide} cells`);
        
        // Randomly select cells to hide from unlocked user-filled cells only
        const maxCellsToHide = Math.min(cellsToHide, cellsToHideFrom.length);
        const cellsToHideArray = [...cellsToHideFrom];
        
        console.log("Shadow Power: About to hide", maxCellsToHide, "cells");
        
        for (let i = 0; i < maxCellsToHide; i++) {
            const randomIndex = Math.floor(Math.random() * cellsToHideArray.length);
            const cell = cellsToHideArray.splice(randomIndex, 1)[0];
            cell.classList.add('hidden');
            
            // Ensure we're using the correct format for the cell ID
            const cellId = cell.dataset.cellId;
            console.log(`Adding cell to hiddenCells: ${cellId}, cell:`, cell);
            
            // Verify cell has dataset.cellId before adding
            if (cellId) {
                this.hiddenCells.add(cellId);
                console.log("Shadow Power: Hidden cell with ID:", cellId);
            } else {
                console.error("Cell missing cellId attribute:", cell);
            }
        }
        
        console.log("Shadow Power: After hiding, hidden cells count:", this.hiddenCells.size);
        
        // Synchronize the hidden cells set with DOM
        // This ensures our hiddenCells set matches the actual DOM state
        this.synchronizeHiddenCells();
        
        // Debug hidden cells after hiding
        this.debugHiddenCells();
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
        const oldValue = selectedCell.textContent ? selectedCell.textContent.trim() : '';
        
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
            console.log(`Cleared cell at row ${row}, col ${col}`);
        } else {
            selectedCell.textContent = num;
            console.log(`Set cell at row ${row}, col ${col} to ${num}`);
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
                setTimeout(() => cell.classList.remove('error'), 5000);
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
        console.log("ShadowBoss.getHint called, solution:", this.solution);
        
        // Check if solution is available
        if (!this.solution) {
            console.error("Cannot provide hint: Solution not loaded yet");
            alert("Please wait for the puzzle to fully load before requesting a hint.");
            return;
        }

        // Debug the state of all cells
        const allCells = document.querySelectorAll('.cell');
        console.log("Total cells:", allCells.length);
        
        const fixedCells = Array.from(allCells).filter(cell => cell.classList.contains('fixed'));
        console.log("Fixed cells:", fixedCells.length);
        
        const hiddenCells = Array.from(allCells).filter(cell => cell.classList.contains('hidden'));
        console.log("Hidden cells:", hiddenCells.length);
        
        const lockedCellsCount = this.lockedCells.size;
        console.log("Locked cells:", lockedCellsCount);
        
        // Check each cell's textContent to see if it's truly empty
        const cellsWithContent = Array.from(allCells).filter(cell => cell.textContent && cell.textContent.trim() !== '');
        console.log("Cells with content:", cellsWithContent.length);
        
        // Check if there are blank cells that aren't being detected correctly
        const blankCells = Array.from(allCells).filter(cell => !cell.textContent || cell.textContent.trim() === '');
        console.log("Blank cells:", blankCells.length);

        // Get only empty cells that aren't fixed or hidden
        const emptyCells = Array.from(allCells)
            .filter(cell => {
                const isEmpty = !cell.textContent || cell.textContent.trim() === '';
                const isNotFixed = !cell.classList.contains('fixed');
                const isNotHidden = !cell.classList.contains('hidden');
                const isNotLocked = !this.lockedCells.has(cell.dataset.cellId);
                
                // Log the state of any cells that are empty but being filtered out
                if (isEmpty && (!isNotFixed || !isNotHidden || !isNotLocked)) {
                    console.log("Cell filtered out:", {
                        cellId: cell.dataset.cellId,
                        isEmpty,
                        isNotFixed,
                        isNotHidden,
                        isNotLocked
                    });
                }
                
                return isEmpty && isNotFixed && isNotHidden && isNotLocked;
            });

        console.log(`Found ${emptyCells.length} available empty cells for hint`);
        
        if (emptyCells.length === 0) {
            // If no cells are available through the normal filter, use a more lenient approach
            // as a fallback to debug what's happening
            const lenientEmptyCells = Array.from(allCells)
                .filter(cell => !cell.classList.contains('fixed'));
                
            console.log(`Using lenient filter found ${lenientEmptyCells.length} non-fixed cells`);
            
            if (lenientEmptyCells.length > 0) {
                // If we found cells with the lenient filter, there might be a detection issue
                // so let's use them instead
                const randomCell = lenientEmptyCells[Math.floor(Math.random() * lenientEmptyCells.length)];
                const row = parseInt(randomCell.dataset.row);
                const col = parseInt(randomCell.dataset.col);
                const correctValue = this.solution[row][col];
                
                console.log(`Using lenient cell selection. Row ${row}, Col ${col}`);
                console.log(`Cell current value: "${randomCell.textContent}", will set to: "${correctValue}"`);
                
                // Save move to history
                this.moveHistory.push({
                    row: row,
                    col: col,
                    value: correctValue,
                    previousValue: randomCell.textContent || ''
                });
                
                // Clear redo stack
                this.redoStack = [];
                
                // Set the value
                randomCell.textContent = correctValue;
                this.updateFilledCellsCount();
                
                return;
            }
            
            alert("No available cells for a hint!");
            return;
        }

        // Randomly select an empty cell
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const row = parseInt(randomCell.dataset.row);
        const col = parseInt(randomCell.dataset.col);
        
        console.log(`Selected cell at row ${row}, col ${col} for hint`);
        console.log(`Solution value at this position: ${this.solution[row][col]}`);
        
        const correctValue = this.solution[row][col];
        
        if (!correctValue) {
            console.error(`No solution value found for cell at row ${row}, col ${col}`);
            return;
        }

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

    debugHiddenCells() {
        console.log("### DEBUG HIDDEN CELLS ###");
        console.log("Hidden cells size:", this.hiddenCells.size);
        console.log("Hidden cells content:", [...this.hiddenCells]);
        
        // Check if we can find each hidden cell in the DOM
        this.hiddenCells.forEach(cellId => {
            const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
            if (cell) {
                console.log(`Cell ${cellId} found in DOM:`, cell);
                console.log(`Has hidden class: ${cell.classList.contains('hidden')}`);
            } else {
                console.error(`Cell ${cellId} NOT FOUND in DOM`);
                
                // Try to find by row/col if in cell-row-col format
                if (cellId.startsWith('cell-')) {
                    const parts = cellId.split('-');
                    if (parts.length === 3) {
                        const row = parts[1];
                        const col = parts[2];
                        const alternativeCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                        if (alternativeCell) {
                            console.log(`Found by row/col: data-cell-id is "${alternativeCell.dataset.cellId}"`);
                        } else {
                            console.error(`Not found by row/col either`);
                        }
                    }
                }
            }
        });
        
        // Check all cells with hidden class to verify they are in our set
        const hiddenCellsInDOM = document.querySelectorAll('.cell.hidden');
        console.log(`Found ${hiddenCellsInDOM.length} cells with hidden class in DOM`);
        
        hiddenCellsInDOM.forEach(cell => {
            const cellId = cell.dataset.cellId;
            if (cellId) {
                console.log(`DOM hidden cell ${cellId} is ${this.hiddenCells.has(cellId) ? 'IN' : 'NOT IN'} our set`);
            } else {
                console.error(`DOM hidden cell is missing data-cell-id:`, cell);
            }
        });
        
        console.log("### END DEBUG ###");
    }

    synchronizeHiddenCells() {
        console.log("Synchronizing hidden cells set with DOM");
        
        // Get all cells with the hidden class
        const hiddenCellsInDOM = document.querySelectorAll('.cell.hidden');
        
        // Clear the current set
        this.hiddenCells.clear();
        
        // Add all currently hidden cells to the set
        hiddenCellsInDOM.forEach(cell => {
            if (cell.dataset.cellId) {
                this.hiddenCells.add(cell.dataset.cellId);
                console.log("Added to hiddenCells set:", cell.dataset.cellId);
            }
        });
        
        console.log(`Synchronized ${this.hiddenCells.size} hidden cells`);
    }
}

// Ability handling functions
function useAbility(type) {
    console.log(`Using ability: ${type}`);
    
    if (!abilities[type]) {
        console.error(`Invalid ability type: ${type}`);
        return;
    }
    
    if (abilities[type].count <= 0) {
        console.log(`No more ${type} abilities available`);
        showNotification(`No ${abilities[type].name} abilities remaining.`);
        return;
    }
    
    if (type === 'truth') {
        console.log(`Truth ability triggered from useAbility`);
        // Set showFeedback to false as we're handling notifications in the dedicated handler
        revealAllCells(false);
    }
}

// Add these new global functions
function checkSolution() {
    window.game.checkSolution();
}

function getHint() {
    console.log("Global getHint called");
    
    if (!window.game) {
        console.error("Game instance not found");
        alert("Game not properly initialized. Please refresh the page.");
        return;
    }
    
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

// Add a direct function to reveal all hidden cells (for debugging)
function revealAllCells(showFeedback = true) {
    console.log("Reveal all cells function called");
    
    // First check if there are abilities left in the global abilities object
    if (abilities.truth.count <= 0) {
        console.log("No truth abilities left");
        if (showFeedback) {
            showNotification("No truth vision abilities left!", "error");
        }
        return;
    }
    
    // Find all cells with hidden class
    const hiddenCells = document.querySelectorAll('.cell.hidden');
    console.log(`Found ${hiddenCells.length} cells with 'hidden' class`);
    
    if (hiddenCells.length === 0) {
        if (showFeedback) {
            showNotification("No hidden cells to reveal!", "info");
        }
        return;
    }

    // Decrement the ability count in the global abilities object
    abilities.truth.count--;
    console.log("Decremented truth ability count to:", abilities.truth.count);
    
    // Sync with the game object if it exists
    if (window.game) {
        window.game.abilities.truth = abilities.truth.count;
    }
    
    // Update the UI counter
    const truthCountElement = document.querySelector('#truth-vision .ability-count');
    if (truthCountElement) {
        truthCountElement.textContent = abilities.truth.count;
    } else {
        console.error("Could not find truth ability count element");
    }
    
    // Create a global flash effect
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
    flashOverlay.style.zIndex = '999';
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.opacity = '0';
    flashOverlay.style.transition = 'opacity 0.3s ease-in-out';
    document.body.appendChild(flashOverlay);
    
    // Animate the flash
    setTimeout(() => {
        flashOverlay.style.opacity = '1';
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(flashOverlay)) {
                    document.body.removeChild(flashOverlay);
                }
            }, 300);
        }, 500);
    }, 10);
    
    // Reveal all hidden cells
    hiddenCells.forEach(cell => {
        console.log("Revealing cell:", cell);
        cell.classList.remove('hidden');
        cell.classList.add('revealed');
        
        // Re-hide after 3 seconds
        setTimeout(() => {
            cell.classList.remove('revealed');
            cell.classList.add('hidden');
        }, 3000);
    });
    
    // Show countdown timer
    const timerElement = document.createElement('div');
    timerElement.className = 'truth-timer';
    timerElement.innerHTML = '<i class="fas fa-stopwatch"></i> <span id="debug-countdown">3</span>';
    timerElement.style.opacity = '0';
    document.body.appendChild(timerElement);
    
    // Show timer with animation
    setTimeout(() => {
        timerElement.style.opacity = '1';
    }, 10);
    
    // Update timer every second
    let countdown = 3;
    const countdownElement = document.getElementById('debug-countdown');
    
    const timer = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(timer);
            
            // Hide timer
            timerElement.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(timerElement)) {
                    document.body.removeChild(timerElement);
                }
            }, 300);
        }
    }, 1000);
    
    // Show notification only if showFeedback is true and this is removed per user request
    if (showFeedback) {
        // Notification removed per user request
        console.log("Truth vision activated without notification");
    }
}

// Add global setNumber function
function setNumber(num) {
    if (window.game) {
        window.game.setNumber(num);
    }
}

// Add utility function to reset ability counters for testing
function resetAbilities() {
    console.log("Resetting abilities for testing");
    abilities.truth.count = 2;
    abilities.lock.count = 2;
    
    // Sync with game object
    if (window.game) {
        window.game.abilities.truth = 2;
        window.game.abilities.lock = 2;
    }
    
    // Update UI
    const truthCountElement = document.querySelector('#truth-vision .ability-count');
    const lockCountElement = document.querySelector('#lock-cell .ability-count');
    
    if (truthCountElement) {
        truthCountElement.textContent = '2';
    }
    
    if (lockCountElement) {
        lockCountElement.textContent = '2';
    }
    
    showNotification("Abilities reset for testing", "info");
    
    return "Abilities reset successfully";
}

// Initialize the game when the page loads
window.addEventListener('load', async () => {
    console.log("Initializing game...");
    try {
        window.game = new ShadowBoss();
        
        // Synchronize the global abilities with the game abilities
        if (window.game) {
            abilities.truth.count = window.game.abilities.truth;
            abilities.lock.count = window.game.abilities.lock;
        }
        
        // Set up the lock button
        setTimeout(() => {
            const lockButton = document.querySelector('#lock-cell .ability-btn');
            if (lockButton) {
                // Remove any existing onclick attribute
                lockButton.removeAttribute('onclick');
                
                // Add our controlled event handler
                lockButton.addEventListener('click', () => {
                    // First check if a cell is selected
                    const selectedCell = document.querySelector('.cell.selected') || document.querySelector('.cell:focus');
                    if (!selectedCell || selectedCell.classList.contains('fixed')) {
                        showNotification("Please select a cell to lock first", "error");
                        return;
                    }
                    
                    // Check if there are abilities left
                    if (abilities.lock.count <= 0) {
                        showNotification("No lock abilities left!", "error");
                        return;
                    }
                    
                    // Decrement the counter
                    abilities.lock.count--;
                    
                    // Sync with game object if it exists
                    if (window.game) {
                        window.game.abilities.lock = abilities.lock.count;
                    }
                    
                    // Update the UI
                    const countElement = document.querySelector('#lock-cell .ability-count');
                    if (countElement) {
                        countElement.textContent = String(abilities.lock.count);
                    }
                    
                    // Add locked class and visual effect
                    selectedCell.classList.add('locked');
                    window.game.lockedCells.add(selectedCell.dataset.cellId);
                    
                    // Add a temporary lock icon inside the cell for visual effect
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-shield-alt lock-icon';
                    lockIcon.style.position = 'absolute';
                    lockIcon.style.fontSize = '1.5rem';
                    lockIcon.style.opacity = '0.7';
                    lockIcon.style.color = 'white';
                    selectedCell.appendChild(lockIcon);
                    
                    // Animate the icon
                    setTimeout(() => {
                        lockIcon.style.transition = 'opacity 1s';
                        lockIcon.style.opacity = '0';
                        setTimeout(() => {
                            // Remove the icon after animation
                            if (selectedCell.contains(lockIcon)) {
                                selectedCell.removeChild(lockIcon);
                            }
                        }, 1000);
                    }, 1000);
                    
                    // Show notification
                    showNotification(`Cell locked and protected! <i class="fas fa-shield-alt"></i>`);
                });
            }
            
            // Set up the truth button
            const truthButton = document.getElementById('truth-ability-btn');
            if (truthButton) {
                // Remove any existing event listeners by cloning
                const newTruthButton = truthButton.cloneNode(true);
                truthButton.parentNode.replaceChild(newTruthButton, truthButton);
                
                // Add our event handler that calls revealAllCells directly
                newTruthButton.addEventListener('click', () => {
                    revealAllCells(true);
                });
            }
        }, 500); // Delay to ensure HTML is fully loaded
    } catch (error) {
        console.error("Error initializing game:", error);
        alert("There was an error starting the game. Please try refreshing the page.");
    }
});

// Track active notifications
let activeNotifications = [];
let notificationCounter = 0;

// Helper function to show notification
function showNotification(message, type = 'info') {
    // Generate a unique ID for this notification
    const notificationId = `notification-${notificationCounter++}`;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = type === 'info' ? '#1e90ff' : '#ff6b6b';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
    
    // Add to body
    document.body.appendChild(notification);
    
    // Track this notification
    activeNotifications.push(notificationId);
    
    // Position vertically based on number of active notifications
    const notificationIndex = activeNotifications.indexOf(notificationId);
    if (notificationIndex > 0) {
        // Stack notifications with 5px gap
        notification.style.top = `${10 + (notificationIndex * 45)}px`;
    }
    
    // Show and hide with animation
    setTimeout(() => {
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    // Remove from tracking array
                    const index = activeNotifications.indexOf(notificationId);
                    if (index > -1) {
                        activeNotifications.splice(index, 1);
                    }
                }
            }, 300);
        }, 2000);
    }, 10);
}

// Add a function to forcibly hide some cells for testing
// NOTE: This function is no longer used in the UI (test button removed) but kept for developer reference
function forceHideRandomCells() {
    console.log("Force hiding random cells for testing");
    
    // Get all user-filled cells
    const filledCells = Array.from(document.querySelectorAll('.cell'))
        .filter(cell => 
            cell.textContent && 
            !cell.classList.contains('fixed') &&
            !cell.classList.contains('hidden')
        );
    
    console.log(`Found ${filledCells.length} filled cells to potentially hide`);
    
    if (filledCells.length === 0) {
        alert("No filled cells to hide! Fill some cells first.");
        return;
    }
    
    // Hide 2-3 random cells
    const numToHide = Math.min(filledCells.length, Math.floor(Math.random() * 2) + 2);
    console.log(`Hiding ${numToHide} random cells`);
    
    for (let i = 0; i < numToHide; i++) {
        const randomIndex = Math.floor(Math.random() * filledCells.length);
        const cell = filledCells.splice(randomIndex, 1)[0];
        
        console.log(`Hiding cell:`, cell);
        cell.classList.add('hidden');
        
        // Add to game's hiddenCells set if possible
        if (window.game && cell.dataset.cellId) {
            window.game.hiddenCells.add(cell.dataset.cellId);
        }
    }
    
    showNotification(`Forcibly hid ${numToHide} cells for testing`);
} 