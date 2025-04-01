# Sudoku Game

A web-based Sudoku game with three difficulty levels: Easy, Medium, and Hard. The game features a clean, modern interface and validates your solution.

## Features

- Three difficulty levels (Easy, Medium, Hard)
- Interactive grid with input validation
- Solution checking
- Responsive design
- Clean and modern UI

## Requirements

- Python 3.7+
- Flask

## Installation

1. Clone this repository:
```bash
git clone https://github.com/Sidu9/Sudoku.git
cd sudoku-game
```

2. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

## Running the Game

1. Start the Flask server:
```bash
python3 app.py
```

2. Open your web browser and navigate to:
```
http://localhost:8000
```

## How to Play

1. Select a difficulty level by clicking one of the difficulty buttons (Easy, Medium, Hard)
2. Click on any empty cell and enter a number from 1-9
3. Fill in all cells according to Sudoku rules:
   - Each row must contain numbers 1-9 without repetition
   - Each column must contain numbers 1-9 without repetition
   - Each 3x3 box must contain numbers 1-9 without repetition
4. Click "Check Solution" when you're done to verify your answer

## Development

The project structure is organized as follows:

```
Sudoku/
├── .git/                      # Git repository data
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── app.py                     # Main Flask application
├── image.png                  # Project image
├── requirements.txt           # Python dependencies
├── sudoku.db                  # SQLite database
├── static/                    # Static files
│   ├── audio/
│   │   └── concentration.mp3  # Background music
│   ├── css/
│   │   └── style.css         # Stylesheet
│   └── js/
│       └── script.js         # JavaScript code
├── templates/                 # HTML templates
│   ├── game.html             # Game page
│   ├── index.html            # Home page
│   ├── leaderboard.html      # Leaderboard page
│   ├── login.html            # Login page
│   └── signup.html           # Sign up page
└── venv/                     # Python virtual environment
``` 
