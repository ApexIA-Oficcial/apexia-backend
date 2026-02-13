export default async function handler(req, res) {
    // 1. Configurar Permissões (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 🛡️ SEGURANÇA RESTAURADA: Verifica se o método é POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { prompt, image, accessToken, videoId } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    // 🛡️ SEGURANÇA RESTAURADA: Verifica se a chave existe no servidor
    if (!API_KEY) {
        return res.status(500).json({ reply: "🚨 ERRO CRÍTICO: GEMINI_API_KEY não configurada no Vercel." });
    }

    let relatorioTecnicoOficial = "";
    const hoje = new Date().toISOString().split('T')[0];
    const dataInicio = "2020-01-01";

    if (accessToken) {
        try {
            // 🔎 BUSCA TÍTULO REAL DO VÍDEO (Data API)
            if (videoId) {
                const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const videoData = await videoRes.json();
                if (videoData.items?.[0]) {
                    relatorioTecnicoOficial += `\n🎯 VÍDEO EM ANÁLISE: ${videoData.items[0].snippet.title}\n`;
                }

                // 📊 ANALYTICS DO VÍDEO ESPECÍFICO
                const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
                const aRes = await fetch(analyticsUrl, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } });
                const aData = await aRes.json();
                if (aData.rows?.[0]) {
                    const r = aData.rows[0];
                    relatorioTecnicoOficial += `📈 MÉTRICAS DO VÍDEO: Views: ${r[1]}, Retenção: ${r[3]}%, CTR: ${r[5]}%\n`;
                }
            }

            // 📊 ANALYTICS GERAL DO CANAL (Sempre presente)
            const canalUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,impressions,impressionsCtr`;
            const cRes = await fetch(canalUrl, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } });
            const cData = await cRes.json();
            if (cData.rows?.[0]) {
                const c = cData.rows[0];
                relatorioTecnicoOficial += `\n🌍 STATUS GERAL DO CANAL: Total Views: ${c[0]}, Retenção Média: ${c[3]}%, CTR Médio: ${c[7]}%, Inscritos Ganhos: ${c[4]}\n`;
            }
        } catch (e) { 
            console.error("Falha ao coletar dados do YouTube");
            relatorioTecnicoOficial += "\n(Alguns dados do YouTube não puderam ser carregados)\n";
        }
    }

    // 🧠 INTELIGÊNCIA ARTIFICIAL (GEMINI)
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const modelName = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent")).name;

        const promptFinal = `${prompt}\n\n${relatorioTecnicoOficial}`;
        
        let contents = [{ parts: [{ text: promptFinal }] }];
        if (image) contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "IA sem resposta. Tente novamente." });

    } catch (err) {
        return res.status(500).json({ reply: "Erro de conexão com o motor da ApexiA. Verifique a VPN." });
    }
}
