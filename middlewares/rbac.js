// Middleware dinâmico para checagem de privilégios
module.exports = (rolesPermitidas) => {
    return (req, res, next) => {
      if (!req.user || !rolesPermitidas.includes(req.user.perfil)) {
        return res.status(403).json({ error: 'Acesso negado: Perfil sem permissão' });
      }
      next();
    };
  };