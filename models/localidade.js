const mongoose = require('mongoose');

const localidadeSchema = new mongoose.Schema({
  nome_local: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  id_setor: { type: mongoose.Schema.Types.ObjectId, ref: 'Setor', required: true }
});

module.exports = mongoose.model('Localidade', localidadeSchema);