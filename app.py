from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
import hashlib
import uuid
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = 'radiocalico-secret-key-change-in-production'
CORS(app, supports_credentials=True)

DATABASE = 'ratings.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                song_hash TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id INTEGER NOT NULL,
                user_session TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating IN (1, -1)),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (song_id) REFERENCES songs (id),
                UNIQUE(song_id, user_session)
            )
        ''')
        
        conn.commit()

def get_song_hash(title, artist):
    return hashlib.md5(f"{title.lower().strip()}:{artist.lower().strip()}".encode()).hexdigest()

def get_user_session():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']

@app.route('/api/rate', methods=['POST'])
def rate_song():
    data = request.get_json()
    
    if not data or 'title' not in data or 'artist' not in data or 'rating' not in data:
        return jsonify({'error': 'Missing required fields: title, artist, rating'}), 400
    
    title = data['title']
    artist = data['artist']
    album = data.get('album', '')
    rating = data['rating']
    
    if rating not in [1, -1]:
        return jsonify({'error': 'Rating must be 1 (thumbs up) or -1 (thumbs down)'}), 400
    
    user_session = get_user_session()
    song_hash = get_song_hash(title, artist)
    
    try:
        with get_db() as conn:
            # Insert or get song
            conn.execute(
                'INSERT OR IGNORE INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)',
                (title, artist, album, song_hash)
            )
            
            song_result = conn.execute(
                'SELECT id FROM songs WHERE song_hash = ?', (song_hash,)
            ).fetchone()
            
            if not song_result:
                return jsonify({'error': 'Failed to create song record'}), 500
            
            song_id = song_result['id']
            
            # Insert or update rating (upsert)
            conn.execute(
                '''INSERT INTO ratings (song_id, user_session, rating) 
                   VALUES (?, ?, ?) 
                   ON CONFLICT(song_id, user_session) 
                   DO UPDATE SET rating = excluded.rating, created_at = CURRENT_TIMESTAMP''',
                (song_id, user_session, rating)
            )
            conn.commit()
            return jsonify({'success': True, 'message': 'Rating recorded'})
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ratings/<path:title>/<path:artist>', methods=['GET'])
def get_ratings(title, artist):
    song_hash = get_song_hash(title, artist)
    user_session = get_user_session()
    
    try:
        with get_db() as conn:
            # Get song ID
            song_result = conn.execute(
                'SELECT id FROM songs WHERE song_hash = ?', (song_hash,)
            ).fetchone()
            
            if not song_result:
                return jsonify({
                    'thumbs_up': 0,
                    'thumbs_down': 0,
                    'user_rating': None
                })
            
            song_id = song_result['id']
            
            # Get aggregated ratings
            ratings_result = conn.execute('''
                SELECT 
                    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
                    SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
                FROM ratings 
                WHERE song_id = ?
            ''', (song_id,)).fetchone()
            
            # Get user's rating
            user_rating_result = conn.execute(
                'SELECT rating FROM ratings WHERE song_id = ? AND user_session = ?',
                (song_id, user_session)
            ).fetchone()
            
            user_rating = user_rating_result['rating'] if user_rating_result else None
            
            return jsonify({
                'thumbs_up': ratings_result['thumbs_up'] or 0,
                'thumbs_down': ratings_result['thumbs_down'] or 0,
                'user_rating': user_rating
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001)