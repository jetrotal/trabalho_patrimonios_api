const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const [, token] = authHeader.split(' ');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'chave-secreta-padrao');
    req.user = payload; // { id, rf, perfil }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
