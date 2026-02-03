export default async function handler(req, res) {
    // 1. Configurar Permissões (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { prompt } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt não recebido' });
    }

    // 2. LISTA DE TENTATIVAS (Se o primeiro falhar, ele tenta o próximo automaticamente)
    const modelosParaTestar = [
        { ver: "v1", mod: "gemini-1.5-flash" },
        { ver: "v1beta", mod: "gemini-1.5-flash" },
        { ver: "v1", mod: "gemini-pro" }
    ];

    let ultimoErro = "";

    for (const config of modelosParaTestar) {
        try {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            if (response.ok && data.candidates) {
                // SE FUNCIONAR, RETORNA IMEDIATAMENTE
                const reply = data.candidates[0].content.parts[0].text;
                return res.status(200).json({ reply });
            } else {
                ultimoErro = data.error ? data.error.message : "Erro desconhecido";
                console.log(`Tentativa com ${config.mod} falhou: ${ultimoErro}`);
            }
        } catch (err) {
            ultimoErro = err.message;
        }
    }

    // 3. SE CHEGAR AQUI, TODAS AS TENTATIVAS FALHARAM
    return res.status(500).json({ 
        error: `O Google recusou todos os modelos. Motivo: ${ultimoErro}. Verifique se a 'Generative Language API' está ativa no seu Google Cloud.` 
    });
}
