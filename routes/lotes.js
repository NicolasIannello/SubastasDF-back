const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { crearLote, getLotes, lote, getArchivo, deleteLote } = require('../controllers/lote');
const expressFileUpload =require('express-fileupload');

const router=Router();

router.use(expressFileUpload());

router.post('/crearLote', [
    check('titulo','el campo es obligatorio').not().isEmpty(),
    check('descripcion','el campo es obligatorio').not().isEmpty(),
    check('moneda','el campo es obligatorio').not().isEmpty(),
    check('precio_base','el campo es obligatorio').not().isEmpty(),
    check('incremento','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], crearLote);

router.post('/lotes', [
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], getLotes);

router.post('/lote', [
    check('uuid','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], lote);

router.post('/borrarLote', [
    check('uuid','el campo es obligatorio').not().isEmpty(),
    check('token','el campo es obligatorio').not().isEmpty(),
    check('tipo','el campo es obligatorio').not().isEmpty(),
    validarCampos,
    validarJWT
], deleteLote);

router.get('/img', getArchivo);

module.exports=router;