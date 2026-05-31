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

        const localidades = await Localidade.find().lean();
        
        const disponiveisAgrupados = await Patrimonio.aggregate([
            { $match: { status_ativo: true, is_disponivel: true } },
            { $group: { _id: "$id_local", count: { $sum: 1 } } }
        ]);

        const emprestadosAgrupados = await Movimentacao.aggregate([
            { $match: { $or: [{ data_hora_retorno: { $exists: false } }, { data_hora_retorno: null }] } },
            { $group: { _id: "$id_local_destino", count: { $sum: 1 } } }
        ]);

        const dispMap = {};
        disponiveisAgrupados.forEach(d => { if(d._id) dispMap[d._id.toString()] = d.count; });
        
        const empMap = {};
        emprestadosAgrupados.forEach(e => { if(e._id) empMap[e._id.toString()] = e.count; });

        const mapaLocalidades = localidades.map(loc => {
            const locId = loc._id.toString();
            const disp = dispMap[locId] || 0;
            const emp = empMap[locId] || 0;

            return {
                ...loc,
                quantidade_ativos: disp + emp
            };
        });

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