// POST /api/generate
// Body: { prompt: string, imageDataUrl?: string }
//
// Calls FLUX.1 Kontext [pro] on fal.ai:
//   - with a photo   -> image-editing endpoint (keeps the subject's identity,
//                       applies the style/colour instructions in `prompt`)
//   - without a photo -> text-to-image endpoint (pure description, no
//                       reference image)
//
// Deliberately does NOT ask the AI to render the customer's print text —
// that's drawn on afterwards in the browser (see drawTextPlaque in
// js/script.js), because AI models render exact typography unreliably.
// Keeping it as a separate, code-drawn step is more predictable and free.
//
// Requires a FAL_KEY environment variable, set in your Vercel project's
// Settings -> Environment Variables. Get a key from
// https://fal.ai/dashboard/keys once you've created a fal.ai account.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({
      error: "The server isn't configured with a FAL_KEY yet. Add one in Vercel's project settings."
    });
    return;
  }

  var body = req.body || {};
  var prompt = body.prompt;
  var imageDataUrl = body.imageDataUrl;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "A prompt is required." });
    return;
  }

  var endpoint = imageDataUrl
    ? "https://fal.run/fal-ai/flux-pro/kontext"
    : "https://fal.run/fal-ai/flux-pro/kontext/text-to-image";

  var falBody = imageDataUrl
    ? { prompt: prompt, image_url: imageDataUrl }
    : { prompt: prompt };

  try {
    var falRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Key " + FAL_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(falBody)
    });

    if (!falRes.ok) {
      var errText = await falRes.text();
      res.status(502).json({
        error: "The design AI couldn't generate an image.",
        detail: errText
      });
      return;
    }

    var data = await falRes.json();
    var imageUrl = data && data.images && data.images[0] && data.images[0].url;

    if (!imageUrl) {
      res.status(502).json({ error: "The design AI response didn't include an image." });
      return;
    }

    res.status(200).json({ imageUrl: imageUrl });
  } catch (err) {
    res.status(500).json({ error: "Couldn't reach the design AI.", detail: String(err) });
  }
};
