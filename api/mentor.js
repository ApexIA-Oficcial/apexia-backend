export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { prompt, image, accessToken, videoId } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) return res.status(500).json({ reply: "Erro: GEMINI_API_KEY não configurada." });

    let relatorioTecnicoOficial = "";
    const hoje = new Date().toISOString().split('T')[0];
    const dataInicio = "2020-01-01";

    if (accessToken) {
        try {
            // Busca dados específicos se houver um vídeo selecionado
            if (videoId) {
                const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
                const aRes = await fetch(analyticsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                const aData = await aRes.json();
                if (aData.rows?.[0]) {
                    const r = aData.rows[0];
                    relatorioTecnicoOficial += `\n🎯 VÍDEO SELECIONADO: Views: ${r[1]}, Retenção: ${r[3]}%, CTR: ${r[5]}%\n`;
                }
            }

            // Busca dados gerais do Canal para a IA
            const canalUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,impressions,impressionsCtr`;
            const cRes = await fetch(canalUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const cData = await cRes.json();
            if (cData.rows?.[0]) {
                const c = cData.rows[0];
                relatorioTecnicoOficial += `\n📈 CANAL GERAL: Views: ${c[0]}, WatchTime: ${c[1]}, Retenção: ${c[3]}%, Ganhos: ${c[4]}, Perdidos: ${c[5]}, Impressões: ${c[6]}, CTR: ${c[7]}%\n`;
            }
        } catch (e) { console.error("Erro Analytics"); }
    }

    try {
        const modelName = "gemini-1.5-flash"; 
        const promptFinal = `${prompt}\n\n${relatorioTecnicoOficial}`;
        
        let contents = [{ parts: [{ text: promptFinal }] }];
        if (image) contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta." });
    } catch (err) { return res.status(500).json({ error: err.message }); }
}
