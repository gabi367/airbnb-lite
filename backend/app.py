from flask import Flask, g, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import datetime
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

SECRET_KEY = os.environ.get('SECRET_KEY', 'supersecret_dev_key')
DB_PATH = os.path.join(os.path.dirname(__file__), 'airbnb_lite.db')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    if os.path.exists(DB_PATH):
        return
    db = sqlite3.connect(DB_PATH)
    cursor = db.cursor()
    cursor.executescript('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password_hash TEXT
    );
    CREATE TABLE listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        title TEXT,
        city TEXT,
        type TEXT,
        price INTEGER,
        description TEXT,
        image TEXT
    );
    CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER,
        guest_id INTEGER,
        guest_name TEXT,
        created_at TEXT
    );
    INSERT INTO listings (owner_id, title, city, type, price, description, image) VALUES
      (NULL, 'Loft céntrico', 'Asunción', 'Departamento', 40, 'Cómodo loft en el centro', 'https://picsum.photos/seed/1/400/300'),
      (NULL, 'Casa con jardín', 'Encarnación', 'Casa', 70, 'Casa amplia con jardín', 'https://picsum.photos/seed/2/400/300'),
      (NULL, 'Habitación privada', 'Ciudad del Este', 'Habitación', 20, 'Habitación cómoda cerca de todo', 'https://picsum.photos/seed/3/400/300');
    ''')
    db.commit()
    db.close()

app = Flask(__name__)
CORS(app)

@app.before_first_request
def setup():
    init_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth = request.headers.get('Authorization', None)
        if auth and auth.startswith('Bearer '):
            token = auth.split(' ',1)[1]
        if not token:
            return jsonify({'error':'Token requerido'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = data.get('user_id')
            db = get_db()
            user = db.execute('SELECT id, email FROM users WHERE id=?',(user_id,)).fetchone()
            if not user:
                return jsonify({'error':'Usuario no existe'}), 401
            request.user = dict(user)
        except Exception as e:
            return jsonify({'error':'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/auth/register', methods=['POST'])
def register():
    payload = request.json or {}
    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        return jsonify({'error':'email y password requeridos'}), 400
    db = get_db()
    try:
        db.execute('INSERT INTO users (email, password_hash) VALUES (?,?)', (email, generate_password_hash(password)))
        db.commit()
        return jsonify({'ok':True})
    except sqlite3.IntegrityError:
        return jsonify({'error':'Email ya registrado'}), 400

@app.route('/auth/login', methods=['POST'])
def login():
    payload = request.json or {}
    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        return jsonify({'error':'email y password requeridos'}), 400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error':'Credenciales inválidas'}), 401
    token = jwt.encode({'user_id': user['id'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}, SECRET_KEY, algorithm='HS256')
    return jsonify({'token': token})

@app.route('/api/listings')
def api_listings():
    db = get_db()
    cursor = db.execute('SELECT id, owner_id, title, city, type, price, description, image FROM listings')
    rows = cursor.fetchall()
    data = [dict(r) for r in rows]
    return jsonify(data)

@app.route('/api/my_listings')
@token_required
def my_listings():
    db = get_db()
    cursor = db.execute('SELECT id, owner_id, title, city, type, price, description, image FROM listings WHERE owner_id=?', (request.user['id'],))
    rows = cursor.fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/create_listing', methods=['POST'])
@token_required
def create_listing():
    payload = request.json or {}
    title = payload.get('title')
    city = payload.get('city')
    price = payload.get('price',0)
    type_ = payload.get('type','Departamento')
    description = payload.get('description','')
    image = payload.get('image','https://picsum.photos/seed/new/400/300')
    if not title or not city:
        return jsonify({'error':'title y city requeridos'}), 400
    db = get_db()
    cursor = db.execute('INSERT INTO listings (owner_id, title, city, type, price, description, image) VALUES (?,?,?,?,?,?,?)', (request.user['id'], title, city, type_, price, description, image))
    db.commit()
    return jsonify({'id': cursor.lastrowid})

@app.route('/api/book', methods=['POST'])
def api_book():
    payload = request.json or {}
    listing_id = payload.get('listing_id')
    guest_name = payload.get('guest_name')
    guest_id = None
    auth = request.headers.get('Authorization', None)
    if auth and auth.startswith('Bearer '):
        token = auth.split(' ',1)[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            guest_id = data.get('user_id')
            # Optionally set guest_name from user email
            db = get_db()
            user = db.execute('SELECT email FROM users WHERE id=?',(guest_id,)).fetchone()
            if user and not guest_name:
                guest_name = user['email']
        except Exception:
            guest_id = None
    if not listing_id:
        return jsonify({'error':'listing_id requerido'}), 400
    db = get_db()
    cursor = db.execute('INSERT INTO bookings (listing_id, guest_id, guest_name, created_at) VALUES (?,?,?,?)', (listing_id, guest_id, guest_name or 'Invitado', datetime.datetime.utcnow().isoformat()))
    db.commit()
    return jsonify({'booking_id': cursor.lastrowid})

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
