export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { prompt, image } = req.body; // Agora recebe prompt e imagem
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();
        const modeloDisponivel = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent"));
        const modelName = modeloDisponivel.name;

        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`;
        
        // --- LÓGICA MULTIMODAL (TEXTO + IMAGEM) ---
        let contents = [{ parts: [{ text: prompt }] }];
        
        if (image) {
            contents[0].parts.push({
                inline_data: { mime_type: "image/jpeg", data: image }
            });
        }

        const response = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta.";
        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(500).json({ error: 'Erro no backend: ' + err.message });
    }
}
