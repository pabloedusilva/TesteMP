require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3003; // Porta teste

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota de teste simples
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!' });
});

// Rota para doações recentes (apoiadores em tempo real)
app.get('/recent-donations', (req, res) => {
  const query = `
    SELECT donor_name, amount, paid_at, status,
           ROW_NUMBER() OVER (ORDER BY amount DESC) as position
    FROM donations 
    WHERE status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 20
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar doações recentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar doações recentes' });
    }
    
    // Formatar dados para o slot
    const formattedDonations = rows.map((row, index) => ({
      name: row.donor_name || 'Apoiador Anônimo',
      amount: `R$ ${parseFloat(row.amount).toFixed(2).replace('.', ',')}`,
      position: index + 1,
      paid_at: row.paid_at
    }));
    
    res.json(formattedDonations);
  });
});

// Listar todas as rotas registradas
console.log('=== ROTAS REGISTRADAS ===');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor teste rodando na porta ${PORT}`);
  console.log(`📱 Teste: http://localhost:${PORT}/test`);
  console.log(`📱 Recent: http://localhost:${PORT}/recent-donations`);
});
