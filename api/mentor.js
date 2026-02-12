export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { prompt, image, accessToken, videoId } = req.body; // Recebemos o Token e o ID do Vídeo
    const API_KEY = process.env.GEMINI_API_KEY;

    let dadosRetencao = "Nenhum dado de retenção disponível.";

    // 🚀 BLOCO MÍNIMO: CHAMADA REAL AO ANALYTICS API
    if (accessToken && videoId) {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
            
            const analyticsRes = await fetch(analyticsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const analyticsData = await analyticsRes.json();

            if (analyticsData.rows && analyticsData.rows.length > 0) {
                const row = analyticsData.rows[0];
                dadosRetencao = `
                📊 DADOS REAIS DE PERFORMANCE (API):
                - Views: ${row[1]}
                - Duração Média de Visualização: ${row[2]} segundos
                - Porcentagem Média de Retenção: ${row[3]}%
                - Impressões: ${row[4]}
                - CTR de Impressões: ${row[5]}%
                `;
            }
        } catch (e) {
            console.error("Erro ao acessar Analytics API:", e);
        }
    }

    try {
        // --- CONFIGURAÇÃO DO MODELO ---
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const modelName = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent")).name;

        // INJETANDO A VERDADE NO PROMPT
        const promptFinal = `${prompt}\n\n${dadosRetencao}`;

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
