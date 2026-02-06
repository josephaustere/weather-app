
import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing OPENWEATHER_API_KEY")

@app.get("/")
def home():
    return "Weather API is running"

@app.get("/weather")
def get_weather():
    city = (request.args.get("city") or "").strip()
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
    }

    r = requests.get(url, params=params, timeout=10)
    data = r.json()

    if r.status_code != 200:
        return jsonify({"error": data.get("message", "OpenWeather error")}), r.status_code

    return jsonify({
        "city": data["name"],
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
    })

@app.get("/weather/coords")
def get_weather_by_coords():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"error": "lat and lon parameters are required"}), 400

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric",
    }

    r = requests.get(url, params=params, timeout=10)
    data = r.json()

    if r.status_code != 200:
        return jsonify({"error": data.get("message", "OpenWeather error")}), r.status_code

    return jsonify({
        "city": data["name"],
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
        "lat": data["coord"]["lat"],
        "lon": data["coord"]["lon"],
    })
@app.get("/forecast")
def forecast_by_city():
    city = (request.args.get("city") or "").strip()
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
    }

    r = requests.get(url, params=params, timeout=10)
    data = r.json()

    if r.status_code != 200:
        return jsonify({"error": data.get("message", "OpenWeather error")}), r.status_code

    # Reduce noisy data → daily summaries (one per day at ~12:00)
    daily = []
    for item in data["list"]:
        if "12:00:00" in item["dt_txt"]:
            daily.append({
                "date": item["dt_txt"].split(" ")[0],
                "temp": item["main"]["temp"],
                "weather": item["weather"][0]["description"],
                "humidity": item["main"]["humidity"],
            })

    return jsonify({
        "city": data["city"]["name"],
        "days": daily[:5]
    })
if __name__ == "__main__":
    app.run(debug=True, port=5001)
EOF