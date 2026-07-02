import json
import os
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression


class FeedModel:
    STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'storage'))
    MODEL_FILE = os.path.join(STORAGE_DIR, 'feed_model.joblib')
    METADATA_FILE = os.path.join(STORAGE_DIR, 'feed_model_metadata.json')

    def __init__(self):
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        self.model = None
        self.categories = None
        self.feature_columns = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.MODEL_FILE):
            data = joblib.load(self.MODEL_FILE)
            self.model = data.get('model')
            self.categories = data.get('categories')
            self.feature_columns = data.get('feature_columns')

    def _build_features(self, records: pd.DataFrame) -> pd.DataFrame:
        categorical_columns = ['animalType', 'feedCategory', 'pastureQuality']
        df = records.copy()

        for column in categorical_columns:
            if column not in df.columns:
                df[column] = 'unknown'

        df = pd.get_dummies(df, columns=categorical_columns, prefix_sep='__')

        if self.feature_columns is not None:
            for col in self.feature_columns:
                if col not in df.columns:
                    df[col] = 0
            df = df[self.feature_columns]

        return df

    def train(self, records: List[Dict]) -> Dict:
        df = pd.DataFrame(records)
        if df.empty:
            raise ValueError('Empty training dataset')

        required_columns = ['animalType', 'ageMonths', 'weightKg', 'dailyFeedKg']
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            raise ValueError(f'Missing required columns: {missing}')

        df = df.dropna(subset=required_columns)
        df['ageMonths'] = pd.to_numeric(df['ageMonths'], errors='coerce')
        df['weightKg'] = pd.to_numeric(df['weightKg'], errors='coerce')
        df['dailyFeedKg'] = pd.to_numeric(df['dailyFeedKg'], errors='coerce')
        df = df.dropna(subset=['ageMonths', 'weightKg', 'dailyFeedKg'])

        X = self._build_features(df)
        y = df['dailyFeedKg']

        if X.empty:
            raise ValueError('Unable to build feature matrix from records')

        model = LinearRegression()
        model.fit(X, y)

        self.model = model
        self.feature_columns = X.columns.tolist()
        self.categories = {
            'animalType': sorted(df['animalType'].astype(str).unique().tolist()),
            'feedCategory': sorted(df['feedCategory'].astype(str).unique().tolist()),
            'pastureQuality': sorted(df['pastureQuality'].astype(str).unique().tolist()),
        }

        joblib.dump({
            'model': self.model,
            'categories': self.categories,
            'feature_columns': self.feature_columns,
        }, self.MODEL_FILE)

        metadata = {
            'trainedOn': len(df),
            'featureColumns': self.feature_columns,
            'categories': self.categories,
        }
        with open(self.METADATA_FILE, 'w', encoding='utf-8') as metadata_file:
            json.dump(metadata, metadata_file, indent=2)

        return metadata

    def predict(self, record: Dict) -> Dict:
        if self.model is None or self.feature_columns is None:
            raise ValueError('Feed model is not trained yet')

        frame = pd.DataFrame([record])
        frame['ageMonths'] = pd.to_numeric(frame['ageMonths'], errors='coerce')
        frame['weightKg'] = pd.to_numeric(frame['weightKg'], errors='coerce')

        X = self._build_features(frame)
        X = X.reindex(columns=self.feature_columns, fill_value=0)

        prediction = self.model.predict(X)[0]
        predicted_value = float(np.clip(prediction, 0.0, None))

        return {
            'recommendedDailyFeedKg': round(predicted_value, 2),
            'inputs': record,
            'note': 'Use this recommendation as a guide, adjust based on animal health and activity.',
        }
