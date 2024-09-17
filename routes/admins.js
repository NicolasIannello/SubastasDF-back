const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { login, renewToken, getUsers, deleteUser, actualizarUser, crearAdmin } = require('../controllers/admin');

const router=Router();

router.post('/login', [
    check('user','el campo es obligatorio').not().isEmpty(),
    check('pass','el campo es obligatorio').not().isEmpty(),
    validarCampos
],login);

router.post('/renew', validarJWT, renewToken);

router.post('/users', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], getUsers);

router.post('/deleteUser', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('id','el campo es obligatorio').isMongoId(),
    validarCampos,
    validarJWT
], deleteUser);

router.post('/actualizarUser', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('id','el campo es obligatorio').isMongoId(),
    validarCampos,
    validarJWT
], actualizarUser);

router.post('/crearAdmin', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('usuario','el campo es obligatorio').not().isEmpty(),
    check('pass','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], crearAdmin);

module.exports=router;