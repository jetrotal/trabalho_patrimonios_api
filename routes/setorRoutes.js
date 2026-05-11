const express = require('express');
const router = express.Router();
const Setor = require('../models/setor');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac'); 

router.get('/', auth, async (req, res) => {
  try { res.json(await Setor.find()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, rbac(['Administrador']), async (req, res) => {
  try { res.status(201).json(await Setor.create(req.body)); } 
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;