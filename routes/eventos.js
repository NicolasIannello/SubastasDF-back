const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { crearEvento, getEventos } = require('../controllers/evento');

const router=Router();

router.post('/crearEvento', [
    check('nombre','el campo es obligatorio').not().isEmpty(),
    check('categoria','el campo es obligatorio').not().isEmpty(),
    check('fecha_inicio','el campo es obligatorio').isDate(),
    check('fecha_cierre','el campo es obligatorio').isDate(),
    check('modalidad','el campo es obligatorio').not().isEmpty(),
    check('publicar_cierre','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], crearEvento);

router.post('/eventos', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], getEventos);

module.exports=router;