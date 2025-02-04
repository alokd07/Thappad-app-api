from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
import os
from datetime import datetime

# Initialize Flask App
app = Flask(__name__)

# Database Configuration (Using SQLite)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize DB & Marshmallow
db = SQLAlchemy(app)
ma = Marshmallow(app)

# Define Data Model
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, title, price, date):
        self.title = title
        self.price = price
        self.date = date

# Schema for Serialization
class ItemSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Item

item_schema = ItemSchema()
items_schema = ItemSchema(many=True)

# ✅ Create Database Within App Context
with app.app_context():
    db.create_all()

# Route to Save Data
@app.route('/add', methods=['POST'])
def add_item():
    data = request.json

    title = data.get('title')
    price = data.get('price')
    date_str = data.get('date', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))

    # Convert date string to datetime object
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD HH:MM:SS'}), 400

    new_item = Item(title, price, date)
    db.session.add(new_item)
    db.session.commit()

    return item_schema.jsonify(new_item)

# Route to Show All Data
@app.route('/items', methods=['GET'])
def get_items():
    all_items = Item.query.all()
    return items_schema.jsonify(all_items)

# Run the Flask App
if __name__ == '__main__':
    app.run(debug=True)
