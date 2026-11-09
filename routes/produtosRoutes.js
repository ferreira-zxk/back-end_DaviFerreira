const express = require('express');
const controller = require('../controllers/produtosController');
const autenticar = require('../middlewares/autenticar');

const router = express.Router();

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', autenticar, controller.criar);
router.put('/:id', autenticar, controller.atualizar);
router.delete('/:id', autenticar, controller.remover);

module.exports = router;