from pathlib import Path
import nltk
from flask import Flask, jsonify
from nltk.sentiment import SentimentIntensityAnalyzer

nltk.data.path.insert(0, str(Path(__file__).parent))
app = Flask(__name__)
sia = SentimentIntensityAnalyzer()


@app.get("/")
@app.get("/healthz")
def home():
    return jsonify(status="ok", service="Best Cars sentiment analyzer")


@app.get("/analyze/<path:input_txt>")
def analyze_sentiment(input_txt):
    if not input_txt.strip() or len(input_txt) > 2000:
        return jsonify(error="Text must contain 1–2000 characters."), 400
    compound = sia.polarity_scores(input_txt)["compound"]
    sentiment = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"
    return jsonify(sentiment=sentiment, score=compound)
