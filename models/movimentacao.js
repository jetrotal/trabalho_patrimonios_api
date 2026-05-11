const mongoose = require('mongoose');

const movimentacaoSchema = new mongoose.Schema({
  cod_pt: { type: mongoose.Schema.Types.ObjectId, ref: 'Patrimonio', required: true },
  rf_cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Servidor', required: true },
  rf_responsavel_saida: { type: mongoose.Schema.Types.ObjectId, ref: 'Servidor', required: true },
  id_local_destino: { type: mongoose.Schema.Types.ObjectId, ref: 'Localidade', required: true },
  data_hora_saida: { type: Date, default: Date.now },
  observacao_saida: { type: String },
  foto_estado_saida: { type: String, required: true },
  rf_responsavel_retorno: { type: mongoose.Schema.Types.ObjectId, ref: 'Servidor' },
  data_hora_retorno: { type: Date },
  observacao_retorno: { type: String }
});

module.exports = mongoose.model('Movimentacao', movimentacaoSchema);
