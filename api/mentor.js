export default async function handler(req, res) {
    // 1. Configuração de Segurança (CORS) - MANTIDO
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

    // 🚀 MOTOR 1: AUDITORIA ESPECÍFICA DE VÍDEO (MANTIDO E INTEGRADO)
    if (accessToken && videoId) {
        try {
            const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
            const analyticsRes = await fetch(analyticsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
            });
            const analyticsData = await analyticsRes.json();

            if (analyticsData.rows && analyticsData.rows.length > 0) {
                const row = analyticsData.rows[0];
                relatorioTecnicoOficial += `
                \n--- [DADOS TÉCNICOS DO VÍDEO SELECIONADO] ---
                📊 Visualizações: ${row[1]}
                ⏱️ Retenção (Segundos): ${row[2]}
                📉 Retenção (%): ${row[3]}%
                👁️ Impressões: ${row[4]}
                🎯 CTR do Vídeo: ${row[5]}%
                --------------------------------------------\n`;
            }
        } catch (e) { console.error("Erro Video Analytics"); }
    }

    // 🚀 MOTOR 2: DADOS GERAIS DO CANAL (ADICIONADO - SÓ ATIVA SE TIVER TOKEN)
    if (accessToken) {
        try {
            const canalUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,impressions,impressionsCtr`;
            const canalRes = await fetch(canalUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
            });
            const canalData = await canalRes.json();

            if (canalData.rows && canalData.rows.length > 0) {
                const row = canalData.rows[0];
                relatorioTecnicoOficial += `
                \n--- [PERFORMANCE GERAL DO CANAL (HISTÓRICO)] ---
                📈 Views Totais: ${row[0]}
                ⏳ Watch Time (Min): ${row[1]}
                📉 Retenção Média do Canal: ${row[3]}%
                👥 Inscritos Ganhos: ${row[4]}
                💔 Inscritos Perdidos: ${row[5]}
                👁️ Impressões Totais: ${row[6]}
                🎯 CTR Médio do Canal: ${row[7]}%
                ----------------------------------------------\n`;
            }
        } catch (e) { console.error("Erro Canal Analytics"); }
    }

    // 🚀 MOTOR 3: INTELIGÊNCIA ARTIFICIAL (GEMINI) - MANTIDO
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const modelName = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent")).name;

        const promptFinal = `${prompt}\n\n${relatorioTecnicoOficial}\n\nInstrução: Use os dados acima para dar um diagnóstico de Growth Real.`;
        
        let contents = [{ parts: [{ text: promptFinal }] }];
        if (image) contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta." });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
