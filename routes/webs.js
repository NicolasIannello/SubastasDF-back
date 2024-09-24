const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { actualizarWeb, getWeb } = require('../controllers/web');

const router=Router();

router.post('/webs', getWeb);

router.post('/actualizarWeb', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    check('campo1','el campo es obligatorio').not().isEmpty(),
    check('campo2','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], actualizarWeb);

module.exports=router;