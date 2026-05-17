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

    // Se o painel mandou ativar MFA, geramos o Secret na hora
    if (dadosServidor.is_mfa_ativo) {
      const secret = speakeasy.generateSecret({ name: `GestaoPatrimonio (${dadosServidor.rf})` });
      dadosServidor.mfa_secret = secret.base32;
      otpauth_url = secret.otpauth_url;
    }

    const servidor = await Servidor.create(dadosServidor);
    
    const svrResponse = servidor.toObject();
    delete svrResponse.senha;
    
    if (otpauth_url) svrResponse.mfa_setup_url = otpauth_url; 

    res.status(201).json(svrResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Atualiza um servidor existente (Apenas Administrador)
router.put('/:id', auth, rbac(['Administrador']), async (req, res) => {
  try {
    const servidor = await Servidor.findById(req.params.id);
    if (!servidor) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const dadosAtualizacao = { ...req.body };
    
    // Proteção: Nunca alterar o RF (Chave de Login Funcional) por edição comum
    delete dadosAtualizacao.rf;

    // Se a senha vier vazia do front-end, removemos para não sobrescrever
    if (!dadosAtualizacao.senha) {
      delete dadosAtualizacao.senha;
    }

    let otpauth_url = null;

    // Se o admin reativar o MFA, geramos um novo código
    if (dadosAtualizacao.is_mfa_ativo === true && !servidor.is_mfa_ativo) {
      const secret = speakeasy.generateSecret({ name: `GestaoPatrimonio (${servidor.rf})` });
      dadosAtualizacao.mfa_secret = secret.base32;
      otpauth_url = secret.otpauth_url;
    }

    // Usamos Object.assign e .save() para disparar o gatilho de HASH de senha no Model
    Object.assign(servidor, dadosAtualizacao);
    await servidor.save();

    const svrResponse = servidor.toObject();
    delete svrResponse.senha;
    
    if (otpauth_url) {
      svrResponse.mfa_setup_url = otpauth_url; 
    }

    res.json(svrResponse);
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

// Busca os dados do próprio servidor logado
router.get('/me', auth, async (req, res) => {
  try {
    const servidor = await Servidor.findById(req.user.id)
        .select('-senha -mfa_secret')
        .populate('id_setor', 'nome_setor');
    res.json(servidor);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Atualiza a própria senha
router.put('/me/senha', auth, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const servidor = await Servidor.findById(req.user.id);
    const bcrypt = require('bcrypt');
    
    if (!(await bcrypt.compare(senha_atual, servidor.senha))) {
      return res.status(401).json({ error: 'Sua senha atual está incorreta.' });
    }
    
    servidor.senha = nova_senha;
    await servidor.save();
    res.json({ status: 'success', message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ativa/Desativa o próprio MFA
router.put('/me/mfa', auth, async (req, res) => {
  try {
    const { is_mfa_ativo } = req.body;
    await Servidor.findByIdAndUpdate(req.user.id, { is_mfa_ativo });
    res.json({ status: 'success', message: 'Status do MFA atualizado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;