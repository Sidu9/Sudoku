from flask import Flask, render_template, jsonify, send_from_directory, request, redirect, url_for, session, flash
from flask_cors import CORS
import random
import copy
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)  # Enable CORS for all routes
app.secret_key = os.urandom(24)  # Generate a random secret key for session management

def create_empty_board():
    return [[0 for _ in range(9)] for _ in range(9)]

def is_valid(board, row, col, num):
    # Check row
    for x in range(9):
        if board[row][x] == num:
            return False
    
    # Check column
    for x in range(9):
        if board[x][col] == num:
            return False
    
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[i + start_row][j + start_col] == num:
                return False
    
    return True

def solve_sudoku(board):
    empty = find_empty(board)
    if not empty:
        return True
    
    row, col = empty
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve_sudoku(board):
                return True
            board[row][col] = 0
    
    return False

def find_empty(board):
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                return (i, j)
    return None

def generate_solved_board():
    board = create_empty_board()
    solve_sudoku(board)
    return board

def generate_puzzle(difficulty):
    # Generate a solved board
    solved_board = generate_solved_board()
    puzzle = copy.deepcopy(solved_board)
    
    # Define cells to remove based on difficulty
    cells_to_remove = {
        'easy': 40,      # 41 cells filled
        'medium': 50,    # 31 cells filled
        'hard': 60       # 21 cells filled
    }
    
    cells = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(cells)
    
    for i, j in cells[:cells_to_remove[difficulty]]:
        puzzle[i][j] = 0
    
    return {
        'puzzle': puzzle,
        'solution': solved_board
    }

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('game'))
    return redirect(url_for('login'))

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/generate/<difficulty>')
def generate(difficulty):
    if difficulty not in ['easy', 'medium', 'hard']:
        return jsonify({'error': 'Invalid difficulty level'}), 400
    
    puzzle_data = generate_puzzle(difficulty)
    return jsonify(puzzle_data)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = sqlite3.connect('sudoku.db')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = c.fetchone()
        conn.close()
        
        if user:
            if check_password_hash(user[2], password):
                session['user_id'] = user[0]
                session['username'] = user[1]
                return redirect(url_for('game'))
            else:
                flash('Incorrect password')
        else:
            flash("Username doesn't exist")
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('signup.html')
        
        hashed_password = generate_password_hash(password)
        
        conn = sqlite3.connect('sudoku.db')
        c = conn.cursor()
        try:
            c.execute('INSERT INTO users (username, password) VALUES (?, ?)',
                     (username, hashed_password))
            conn.commit()
            conn.close()
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            conn.close()
            flash('Username already exists')
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/leaderboard')
def leaderboard():
    conn = sqlite3.connect('sudoku.db')
    c = conn.cursor()
    
    # Get top 10 scores for each difficulty
    difficulties = ['easy', 'medium', 'hard']
    scores = {}
    
    for difficulty in difficulties:
        c.execute('''SELECT users.username, scores.time, scores.date 
                     FROM scores 
                     JOIN users ON scores.user_id = users.id 
                     WHERE difficulty = ? 
                     ORDER BY time ASC LIMIT 10''', (difficulty,))
        scores[difficulty + '_scores'] = [
            {
                'username': row[0],
                'time': format_time(row[1]),
                'date': datetime.fromtimestamp(row[2]).strftime('%Y-%m-%d %H:%M')
            }
            for row in c.fetchall()
        ]
    
    conn.close()
    return render_template('leaderboard.html', **scores)

@app.route('/save_score', methods=['POST'])
def save_score():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401
    
    data = request.get_json()
    difficulty = data.get('difficulty')
    time = data.get('time')  # Time in seconds
    
    if not all([difficulty, time]) or difficulty not in ['easy', 'medium', 'hard']:
        return {'error': 'Invalid data'}, 400
    
    conn = sqlite3.connect('sudoku.db')
    c = conn.cursor()
    
    c.execute('''INSERT INTO scores (user_id, difficulty, time, date)
                 VALUES (?, ?, ?, ?)''',
              (session['user_id'], difficulty, time, datetime.now().timestamp()))
    
    conn.commit()
    conn.close()
    
    return {'success': True}

def format_time(seconds):
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f"{minutes:02d}:{remaining_seconds:02d}"

@app.route('/game')
def game():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('game.html')

@app.route('/play_offline')
def play_offline():
    return render_template('game.html', offline=True)

def init_db():
    conn = sqlite3.connect('sudoku.db')
    c = conn.cursor()
    
    # Create users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL)''')
    
    # Create scores table
    c.execute('''CREATE TABLE IF NOT EXISTS scores
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  difficulty TEXT NOT NULL,
                  time INTEGER NOT NULL,
                  date TIMESTAMP NOT NULL,
                  FOREIGN KEY (user_id) REFERENCES users (id))''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 