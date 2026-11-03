require("dotenv").config();

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = "https://v3.football.api-sports.io";

app.use(express.static(__dirname));

// Football API request function
async function footballRequest(endpoint, params = {}) {
  if (!API_KEY) {
    throw new Error("API key missing. Check your .env file.");
  }

  const url = new URL(`${API_BASE}/${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Football API returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data;
}

// Error handler
function handleApiError(res, error) {
  console.error("PitchIQ API error:", error.message);

  res.status(502).json({
    error: "Unable to retrieve football data.",
    details: error.message
  });
}

// API health
app.get("/api/health", async (req, res) => {
  try {
    const data = await footballRequest("status");

    res.json({
      success: true,
      account: data.response
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

// Live matches
app.get("/api/live", async (req, res) => {
  try {
    const data = await footballRequest("fixtures", {
      live: "all",
      timezone: "Africa/Dar_es_Salaam"
    });

    res.json(data);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Fixtures by date
app.get("/api/fixtures", async (req, res) => {
  const date = req.query.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: "Use a date in YYYY-MM-DD format."
    });
  }

  try {
    const data = await footballRequest("fixtures", {
      date,
      timezone: "Africa/Dar_es_Salaam"
    });

    res.json(data);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Worldwide leagues and competitions
app.get("/api/leagues", async (req, res) => {
  const season = Number(req.query.season || 2026);
  const country = req.query.country;
  const search = req.query.search;

  if (
    !Number.isInteger(season) ||
    season < 1900 ||
    season > 2200
  ) {
    return res.status(400).json({
      error: "Provide a valid season."
    });
  }

  try {
    const data = await footballRequest("leagues", {
      season,
      country,
      search
    });

    res.json(data);
  } catch (error) {
    handleApiError(res, error);
  }
});

// League standings
app.get("/api/standings", async (req, res) => {
  const league = Number(req.query.league);
  const season = Number(req.query.season);

  if (
    !Number.isInteger(league) ||
    league <= 0 ||
    !Number.isInteger(season) ||
    season < 1900 ||
    season > 2200
  ) {
    return res.status(400).json({
      error: "Provide a valid league ID and season."
    });
  }

  try {
    const data = await footballRequest("standings", {
      league,
      season
    });

    res.json(data);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "PitchIQ API endpoint not found."
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`PitchIQ is running at http://localhost:${PORT}`);
});