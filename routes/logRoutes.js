const express = require('express');
const router = express.Router();
const LogAuditoria = require('../models/log_auditoria');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

// Somente a gestão pode ver o Log de Auditoria
router.get('/', auth, rbac(['Administrador', 'Gerente']), async (req, res) => {
  try {
    const logs = await LogAuditoria.find()
      .populate('cod_pt', 'cod_pt descricao')
      .populate('rf_servidor_editor', 'nome rf')
      .sort({ data_hora_alteracao: -1 });
    
    const logsSafe = logs.map(log => {
      const logObj = log.toObject();
      logObj.cod_pt = logObj.cod_pt || { cod_pt: 'DELETADO', descricao: 'Ativo Inexistente' };
      logObj.rf_servidor_editor = logObj.rf_servidor_editor || { nome: 'Usuário Removido', rf: '---' };
      return logObj;
    });

    res.json(logsSafe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;