export default async function handler(req, res) {
    // 1. PERMISSÕES DE ACESSO (CORS) - Essencial para o GitHub Pages funcionar
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite que seu site chame a API
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Trata a requisição de pré-verificação do navegador
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST é permitido' });
    }

    const { prompt } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt vazio' });
    }

    try {
        // 2. ENDPOINT CORRIGIDO (O que funcionou nos nossos testes)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro do Google:", data);
            return res.status(response.status).json({ error: data.error?.message || 'Erro na IA' });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta do mentor.';

        // 3. RESPOSTA PARA O FRONTEND
        return res.status(200).json({ reply: text });

    } catch (err) {
        console.error("Erro no Servidor:", err);
        return res.status(500).json({ error: 'Erro interno no backend da ApexiA' });
    }
}
