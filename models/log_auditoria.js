const mongoose = require('mongoose');

const logAuditoriaSchema = new mongoose.Schema({
  cod_pt: { type: mongoose.Schema.Types.ObjectId, ref: 'Patrimonio', required: true },
  rf_servidor_editor: { type: mongoose.Schema.Types.ObjectId, ref: 'Servidor', required: true },
  campo_alterado: { type: String, required: true },
  valor_antigo: { type: String },
  valor_novo: { type: String },
  data_hora_alteracao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LogAuditoria', logAuditoriaSchema);
