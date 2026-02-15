export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    const { prompt, image, accessToken, videoId } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    let relatorioTecnico = "";

    try {
        if (videoId && accessToken) {
            // 1. BUSCA DADOS PÚBLICOS (Funciona para QUALQUER vídeo do YouTube)
            const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`);
            const videoData = await videoRes.json();
            
            if (videoData.items?.[0]) {
                const v = videoData.items[0];
                relatorioTecnico += `\n🎬 VÍDEO IDENTIFICADO: ${v.snippet.title}\n`;
                relatorioTecnico += ` canal: ${v.snippet.channelTitle}\n`;
                relatorioTecnico += ` Descrição: ${v.snippet.description.substring(0, 300)}...\n`;

                // 2. TENTA BUSCAR ANALYTICS PRIVADO (Só funciona se o vídeo for do usuário)
                const hoje = new Date().toISOString().split('T')[0];
                const aUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2020-01-01&endDate=${hoje}&metrics=views,averageViewPercentage,impressionsCtr&dimensions=video&filters=video==${videoId}`;
                const aRes = await fetch(aUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                const aData = await aRes.json();

                if (aData.rows?.[0]) {
                    const r = aData.rows[0];
                    relatorioTecnico += `📊 MÉTRICAS PRIVADAS: CTR: ${r[3]}%, Retenção: ${r[2]}%\n`;
                } else {
                    relatorioTecnico += `⚠️ NOTA: Este vídeo é externo ou não tem dados de Analytics disponíveis para você.\n`;
                }
            }
        }

        // 3. ENVIAR PARA GEMINI
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const modelName = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent")).name;

        const finalPrompt = `${prompt}\n\n${relatorioTecnico}\n\nIMPORTANTE: Use o título e os dados acima. Se for um vídeo de futebol ou outro tema, mude seu foco para esse tema.`;

        let contents = [{ parts: [{ text: finalPrompt }] }];
        if (image) contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "IA mofada. Tente de novo." });

    } catch (err) { return res.status(500).json({ error: err.message }); }
}
