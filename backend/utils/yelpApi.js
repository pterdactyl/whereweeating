const YELP_BASE_URL = "https://api.yelp.com/v3";

function getYelpApiKey() {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing YELP_API_KEY in environment variables.");
  }

  return apiKey;
}

export async function yelpGet(path, params = {}) {
  const apiKey = getYelpApiKey();
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {}),
  ).toString();

  const url = `${YELP_BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const errorBody = await response.json();
      details = ` - ${JSON.stringify(errorBody)}`;
    } catch {
      details = "";
    }

    throw new Error(
      `Yelp API request failed with status ${response.status} ${response.statusText}${details}`,
    );
  }

  return response.json();
}
