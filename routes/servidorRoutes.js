const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const Servidor = require('../models/servidor');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.post('/setup', async (req, res) => {
  try {
    const total = await Servidor.countDocuments();
    if (total > 0) return res.status(403).json({ error: 'Setup já foi realizado.' });
    
    const admin = await Servidor.create({ ...req.body, perfil: 'Administrador' });
    const response = admin.toObject();
    delete response.senha;
    
    res.status(201).json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Apenas 'Administrador' pode criar ou gerenciar servidores
router.post('/', auth, rbac(['Administrador']), async (req, res) => {
  try {
    const dadosServidor = { ...req.body };
    let otpauth_url = null;

    // Se o painel mandou ativar MFA, geramos o Secret na hora (Ref. Tela 5)
    if (dadosServidor.is_mfa_ativo) {
      const secret = speakeasy.generateSecret({ name: `GestaoPatrimonio (${dadosServidor.rf})` });
      dadosServidor.mfa_secret = secret.base32;
      otpauth_url = secret.otpauth_url;
    }

    const servidor = await Servidor.create(dadosServidor);
    
    // Evita devolver a senha pro cliente
    const svrResponse = servidor.toObject();
    delete svrResponse.senha;
    
    // Devolve a URL do QR Code apenas na resposta de criação
    if (otpauth_url) svrResponse.mfa_setup_url = otpauth_url; 

    res.status(201).json(svrResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const servidores = await Servidor.find()
      .select('-senha -mfa_secret')
      .populate('id_setor', 'nome_setor');
    res.json(servidores);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar servidores' });
  }
});

module.exports = router;