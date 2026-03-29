import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const SYSTEM_PROMPT = `You are an expert agronomist and plant pathologist specializing in precision agriculture for irrigated croplands in Imperial Valley, California. A farmer has flagged a stressed field using satellite NDVI analysis and uploaded a leaf photo for diagnosis.

Analyze the image carefully and respond ONLY with valid JSON in this exact structure — no markdown, no explanation outside the JSON:

{
  "assessment": "1-2 sentence overall crop health assessment",
  "symptoms": ["visible symptom 1", "visible symptom 2"],
  "deficiencies": [
    { "name": "Nitrogen deficiency", "confidence": "high" },
    { "name": "Water stress", "confidence": "medium" }
  ],
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "urgency": "CRITICAL"
}

Rules:
- urgency must be exactly one of: CRITICAL, HIGH, MEDIUM, LOW
- confidence must be exactly one of: high, medium, low
- Only include deficiencies/issues you can reasonably infer from visual symptoms
- Frame deficiencies as "consistent with X" rather than definitive diagnoses
- Recommendations must be specific and actionable for a farmer
- Speak plainly — avoid jargon`;

router.post('/', async (req, res) => {
  const { imageBase64, mediaType = 'image/jpeg', fieldId } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured in server/.env' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: fieldId
                ? `Analyze this leaf sample from field ${fieldId} in Imperial Valley, CA. This field was flagged as stressed by satellite NDVI analysis.`
                : 'Analyze this leaf sample from a field in Imperial Valley, CA that was flagged as stressed by satellite NDVI analysis.',
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip markdown code fences if Claude wraps the JSON
    const jsonText = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch {
      console.error('[analyze-leaf] Failed to parse Claude response:', rawText);
      return res.status(502).json({ error: 'Claude returned an unexpected format', raw: rawText.slice(0, 200) });
    }

    res.json(result);
  } catch (err) {
    console.error('[analyze-leaf]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
