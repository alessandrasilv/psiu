const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Conexão direta com o MySQL do Docker
const db = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'ale',
    password: '123456',
    database: 'psiu'
});

// 1. Rota de Login com logs detalhados
app.post('/psiu/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const [rows] = await db.query('SELECT id, nome, email, classe FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }
        res.json({ message: 'Login com sucesso!', usuario: rows[0] });
    } catch (err) {
        console.error('❌ ERRO NO MYSQL DURANTE O LOGIN:', err.message);
        res.status(500).json({ message: `Erro no banco de dados: ${err.message}` });
    }
});

// 2. Cadastrar Médico
app.post('/psiu/cadastro-medico', async (req, res) => {
    const { nome, email, crm, senha } = req.body;
    try {
        await db.query(
            'INSERT INTO usuarios (nome, email, crm, senha, classe) VALUES (?, ?, ?, ?, "medico")',
            [nome, email, crm, senha || '123456']
        );
        res.json({ message: 'Médico cadastrado com sucesso!' });
    } catch (err) {
        console.error('❌ ERRO AO CADASTRAR MÉDICO:', err.message);
        res.status(400).json({ message: 'Erro ao cadastrar médico.' });
    }
});

// 3. Listar Pacientes
app.get('/psiu/pacientes', async (req, res) => {
    try {
        const [pacientes] = await db.query("SELECT id, nome, email FROM usuarios WHERE classe = 'paciente'");
        res.json(pacientes);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar pacientes.' });
    }
});

// 4. Salvar Prontuário
app.post('/psiu/prontuario', async (req, res) => {
    const { pacienteID, medicoID, anotacoes } = req.body;
    try {
        await db.query(
            'INSERT INTO evolucoes (paciente_id, medico_id, anotacoes) VALUES (?, ?, ?)',
            [pacienteID, medicoID, anotacoes]
        );
        res.json({ message: 'Prontuário salvo com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar no prontuário.' });
    }
});

// 5. Timeline de Evoluções
app.get('/psiu/evolucao/:pacienteId', async (req, res) => {
    try {
        const [registros] = await db.query(`
            SELECT e.id, e.anotacoes, e.created_at as data, u.nome as medico
            FROM evolucoes e
            JOIN usuarios u ON e.medico_id = u.id
            WHERE e.paciente_id = ?
            ORDER BY e.created_at DESC
        `, [req.params.pacienteId]);
        res.json(registros);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao carregar histórico.' });
    }
});

app.listen(3000, () => console.log('🚀 Servidor Psiu rodando em http://localhost:3000'));