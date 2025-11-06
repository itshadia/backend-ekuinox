// backend/controllers/cityController.js
const City = require("../models/City");
const tz_lookup = require("tz-lookup");
const { DateTime } = require("luxon");
const SunCalc = require("suncalc");

const WEATHER_KEY = process.env.OPENWEATHER_KEY;
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct";
const REST_COUNTRIES_URL = "https://restcountries.com/v3.1/alpha";

// Auto-complete city data from name
async function autoCompleteCity(cityName) {
  console.log('Auto-completing city:', cityName);
  
  const useOpenWeather = WEATHER_KEY && WEATHER_KEY !== 'paste_your_new_api_key_here';
  
  try {
    let lat, lng, countryCode, properName;
    
    if (useOpenWeather) {
      const geoUrl = `${GEOCODING_URL}?q=${encodeURIComponent(cityName)}&limit=1&appid=${WEATHER_KEY}`;
      console.log('Fetching geocoding data from OpenWeather...');
      
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`);
      
      const geoData = await geoRes.json();
      if (!geoData.length) throw new Error('City not found in OpenWeather');
      
      const location = geoData[0];
      lat = location.lat;
      lng = location.lon;
      countryCode = location.country;
      properName = location.name;
      
      console.log('OpenWeather geocoding result:', { properName, lat, lng, countryCode });
    } else {
      console.log('Using fallback geocoding service...');
      const fallbackUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
      
      const geoRes = await fetch(fallbackUrl);
      if (!geoRes.ok) throw new Error(`Fallback geocoding failed: ${geoRes.status}`);
      
      const geoData = await geoRes.json();
      if (!geoData.results || !geoData.results.length) throw new Error('City not found in fallback service');
      
      const location = geoData.results[0];
      lat = location.latitude;
      lng = location.longitude;
      countryCode = location.country_code?.toUpperCase();
      properName = location.name;
      
      console.log('Fallback geocoding result:', { properName, lat, lng, countryCode });
    }

    // Get country name and flag image from REST Countries API
    let countryName = '';
    let flagImg = '';
    
    try {
      console.log('Fetching country data for:', countryCode);
      const countryRes = await fetch(`${REST_COUNTRIES_URL}/${countryCode}`);
      
      if (countryRes.ok) {
        const countryData = await countryRes.json();
        if (countryData.length) {
          const country = countryData[0];
          countryName = country.name?.common || '';
          flagImg = country.flags?.png || country.flags?.svg || '';
          
          console.log('Country data found:', { countryName, flagImg });
        }
      }
    } catch (e) {
      console.log('Country API failed, using fallback...', e.message);
    }
    
    // Fallback for country name if API fails
    if (!countryName && countryCode) {
      try {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        countryName = regionNames.of(countryCode);
        console.log('Fallback country name:', countryName);
      } catch (_) {
        countryName = countryCode;
      }
    }

    // Generate identifiers
    const citySlug = properName?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const externalId = `${countryCode?.toLowerCase()}-${citySlug}` || null;

    // Get weather and compute time/daylight
    console.log('Computing time/weather data...');
    const display = computeCityData(lat, lng);
    const weatherInfo = await fetchWeather(lat, lng);

    const result = {
      externalId: externalId,
      id: `${countryCode?.toLowerCase()}_${citySlug}`,
      name: properName || cityName,
      country: countryName,
      flagImg: flagImg,
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      time: display.time,
      timezone: display.timezone,
      isDST: display.isDST,
      date: display.date,
      isDay: display.isDay,
      weather: weatherInfo.weather,
      temperature: weatherInfo.temperature ? parseFloat(weatherInfo.temperature.toFixed(1)) : null,
    };
    
    console.log('Auto-complete result:', result);
    return result;
    
  } catch (error) {
    console.error('Auto-complete error:', error);
    throw new Error(`Auto-complete failed: ${error.message}`);
  }
}

// Format API response - Return ALL fields including latitude, longitude, and everything
function formatCityResponse(cityDoc) {
  let countryName = cityDoc.country;
  try {
    if (!countryName && cityDoc.countryCode) {
      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      countryName = regionNames.of(String(cityDoc.countryCode).toUpperCase());
    }
  } catch (_) {}
  
  return {
    // Core identifiers
    _id: cityDoc._id,
    externalId: cityDoc.externalId || null,
    id: cityDoc.id || null,
    
    // Basic information
    name: cityDoc.name,
    country: countryName || cityDoc.country || null,
    countryCode: cityDoc.countryCode || null,
    
    // Visual elements
    flag: cityDoc.flag || null,
    flagImg: cityDoc.flagImg || null,
    
    // 🌍 COORDINATES - Latitude & Longitude (what you need!)
    lat: cityDoc.lat || null,
    lng: cityDoc.lng || null,
    
    // Time and timezone information
    time: cityDoc.time || null,
    timezone: cityDoc.timezone || null,
    isDST: !!cityDoc.isDST,
    date: cityDoc.date || null,
    
    // Weather information
    weather: cityDoc.weather ?? "unknown",
    temperature: cityDoc.temperature ?? null,
    isDay: !!cityDoc.isDay,
    
    // Database timestamps
    createdAt: cityDoc.createdAt,
    updatedAt: cityDoc.updatedAt,
    
    // Version key (if needed for optimistic locking)
    __v: cityDoc.__v
  };
}

// Compute timezone, daylight, etc.
function computeCityData(lat, lng, now = DateTime.now()) {
  let tz = "UTC";
  try {
    tz = tz_lookup(lat, lng);
  } catch {
    tz = "UTC";
  }

  const dt = now.setZone(tz);
  const time = dt.toFormat("HH:mm");
  const date = dt.toFormat("d LLLL yyyy");
  const offsetHours = dt.offset / 60;
  const timezone = `UTC${offsetHours >= 0 ? "+" + offsetHours : offsetHours}`;
  const isDST = dt.isInDST;
  const sun = SunCalc.getPosition(new Date(dt.toISO()), lat, lng);
  const isDay = sun.altitude > 0;

  return { tz, time, date, timezone, isDST, isDay };
}

// Fetch weather
async function fetchWeather(lat, lng) {
  console.log('fetchWeather called with:', { lat, lng, hasKey: !!WEATHER_KEY });
  
  if (!WEATHER_KEY) {
    console.log('No WEATHER_KEY found');
    return { weather: "unknown", temperature: null, raw: null };
  }

  const url = `${OPENWEATHER_URL}?lat=${lat}&lon=${lng}&appid=${WEATHER_KEY}&units=metric`;
  console.log('Fetching weather from:', url.replace(WEATHER_KEY, '[API_KEY]'));
  
  try {
    const res = await fetch(url);
    console.log('Weather API response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('Weather API error:', errorText);
      return { weather: "unknown", temperature: null };
    }
    
    const data = await res.json();
    console.log('Weather API data:', JSON.stringify(data, null, 2));
    
    const weather = data.weather?.[0]?.main?.toLowerCase() || "clear";
    const temperature = data.main?.temp ?? null;
    
    console.log('Parsed weather:', { weather, temperature });
    return { weather, temperature };
  } catch (error) {
    console.log('Weather fetch error:', error.message);
    return { weather: "unknown", temperature: null };
  }
}

// ✅ CREATE CITY (assign owner + per-user duplicate check)
exports.createCity = async (req, res) => {
  try {
    const { id, externalId, name, country, flagImg, lat, lng } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication required to add a city." });
    }

    if (!name) {
      return res.status(400).json({ error: "City name is required." });
    }

    let cityData;

    if (lat != null && lng != null) {
      const display = computeCityData(lat, lng);
      const weatherInfo = await fetchWeather(lat, lng);

      cityData = {
        user: req.user.id,
        id: id ?? null,
        externalId: externalId ?? null,
        name,
        country: country || null,
        flagImg: flagImg || null,
        lat,
        lng,
        time: display.time,
        timezone: display.timezone,
        isDST: display.isDST,
        date: display.date,
        isDay: display.isDay,
        weather: weatherInfo.weather,
        temperature: weatherInfo.temperature,
      };
    } else {
      try {
        const autoData = await autoCompleteCity(name);
        cityData = {
          user: req.user.id,
          id: id ?? null,
          externalId: externalId ?? null,
          ...autoData,
        };
      } catch (autoError) {
        return res.status(400).json({
          error: `Could not auto-complete city data: ${autoError.message}. Please provide coordinates (lat, lng).`,
        });
      }
    }

    // Per-user duplicate check (same name + country for the same user)
    const existing = await City.findOne({
      name: { $regex: new RegExp(`^${cityData.name}$`, "i") },
      country: cityData.country,
      user: req.user.id,
    });

    if (existing) {
      console.warn("createCity: duplicate detected for user", req.user.id, existing._id);
      return res.status(200).json({
        message: "City already exists for this user",
        data: formatCityResponse(existing),
      });
    }

    const city = await City.create(cityData);
    return res.status(201).json(formatCityResponse(city));
  } catch (err) {
    console.error("createCity error:", err);

    if (err.code === 11000) {
      console.error('Duplicate key error details:', err.keyValue || err.message);
      console.error('User ID:', req.user?.id);
      console.error('City data:', JSON.stringify(cityData, null, 2));
      
      // Check if it's a per-user duplicate (expected) or global duplicate (problem)
      if (err.message && err.message.includes('user_1')) {
        return res.status(409).json({ error: "You have already added this city." });
      } else {
        return res.status(409).json({ error: "City already exists in database." });
      }
    }

    return res.status(500).json({ error: "Server error creating city." });
  }
};

// ✅ GET ALL CITIES
exports.getCities = async (req, res) => {
  try {
    // Only return cities for the authenticated user
    const cities = await City.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(cities.map(formatCityResponse));
  } catch (err) {
    console.error("getCities error:", err);
    res.status(500).json({ error: "Server error fetching cities." });
  }
};

// ✅ GET ONE CITY
exports.getCity = async (req, res) => {
  try {
    // Only return city if it belongs to the authenticated user
    const city = await City.findOne({ _id: req.params.id, user: req.user.id });
    if (!city) return res.status(404).json({ error: "City not found." });
    res.json(formatCityResponse(city));
  } catch (err) {
    console.error("getCity error:", err);
    res.status(500).json({ error: "Server error fetching city." });
  }
};

// ✅ UPDATE CITY - ensure user owns the city before updating
exports.updateCity = async (req, res) => {
  try {
    const city = await City.findOne({ _id: req.params.id, user: req.user.id });
    if (!city) return res.status(404).json({ error: "City not found." });

    const updatable = ["name", "country", "countryCode", "flag", "flagImg", "lat", "lng"];
    updatable.forEach((k) => {
      if (req.body[k] !== undefined) city[k] = req.body[k];
    });

    const display = computeCityData(city.lat, city.lng);
    const weatherInfo = await fetchWeather(city.lat, city.lng);

    Object.assign(city, {
      time: display.time,
      timezone: display.timezone,
      isDST: display.isDST,
      date: display.date,
      isDay: display.isDay,
      weather: weatherInfo.weather,
      temperature: weatherInfo.temperature,
    });

    await city.save();
    res.json(formatCityResponse(city));
  } catch (err) {
    console.error("updateCity error:", err);
    res.status(500).json({ error: "Server error updating city." });
  }
};

// ✅ DELETE CITY
exports.deleteCity = async (req, res) => {
  try {
    const deleted = await City.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ error: "City not found." });
    res.json({ message: "City deleted successfully." });
  } catch (err) {
    console.error("deleteCity error:", err);
    res.status(500).json({ error: "Server error deleting city." });
  }
};

// ✅ REFRESH WEATHER + TIME
exports.refreshCity = async (req, res) => {
  try {
    // Only allow refreshing user's own cities
    const city = await City.findOne({ _id: req.params.id, user: req.user.id });
    if (!city) return res.status(404).json({ error: "City not found." });

    const display = computeCityData(city.lat, city.lng);
    const weatherInfo = await fetchWeather(city.lat, city.lng);

    Object.assign(city, {
      time: display.time,
      timezone: display.timezone,
      isDST: display.isDST,
      date: display.date,
      isDay: display.isDay,
      weather: weatherInfo.weather,
      temperature: weatherInfo.temperature,
    });

    await city.save();
    res.json(formatCityResponse(city));
  } catch (err) {
    console.error("refreshCity error:", err);
    res.status(500).json({ error: "Server error refreshing city." });
  }
};
