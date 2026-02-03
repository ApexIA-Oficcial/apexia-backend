export default async function handler(req, res) {
    // 1. Configurar CORS (Permissões)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!req.body || !req.body.prompt) {
        return res.status(400).json({ error: 'Corpo da requisição inválido ou prompt vazio' });
    }

    const { prompt } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Sem resposta do Mentor ApexiA.';

        return res.status(200).json({ reply: text });

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno no servidor ApexiA' });
    }
}
