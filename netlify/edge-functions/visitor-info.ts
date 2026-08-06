// netlify/edge-functions/visitor-info.ts
export default async (request: Request, context: any) => {
  // قراءة عنوان IP الحقيقي من context (توفره Netlify Edge Functions)
  const ip = context.ip || request.headers.get("x-nf-client-connection-ip") || "Unknown IP";
  let city = "Unknown City";
  let country = "Unknown Country";

  try {
    // استدعاء خارجي من الخادم (لا حظر CORS)
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    city = data.city || city;
    country = data.country_name || country;
  } catch {
    // في حال الفشل، تبقى القيم الافتراضية
  }

  const json = { ip, city, country };
  return new Response(JSON.stringify(json), {
    headers: { "content-type": "application/json" },
  });
};
