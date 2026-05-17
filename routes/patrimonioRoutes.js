const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Patrimonio = require('../models/patrimonio');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.get('/', auth, async (req, res) => {
  try {
    const patrimonios = await Patrimonio.find({ status_ativo: true }).populate('id_local', 'nome_local');
    res.json(patrimonios);
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
    if (!res.patrimonio.status_ativo) {
      return res.status(400).json({ error: 'Este patrimônio já foi inativado.' });
    }
    
    if (!res.patrimonio.is_disponivel) {
      return res.status(400).json({ error: 'Não é possível excluir um patrimônio que está emprestado ou indisponível.' });
    }

    res.patrimonio.status_ativo = false;
    res.patrimonio.is_disponivel = false; 
    res.patrimonio.$locals.user = req.user.id;
    
    await res.patrimonio.save();
    res.json({ status: 'success', message: 'Patrimônio inativado (soft delete) com sucesso e log registrado.' });
  } catch (err) {
    next(err); 
  }
});

// Busca patrimônios inativados (Lixeira)
router.get('/inativos/listar', auth, rbac(['Administrador']), async (req, res) => {
  try {
    const patrimonios = await Patrimonio.find({ status_ativo: false }).populate('id_local', 'nome_local');
    res.json(patrimonios);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Restaura patrimônio da Lixeira
router.put('/:id/restaurar', auth, rbac(['Administrador']), getPatrimonio, async (req, res) => {
  try {
    if (res.patrimonio.status_ativo) return res.status(400).json({ message: 'Ativo já está regular.' });
    
    res.patrimonio.status_ativo = true;
    res.patrimonio.is_disponivel = true;
    res.patrimonio.$locals.user = req.user.id; 
    
    await res.patrimonio.save();
    res.json({ status: 'success', message: 'Patrimônio restaurado com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getPatrimonio(req, res, next) {
  try {
    const isValId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isValId 
        ? { $or:[{ _id: req.params.id }, { cod_pt: req.params.id }] }
        : { cod_pt: req.params.id };

    let dQuery = Patrimonio.findOne(query);
    if (req.method === 'GET') {
        dQuery = dQuery.populate('id_local', 'nome_local');
    }
    const patrimonio = await dQuery;

    if (patrimonio == null) return res.status(404).json({ message: 'Patrimônio não encontrado' });
    
    res.patrimonio = patrimonio;
    next();
  } catch (err) { 
    return res.status(500).json({ message: err.message }); 
  }
}

module.exports = router;
