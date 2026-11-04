const express = require('express');
const path = require('path');
const produtosRoutes = require('./routes/produtosRoutes');
const authRoutes = require('./routes/authRoutes');        // ← NOVA
const repo = require('./dados/produtosRepositorio');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/produtos', produtosRoutes);
app.use('/auth', authRoutes);                              // ← NOVA

repo.iniciar()
  .then(() => {
    app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
  })
  .catch(erro => console.log('Erro ao abrir o banco de dados:', erro));