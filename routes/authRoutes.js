const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const Servidor = require('../models/servidor');
const authMiddleware = require('../middlewares/auth');

router.post('/login', async (req, res) => {
  try {
    const { rf, senha, mfaToken } = req.body;
    
    if (!rf || !senha) {
      return res.status(400).json({ error: 'RF e senha são obrigatórios' });
    }

    const servidor = await Servidor.findOne({ rf });

    if (!servidor || !(await bcrypt.compare(senha, servidor.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!servidor.status_ativo) return res.status(403).json({ error: 'Conta inativa' });

    // Validação Multi-Fator (MFA)
    if (servidor.is_mfa_ativo) {
      if (!mfaToken) return res.status(401).json({ require_mfa: true, message: 'MFA obrigatório' });
      
      const tokenValid = speakeasy.totp.verify({
        secret: servidor.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1
      });

      if (!tokenValid) return res.status(401).json({ error: 'Token MFA inválido' });
    }

    const token = jwt.sign(
      { id: servidor._id, rf: servidor.rf, nome: servidor.nome, perfil: servidor.perfil },
      process.env.JWT_SECRET || 'chave-secreta-padrao',
      { expiresIn: '8h' }
    );

    res.json({ token, perfil: servidor.perfil, nome: servidor.nome });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno ao tentar realizar o login' });
  }
});

router.post('/mfa/generate', authMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: 'GestaoPatrimonio' });
    await Servidor.findByIdAndUpdate(req.user.id, { mfa_secret: secret.base32 });
    res.json({ secret: secret.base32, url: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar o segredo MFA' });
  }
});

module.exports = router;