export default async function handler(req, res) {
    // 1. Configurar Permissões (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { prompt } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) return res.status(500).json({ error: 'Chave API não configurada no Vercel' });

    try {
        // --- PASSO A: DESCOBRIR QUAIS MODELOS ESTÃO ATIVOS ---
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (!listResponse.ok) {
            return res.status(listResponse.status).json({ 
                error: `O Google recusou sua chave. Motivo: ${listData.error?.message || 'Chave inválida'}` 
            });
        }

        // Procura um modelo que aceite gerar conteúdo
        const modeloDisponivel = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent"));

        if (!modeloDisponivel) {
            return res.status(404).json({ error: 'Nenhum modelo Gemini foi encontrado ativo nesta chave.' });
        }

        const modelName = modeloDisponivel.name; // Ex: models/gemini-1.5-flash

        // --- PASSO B: USAR O MODELO ENCONTRADO ---
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Erro ao gerar conteúdo' });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta.";
        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno no backend ApexiA: ' + err.message });
    }
}
