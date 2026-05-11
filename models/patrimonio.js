const mongoose = require('mongoose');

const patrimonioSchema = new mongoose.Schema({
  cod_pt: { type: String, required: true, unique: true },
  num_serie: { type: String, required: true },
  descricao: { type: String, required: true },
  foto_url: { type: String },
  is_disponivel: { type: Boolean, default: true },
  status_ativo: { type: Boolean, default: true },
  id_local: { type: mongoose.Schema.Types.ObjectId, ref: 'Localidade' }
});

patrimonioSchema.pre('save', async function(next) {
  if (!this.isNew) {
    if (!this.$locals.user) {
      return next(new Error('SISTEMA DE AUDITORIA: Tentativa de alteração de registro sem autoria. Operação bloqueada.'));
    }

    const LogAuditoria = mongoose.model('LogAuditoria');
    const docOriginal = await mongoose.model('Patrimonio').findById(this._id).lean();
    
    if (docOriginal) {
      const modifiedPaths = this.modifiedPaths();
      for (const campo of modifiedPaths) {
        if (campo !== '__v' && campo !== 'updatedAt') {

          const valAntigo = (docOriginal[campo] !== undefined && docOriginal[campo] !== null) ? docOriginal[campo].toString() : 'Vazio';
          const valNovo = (this[campo] !== undefined && this[campo] !== null) ? this[campo].toString() : 'Vazio';

          if (valAntigo !== valNovo) {
            await LogAuditoria.create({
              cod_pt: this._id,
              rf_servidor_editor: this.$locals.user,
              campo_alterado: campo,
              valor_antigo: valAntigo,
              valor_novo: valNovo
            });
          }
        }
      }
    }
  }
  next();
});

module.exports = mongoose.model('Patrimonio', patrimonioSchema);
