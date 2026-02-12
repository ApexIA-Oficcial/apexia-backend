export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { prompt, image, accessToken, videoId } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    let dadosAuditoria = "";

    // 🚀 BLOCO DE OURO: AUDITORIA REAL NO BACKEND
    if (accessToken && videoId) {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
            
            const analyticsRes = await fetch(analyticsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const analyticsData = await analyticsRes.json();

            if (analyticsData.rows && analyticsData.rows.length > 0) {
                const s = analyticsData.rows[0];
                dadosAuditoria = `\n\n--- DADOS REAIS DE AUDITORIA DO VÍDEO SELECIONADO ---\n` +
                                `- Visualizações: ${s[1]}\n` +
                                `- Retenção Média: ${s[3]}%\n` +
                                `- CTR Real: ${s[5]}%\n` +
                                `--- FIM DO RELATÓRIO TÉCNICO ---`;
            }
        } catch (e) {
            console.error("Erro no Analytics API");
        }
    }

    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const modelName = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent")).name;

        // Injeta a auditoria no prompt final
        const finalPromptWithData = `${prompt}\n${dadosAuditoria}`;

        let contents = [{ parts: [{ text: finalPromptWithData }] }];
        if (image) contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta.";
        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
