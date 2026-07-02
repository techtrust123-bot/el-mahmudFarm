import json
import os
from typing import Dict, List

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class SupportModel:
    STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'storage'))
    FAQ_FILE = os.path.join(STORAGE_DIR, 'support_faqs.json')

    def __init__(self):
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        self.faqs = []
        self.vectorizer = None
        self.question_vectors = None
        self.load_faqs()

    def load_faqs(self):
        if os.path.exists(self.FAQ_FILE):
            with open(self.FAQ_FILE, 'r', encoding='utf-8') as faq_file:
                self.faqs = json.load(faq_file)
        else:
            self.faqs = []

        self._rebuild_vectorizer()

    def _rebuild_vectorizer(self):
        questions = [item['question'] for item in self.faqs if 'question' in item]
        if not questions:
            self.vectorizer = None
            self.question_vectors = None
            return

        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.question_vectors = self.vectorizer.fit_transform(questions)

    def save_faqs(self):
        with open(self.FAQ_FILE, 'w', encoding='utf-8') as faq_file:
            json.dump(self.faqs, faq_file, indent=2)
        self._rebuild_vectorizer()

    def train(self, entries: List[Dict]) -> Dict:
        added = 0
        for entry in entries:
            if not entry.get('question') or not entry.get('answer'):
                continue
            self.faqs.append({
                'question': entry['question'].strip(),
                'answer': entry['answer'].strip(),
            })
            added += 1

        if added == 0:
            raise ValueError('No valid support entries were provided')

        self.save_faqs()
        return {'entriesAdded': added, 'totalFaqs': len(self.faqs)}

    def query(self, question: str) -> Dict:
        if not self.faqs:
            return {
                'answer': 'Support knowledge base is empty. Please contact your farm administrator.',
                'confidence': 0.0,
            }

        if self.vectorizer is None or self.question_vectors is None:
            self._rebuild_vectorizer()

        query_vector = self.vectorizer.transform([question])
        similarities = cosine_similarity(query_vector, self.question_vectors)[0]
        best_index = int(similarities.argmax())
        best_score = float(similarities[best_index])

        if best_score < 0.2:
            return {
                'answer': 'I could not find a close match. Please ask your manager or check the help section.',
                'confidence': best_score,
            }

        return {
            'answer': self.faqs[best_index]['answer'],
            'sourceQuestion': self.faqs[best_index]['question'],
            'confidence': best_score,
        }

    def get_faqs(self) -> List[Dict]:
        return self.faqs
