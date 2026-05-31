const express = require('express');
const router = express.Router();
const Localidade = require('../models/localidade');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.get('/', auth, async (req, res) => {
  try { res.json(await Localidade.find().populate('id_setor', 'nome_setor')); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, rbac(['Administrador', 'Gerente']), async (req, res) => { 
  try { 
    if (req.user.perfil === 'Gerente') {
          req.body.id_setor = req.user.id_setor;
      }
      res.status(201).json(await Localidade.create(req.body)); 
  } 
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, rbac(['Administrador', 'Gerente']), async (req, res) => {
  try { 
    if (req.user.perfil === 'Gerente') {
          req.body.id_setor = req.user.id_setor;
      }
      res.json(await Localidade.findByIdAndUpdate(req.params.id, req.body, { new: true })); 
  } 
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, rbac(['Administrador']), async (req, res) => {
  try { 
    await Localidade.findByIdAndDelete(req.params.id);
    res.json({ status: 'success' }); 
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;