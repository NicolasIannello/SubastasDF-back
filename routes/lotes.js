const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { crearLote } = require('../controllers/lote');
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

module.exports=router;