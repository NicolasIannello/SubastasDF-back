const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { ofertar, getDatos } = require('../controllers/oferta');

const router=Router();

router.post('/ofertar', [
    check('cantidad','el campo es obligatorio').not().isEmpty(),
    check('evento','el campo es obligatorio').not().isEmpty(),
    check('lote','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], ofertar);

router.post('/datos', [
    check('evento','el campo es obligatorio').not().isEmpty(),
    check('lote','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], getDatos);

module.exports=router;