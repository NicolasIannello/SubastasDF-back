const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos, validarTipoUser } = require('../middlewares/validar-campos');
const { login, renewToken, validarCuenta, cambiarPass, sendCambio, crearUsuario } = require('../controllers/usuario');
const { validarJWT } = require('../middlewares/validar-jwt');

const router=Router();

router.post('/crearUsuario', [
    check('nombre_apellido','campo obligatorio').not().isEmpty(),
    check('cuil_cuit','campo obligatorio').not().isEmpty(),
    check('telefono','telefono no valido').isMobilePhone(),
    check('actividad','campo obligatorio').not().isEmpty(),
    check('mail','mail no valido').isEmail(),
    check('pass','campo obligatorio').not().isEmpty(),
    check('pais','campo obligatorio').not().isEmpty(),
    check('provincia','campo obligatorio').not().isEmpty(),
    check('ciudad','campo obligatorio').not().isEmpty(),
    check('postal','campo obligatorio').not().isEmpty(),
    check('domicilio','campo obligatorio').not().isEmpty(),
    validarCampos,
    validarTipoUser
],crearUsuario);

router.post('/login', [
    check('mail').isEmail(),
    check('pass','el campo es obligatorio').not().isEmpty(),
    validarCampos
],login);

router.post('/renew', validarJWT, renewToken);

router.post('/verificar', validarJWT, validarCuenta);

router.post('/sendCambio',[
    check('mail').isEmail(),
    validarCampos,
], sendCambio);

router.post('/cambiarPass',[
    check('pass','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], cambiarPass);

module.exports=router;