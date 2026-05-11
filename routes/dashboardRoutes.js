const express = require('express');
const router = express.Router();
const Patrimonio = require('../models/patrimonio');
const Movimentacao = require('../models/movimentacao');
const Localidade = require('../models/localidade');
const auth = require('../middlewares/auth');

router.get('/', auth, async (req, res) => {
    try {
        const totalAtivos = await Patrimonio.countDocuments({ status_ativo: true });
        
        // Movimentações em aberto
        const emprestados = await Movimentacao.countDocuments({ 
            $or:[
                { data_hora_retorno: { $exists: false } },
                { data_hora_retorno: null }
            ]
        });
        
        const indisponiveis = await Patrimonio.countDocuments({ is_disponivel: false, status_ativo: true });
        const emManutencao = Math.max(0, indisponiveis - emprestados);

        // Mapa Geolocation
        const mapaLocalidades = await Localidade.aggregate([
            {
                $lookup: {
                    from: 'patrimonios',
                    localField: '_id',
                    foreignField: 'id_local',
                    as: 'patrimonios_alocados'
                }
            },
            {
                $project: {
                    nome_local: 1,
                    latitude: 1,
                    longitude: 1,
                    quantidade_ativos: { $size: "$patrimonios_alocados" }
                }
            }
        ]);

        res.json({
            indicadores: {
                total_ativos: totalAtivos,
                emprestados: emprestados,
                em_manutencao: emManutencao
            },
            mapa_localidades: mapaLocalidades
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;