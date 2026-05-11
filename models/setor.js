const mongoose = require('mongoose');

const setorSchema = new mongoose.Schema({
  nome_setor: { type: String, required: true }
});

module.exports = mongoose.model('Setor', setorSchema);