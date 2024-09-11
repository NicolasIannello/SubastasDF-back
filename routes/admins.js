const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { login, renewToken } = require('../controllers/admin');

const router=Router();

router.post('/login', [
    check('user','el campo es obligatorio').not().isEmpty(),
    check('pass','el campo es obligatorio').not().isEmpty(),
    validarCampos
],login);

router.post('/renew', validarJWT, renewToken);

module.exports=router;