export default async function handler(req, res) {
    // 1. Configurar Permissões (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { prompt, image, accessToken, videoId } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) return res.status(500).json({ reply: "🚨 ERRO: GEMINI_API_KEY não configurada na Vercel." });

    let relatorioTecnico = "";
    const hoje = new Date().toISOString().split('T')[0];
    const dataInicio = "2020-01-01";

    // 🚀 MOTOR 1: AUDITORIA REAL DO YOUTUBE
    if (accessToken) {
        try {
            // Se houver ID de vídeo, busca dados do vídeo específico
            if (videoId) {
                const vUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr&dimensions=video&filters=video==${videoId}`;
                const vRes = await fetch(vUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                const vData = await vRes.json();
                if (vData.rows?.[0]) {
                    const r = vData.rows[0];
                    relatorioTecnico += `\n--- [DADOS DO VÍDEO SELECIONADO] ---\nViews: ${r[1]}\nRetenção: ${r[3]}%\nCTR: ${r[5]}%\n`;
                }
            }

            // Busca dados gerais do canal para contexto
            const cUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${dataInicio}&endDate=${hoje}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,impressions,impressionsCtr`;
            const cRes = await fetch(cUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const cData = await cRes.json();
            if (cData.rows?.[0]) {
                const c = cData.rows[0];
                relatorioTecnico += `\n--- [STATUS GERAL DO CANAL] ---\nTotal Views: ${c[0]}\nRetenção Média: ${c[3]}%\nInscritos Ganhos: ${c[4]}\nInscritos Perdidos: ${c[5]}\nCTR Médio: ${c[7]}%\n------------------------------\n`;
            }
        } catch (e) {
            console.error("Erro no YouTube Analytics:", e);
            relatorioTecnico += "\n(Aviso: Algumas métricas do YouTube não puderam ser extraídas agora)\n";
        }
    }

    try {
        // 🚀 MOTOR 2: DESCOBERTA DE MODELO E GERAÇÃO
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (listResponse.status === 429) {
            return res.status(429).json({ reply: "🚨 LIMITE DE TARIFA: O Google Gemini atingiu o limite de requisições gratuitas por hoje. Tente novamente em alguns minutos." });
        }

        // Procura um modelo compatível (Flash ou Pro)
        const modelo = listData.models?.find(m => m.supportedGenerationMethods.includes("generateContent"))?.name || "models/gemini-1.5-flash";

        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelo}:generateContent?key=${API_KEY}`;
        
        // Injeta os dados técnicos no fim do prompt
        const promptFinal = `${prompt}\n\n[DADOS TÉCNICOS REAIS]:\n${relatorioTecnico}`;

        let contents = [{ parts: [{ text: promptFinal }] }];
        
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
        
        if (response.status === 429) {
            return res.status(429).json({ reply: "🚨 LIMITE DE TARIFA: O sistema atingiu o limite de tokens. Aguarde um momento." });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "O Mentor Supremo está a processar os dados... por favor, tente enviar novamente.";
        
        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ reply: "❌ ERRO DE CONEXÃO: Ocorreu uma falha na comunicação entre a ApexiA e o Google. Verifique sua VPN se estiver em Angola." });
    }
}
