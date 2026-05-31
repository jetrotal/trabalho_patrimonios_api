const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { notFoundHandler, globalErrorHandler } = require('./errors/errors');

dotenv.config();
mongoose.set('strictQuery', false);

const app = express();

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Importação Antecipada de Models que são usados internamente
require('./models/log_auditoria'); 

// Importação das rotas
const patrimonioRouter = require('./routes/patrimonioRoutes');
const servidorRouter = require('./routes/servidorRoutes');
const movimentacaoRouter = require('./routes/movimentacaoRoutes');
const authRouter = require('./routes/authRoutes');
const dashboardRouter = require('./routes/dashboardRoutes');
const logRouter = require('./routes/logRoutes');
const setorRouter = require('./routes/setorRoutes');
const localidadeRouter = require('./routes/localidadeRoutes');

// Rotas Base
app.use('/auth', authRouter);
app.use('/patrimonios', patrimonioRouter);
app.use('/servidores', servidorRouter);
app.use('/movimentacoes', movimentacaoRouter);
app.use('/dashboard', dashboardRouter);
app.use('/logs', logRouter);
app.use('/setores', setorRouter);
app.use('/localidades', localidadeRouter);

// Middlewares de Tratamento de Erro
app.use(notFoundHandler);     // Se nenhuma rota bater
app.use(globalErrorHandler);  // Se qualquer rota der 'throw err' ou next(err)

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI); // options removidas
} else {
  console.warn('⚠️  AVISO: MONGODB_URI não está definido. Testes podem falhar.');
}

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erro de conexão ao MongoDB:'));
db.once('open', () => console.log('Conectado ao MongoDB Atlas/Local!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

app.get('/ping', (req, res) => {
    res.status(200).send('Servidor acordado!');
});

module.exports = app;