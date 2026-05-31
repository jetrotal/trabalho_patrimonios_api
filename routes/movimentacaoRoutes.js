const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Movimentacao = require('../models/movimentacao');
const Patrimonio = require('../models/patrimonio');
const Servidor = require('../models/servidor'); 
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

// Saída via QR Code (Check-out)
router.post('/checkout', auth, rbac(['Gerente', 'Administrador']), async (req, res, next) => {
  const { cod_pt, rf_cliente, id_local_destino, observacao_saida, foto_estado_saida } = req.body;

  try {
    const isPtValId = mongoose.Types.ObjectId.isValid(cod_pt);
    
    // Busca tanto pelo ID interno do Mongo quanto pela string real
    const patrimonio = await Patrimonio.findOne(isPtValId 
        ? { $or:[{ _id: cod_pt }, { cod_pt: cod_pt }] }
        : { cod_pt: cod_pt });
    
    // Validações de negócio
    if (!patrimonio) throw new Error('Patrimônio não encontrado');
    if (patrimonio.status_ativo === false) throw new Error('Patrimônio inativo (deletado) no sistema');
    if (!patrimonio.is_disponivel) throw new Error('O bem selecionado não está disponível para empréstimo');
    if (!foto_estado_saida) throw new Error('A fotografia do estado físico é obrigatória (Regra Antifraude)');

    const isRfValId = mongoose.Types.ObjectId.isValid(rf_cliente);
    const servidorCliente = await Servidor.findOne(isRfValId 
        ? { $or:[{ _id: rf_cliente }, { rf: rf_cliente }] }
        : { rf: rf_cliente });
    
    if (!servidorCliente) throw new Error('Tomador (Servidor) não encontrado');
    if (servidorCliente.status_ativo === false) throw new Error('Tomador (Servidor) encontra-se inativo');

    // 1. Atualiza a disponibilidade do patrimônio
    patrimonio.is_disponivel = false;
    patrimonio.$locals.user = req.user.id; 
    await patrimonio.save();

    try {
        // 2. Cria a movimentação
        const mov = await Movimentacao.create({
          cod_pt: patrimonio._id,
          rf_cliente: servidorCliente._id,
          rf_responsavel_saida: req.user.id,
          id_local_destino,
          observacao_saida,
          foto_estado_saida
        });

        res.status(201).json({ status: 'success', data: mov });
    } catch(errMov) {
        // Fallback/Rollback
        patrimonio.is_disponivel = true;
        await patrimonio.save();
        throw errMov;
    }

  } catch (err) {
    if (err.name === 'Error') {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next(err); 
  }
});

// Devolução (Check-in)
router.post('/:id/checkin', auth, rbac(['Gerente', 'Administrador']), async (req, res, next) => {
  const { observacao_retorno } = req.body;

  try {
    const mov = await Movimentacao.findById(req.params.id);
    
    if (!mov || mov.data_hora_retorno) {
        throw new Error('Movimentação inválida, não encontrada ou já finalizada');
    }

    const pt = await Patrimonio.findById(mov.cod_pt);
    if (!pt) throw new Error('O Patrimônio atrelado a esta movimentação sumiu do banco de dados');

    // 1. Finaliza a movimentação
    mov.data_hora_retorno = new Date();
    mov.rf_responsavel_retorno = req.user.id;
    mov.observacao_retorno = observacao_retorno;
    await mov.save();

    // 2. Devolve o patrimônio à disponibilidade
    pt.is_disponivel = true;
    pt.$locals.user = req.user.id;
    await pt.save();

    res.json({ status: 'success', data: mov });

  } catch (err) {
    if (err.name === 'Error') {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next(err);
  }
});

// Listagem Geral
router.get('/', auth, async (req, res, next) => {
  try {
    const movimentacoes = await Movimentacao.find()
      .populate('cod_pt', 'cod_pt descricao')
      .populate('rf_cliente', 'nome rf')
      .populate('rf_responsavel_saida', 'nome') 
      .populate('rf_responsavel_retorno', 'nome')
      .populate('id_local_destino', 'nome_local')
      .sort({ data_hora_saida: -1 });
    
    res.json(movimentacoes);
  } catch (err) {
    next(err); 
  }
});

// Busca empréstimos ativos do próprio servidor
router.get('/minhas', auth, async (req, res, next) => {
  try {
    const movimentacoes = await Movimentacao.find({
      rf_cliente: req.user.id,
      $or: [{ data_hora_retorno: { $exists: false } }, { data_hora_retorno: null }]
    })
    .populate('cod_pt', 'cod_pt descricao foto_url')
    .populate('id_local_destino', 'nome_local')
    .sort({ data_hora_saida: -1 });
    
    res.json(movimentacoes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;