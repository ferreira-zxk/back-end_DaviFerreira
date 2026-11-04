const express = require('express');
const auth = require('../controllers/authController');

const router = express.Router();

router.post('/cadastro', auth.cadastrar);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.get('/perfil', auth.autenticar, auth.perfil);

module.exports = router;