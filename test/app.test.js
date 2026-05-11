const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Testes de Rotas de Patrimônios (Autenticadas)', () => {
  let token;

  // Antes de todos os testes, criamos um token JWT válido para um usuário "mock"
  beforeAll(() => {
    token = jwt.sign(
      { id: new mongoose.Types.ObjectId(), rf: '000000', perfil: 'Administrador' },
      process.env.JWT_SECRET || 'chave-secreta-padrao',
      { expiresIn: '1h' }
    );
  });

  // Fechar a conexão ao final para evitar open handles do Jest
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('Deve listar todos os patrimônios (GET /patrimonios)', async () => {
    const response = await request(app)
      .get('/patrimonios')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.statusCode).toEqual(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('Deve criar um novo patrimônio com campos válidos (POST /patrimonios)', async () => {
    const newPatrimonio = {
      cod_pt: `PT-${Math.floor(Math.random() * 10000)}`,
      num_serie: 'SN-9988776655',
      descricao: 'Notebook Dell Latitude 3420',
      foto_url: 'dell.jpg',
      is_disponivel: true
    };

    const response = await request(app)
      .post('/patrimonios')
      .set('Authorization', `Bearer ${token}`)
      .send(newPatrimonio);

    expect(response.statusCode).toEqual(201);
    expect(response.body).toHaveProperty('_id');
  });

  it('Deve retornar erro ao criar um novo patrimônio com campos inválidos (POST /patrimonios)', async () => {
    // Falta o campo 'descricao' que é required
    const invalidPatrimonio = {
      cod_pt: 'PT-1234',
      num_serie: 'SN-0000',
    };

    const response = await request(app)
      .post('/patrimonios')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidPatrimonio);

    expect(response.statusCode).toEqual(400);
    expect(response.body).toHaveProperty('message');
  });

  it('Deve retornar erro de Autenticação se não enviar o Token (GET /patrimonios)', async () => {
    const response = await request(app).get('/patrimonios');
    // rota protegida, status esperado é 401
    expect(response.statusCode).toEqual(401);
    expect(response.body).toHaveProperty('error');
  });

  it('Deve retornar erro ao acessar uma rota inexistente (GET /rota-inexistente)', async () => {
    const response = await request(app).get('/rota-inexistente');
    expect(response.statusCode).toEqual(404);
    expect(response.body).toHaveProperty('message');
  });

it('Deve carregar os indicadores do Dashboard (GET /dashboard)', async () => {
    const response = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.statusCode).toEqual(200);
    expect(response.body).toHaveProperty('indicadores');
    expect(response.body.indicadores).toHaveProperty('total_ativos');
  });

  it('Deve bloquear acesso aos logs para perfil sem permissão (GET /logs)', async () => {
    // "Servidor Comum" (que não tem permissão de ver logs)
    const tokenComum = jwt.sign(
      { id: new mongoose.Types.ObjectId(), rf: '111111', perfil: 'Servidor Comum' },
      process.env.JWT_SECRET || 'chave-secreta-padrao'
    );

    const response = await request(app)
      .get('/logs')
      .set('Authorization', `Bearer ${tokenComum}`);
      
    // RBAC deve barrar com 403 Forbidden
    expect(response.statusCode).toEqual(403);
    expect(response.body.error).toMatch(/Acesso negado/);
  });

  it('Deve bloquear a criação de patrimônio por um Servidor Comum (POST /patrimonios)', async () => {
    // Gerando um token de "Servidor Comum"
    const tokenComum = jwt.sign(
      { id: new mongoose.Types.ObjectId(), rf: '111111', perfil: 'Servidor Comum' },
      process.env.JWT_SECRET || 'chave-secreta-padrao'
    );

    const novoPatrimonio = {
      cod_pt: 'PT-TESTE-RBAC',
      num_serie: 'SN-0000',
      descricao: 'Cadeira de Teste',
      is_disponivel: true
    };

    const response = await request(app)
      .post('/patrimonios')
      .set('Authorization', `Bearer ${tokenComum}`) // Usando token sem privilégio
      .send(novoPatrimonio);
      
    // RBAC deve barrar a criação com 403 Forbidden
    expect(response.statusCode).toEqual(403);
    expect(response.body.error).toMatch(/Acesso negado/);
  });

});