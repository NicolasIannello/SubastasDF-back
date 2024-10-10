const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { crearEvento, getEventos, agregarLotes, quitarLote, getEvento, actualizarEvento, imgEvento, eliminarEvento } = require('../controllers/evento');
const expressFileUpload =require('express-fileupload');

const router=Router();

router.use(expressFileUpload());

router.post('/crearEvento', [
    check('nombre','el campo es obligatorio').not().isEmpty(),
    check('categoria','el campo es obligatorio').not().isEmpty(),
    check('fecha_inicio','el campo es obligatorio').not().isEmpty(),
    check('fecha_cierre','el campo es obligatorio').not().isEmpty(),
    check('modalidad','el campo es obligatorio').not().isEmpty(),
    check('publicar_cierre','el campo es obligatorio').not().isEmpty(),
    check('inicio_automatico','el campo es obligatorio').not().isEmpty(),
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

router.post('/agregarLotes', [
    check('evento','el campo es obligatorio').not().isEmpty(),
    check('lotes','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], agregarLotes);

router.post('/quitarLote', [
    check('lote','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], quitarLote);

router.post('/getEvento', [
    check('dato','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], getEvento);

router.post('/actualizarEvento', [
    check('uuid','el campo es obligatorio').not().isEmpty(),
    check('campos','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], actualizarEvento);

router.post('/img', [
    check('uuid','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], imgEvento);

router.post('/borrarEvento', [
    check('uuid','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], eliminarEvento);

module.exports=router;