const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const servidorSchema = new mongoose.Schema({
  rf: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  nome: { type: String, required: true },
  perfil: { type: String, required: true, enum: ['Servidor Comum', 'Gerente', 'Administrador'] },
  status_ativo: { type: Boolean, default: true },
  mfa_secret: { type: String },
  is_mfa_ativo: { type: Boolean, default: false },
  id_setor: { type: mongoose.Schema.Types.ObjectId, ref: 'Setor' }
});

// Hook de encriptação da senha
servidorSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

module.exports = mongoose.model('Servidor', servidorSchema);
