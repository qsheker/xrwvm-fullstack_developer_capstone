import unittest
from app import app


class SentimentTests(unittest.TestCase):
    def test_positive_negative_neutral(self):
        client = app.test_client()
        for text, expected in [
            ("Fantastic services", "positive"),
            ("Terrible service. I hate this awful experience.", "negative"),
            ("The car is parked outside.", "neutral"),
        ]:
            response = client.get("/analyze/" + text)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["sentiment"], expected)
