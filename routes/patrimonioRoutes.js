const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Patrimonio = require('../models/patrimonio');
const Movimentacao = require('../models/movimentacao');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.get('/', auth, async (req, res) => {
  try {
    const patrimonios = await Patrimonio.find({ status_ativo: true }).populate('id_local', 'nome_local').lean();
    
    const movsAbertas = await Movimentacao.find({
        $or: [{ data_hora_retorno: { $exists: false } }, { data_hora_retorno: null }]
    }).populate('id_local_destino', 'nome_local').lean();

    const mapMovs = {};
    for (const m of movsAbertas) {
        if (m.cod_pt && m.id_local_destino) {
            mapMovs[m.cod_pt.toString()] = m.id_local_destino.nome_local;
        }
    }

    const resultado = patrimonios.map(pt => {
        let local_atual = pt.id_local ? pt.id_local.nome_local : 'Não alocado';
        if (!pt.is_disponivel && mapMovs[pt._id.toString()]) {
            local_atual = mapMovs[pt._id.toString()];
        }
        return { ...pt, local_atual };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, getPatrimonio, (req, res) => { res.json(res.patrimonio); });

router.post('/', auth, rbac(['Administrador', 'Gerente']), async (req, res) => {
  const patrimonio = new Patrimonio(req.body);
  try {
    const newPatrimonio = await patrimonio.save();
    res.status(201).json(newPatrimonio);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, rbac(['Administrador', 'Gerente']), getPatrimonio, async (req, res) => {
  
  const emprestimoAberto = await Movimentacao.findOne({
      cod_pt: res.patrimonio._id,
      $or: [{ data_hora_retorno: { $exists: false } }, { data_hora_retorno: null }]
  });

  if (emprestimoAberto) {
      return res.status(400).json({ message: 'Edição bloqueada. Este patrimônio encontra-se emprestado/em uso no momento.' });
  }

  const { _id, cod_pt, ...safeUpdates } = req.body;
  
  Object.assign(res.patrimonio, safeUpdates);
  res.patrimonio.$locals.user = req.user.id; 

  try {
    const updated = await res.patrimonio.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, rbac(['Administrador']), getPatrimonio, async (req, res, next) => {
  try {
    if (!res.patrimonio.status_ativo) return res.status(400).json({ error: 'Este patrimônio já foi inativado.' });
    
    const emprestimoAberto = await Movimentacao.findOne({
        cod_pt: res.patrimonio._id,
        $or: [{ data_hora_retorno: { $exists: false } }, { data_hora_retorno: null }]
    });

    if (emprestimoAberto) {
        return res.status(400).json({ error: 'Não é possível excluir um patrimônio que está emprestado para um servidor no momento.' });
    }

    res.patrimonio.status_ativo = false;
    res.patrimonio.is_disponivel = false; 
    res.patrimonio.$locals.user = req.user.id;
    
    await res.patrimonio.save();
    res.json({ status: 'success', message: 'Patrimônio inativado (soft delete) com sucesso.' });
  } catch (err) {
    next(err); 
  }
});

router.get('/inativos/listar', auth, rbac(['Administrador']), async (req, res) => {
  try {
    const patrimonios = await Patrimonio.find({ status_ativo: false }).populate('id_local', 'nome_local');
    res.json(patrimonios);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/restaurar', auth, rbac(['Administrador']), getPatrimonio, async (req, res) => {
  try {
    if (res.patrimonio.status_ativo) return res.status(400).json({ message: 'Ativo já está regular.' });
    res.patrimonio.status_ativo = true;
    res.patrimonio.is_disponivel = true;
    res.patrimonio.$locals.user = req.user.id; 
    await res.patrimonio.save();
    res.json({ status: 'success', message: 'Patrimônio restaurado com sucesso.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

async function getPatrimonio(req, res, next) {
  try {
    const isValId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isValId 
        ? { $or:[{ _id: req.params.id }, { cod_pt: req.params.id }] }
        : { cod_pt: req.params.id };

    let dQuery = Patrimonio.findOne(query);
    if (req.method === 'GET') dQuery = dQuery.populate('id_local', 'nome_local');
    
    const patrimonio = await dQuery;
    if (patrimonio == null) return res.status(404).json({ message: 'Patrimônio não encontrado' });
    res.patrimonio = patrimonio;
    next();
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

module.exports = router;
