const express = require('express');
const router = express.Router();
const Localidade = require('../models/localidade');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.get('/', auth, async (req, res) => {
  try { res.json(await Localidade.find().populate('id_setor', 'nome_setor')); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, rbac(['Administrador']), async (req, res) => {
  try { res.status(201).json(await Localidade.create(req.body)); } 
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;