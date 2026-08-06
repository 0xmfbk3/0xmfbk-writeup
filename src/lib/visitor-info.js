// src/lib/visitor-info.js
exports.handler = async (event) => {
  // قراءة IP الحقيقي من رؤوس Netlify
  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "Unknown IP";

  let city = "Unknown City";
  let country = "Unknown Country";

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    city = data.city || city;
    country = data.country_name || country;
  } catch {
    // تبقى القيم الافتراضية
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, city, country }),
  };
};
