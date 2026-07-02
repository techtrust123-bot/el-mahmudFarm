from flask import Flask, request, jsonify
from models.feed_model import FeedModel
from models.support_model import SupportModel

app = Flask(__name__)
feed_model = FeedModel()
support_model = SupportModel()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'success': True, 'message': 'AI service healthy'})

@app.route('/predict/feed', methods=['POST'])
def predict_feed():
    payload = request.get_json(force=True) or {}
    animal_type = payload.get('animalType')
    age_months = payload.get('ageMonths')
    weight_kg = payload.get('weightKg')
    feed_category = payload.get('feedCategory', 'standard')
    pasture_quality = payload.get('pastureQuality', 'average')

    if not animal_type or age_months is None or weight_kg is None:
        return jsonify({'success': False, 'message': 'animalType, ageMonths and weightKg are required'}), 400

    try:
        prediction = feed_model.predict({
            'animalType': animal_type,
            'ageMonths': age_months,
            'weightKg': weight_kg,
            'feedCategory': feed_category,
            'pastureQuality': pasture_quality,
        })
        return jsonify({'success': True, 'data': prediction})
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500

@app.route('/train/feed', methods=['POST'])
def train_feed():
    payload = request.get_json(force=True) or {}
    records = payload.get('records')
    if not isinstance(records, list) or len(records) == 0:
        return jsonify({'success': False, 'message': 'Training records are required'}), 400

    try:
        result = feed_model.train(records)
        return jsonify({'success': True, 'data': result})
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500

@app.route('/support/query', methods=['POST'])
def support_query():
    payload = request.get_json(force=True) or {}
    question = payload.get('question')
    if not question or not isinstance(question, str):
        return jsonify({'success': False, 'message': 'question is required'}), 400

    answer = support_model.query(question)
    return jsonify({'success': True, 'data': answer})

@app.route('/support/train', methods=['POST'])
def support_train():
    payload = request.get_json(force=True) or {}
    entries = payload.get('entries')
    if not isinstance(entries, list) or len(entries) == 0:
        return jsonify({'success': False, 'message': 'Support training entries are required'}), 400

    try:
        support_model.train(entries)
        return jsonify({'success': True, 'data': {'trainedExamples': len(entries)}})
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500

@app.route('/support/faqs', methods=['GET'])
def support_faqs():
    return jsonify({'success': True, 'data': support_model.get_faqs()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
