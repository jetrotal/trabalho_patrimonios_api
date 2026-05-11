// Middleware para Rotas Inexistentes (404)
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'Rota não encontrada'
    });
};

// Middleware Global de Tratamento de Erros (500, 400, Conflitos de Banco)
const globalErrorHandler = (err, req, res, next) => {
    console.error(`[Erro da API]: ${err.message}`);

    // Tratamento de erros específicos do Mongoose (MongoDB)
    if (err.name === 'ValidationError') {
        return res.status(400).json({ status: 'error', message: err.message });
    }

    // Erro de Chave Duplicada (Ex: Tentar criar 2 patrimônios com mesmo cod_pt)
    if (err.code && err.code === 11000) {
        return res.status(409).json({ status: 'error', message: 'Registro duplicado encontrado no banco de dados.' });
    }

    // Erro de JWT Inválido/Expirado
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ status: 'error', message: 'Token de acesso inválido ou expirado.' });
    }

    // Fallback genérico (Erro Interno)
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor'
    });
};

module.exports = {
    notFoundHandler,
    globalErrorHandler
};