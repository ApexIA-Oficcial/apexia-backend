// Arquivo: api/mentor.js
export default async function handler(req, res) {
    // 1. Configurar o CORS (Para o GitHub Pages conseguir falar com o Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { prompt } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY; // <--- Bate com a sua foto!

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;

        return res.status(200).json({ reply });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar IA no Backend' });
    }
}
