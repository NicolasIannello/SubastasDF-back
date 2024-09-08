const { Router }=require('express');
const { check }=require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { crearEmpresa } = require('../controllers/usuario');

const router=Router();

router.post('/crearEmp', [
    check('nombre_comercial','campo obligatorio').not().isEmpty(),
    check('cuil_cuit','campo obligatorio').not().isEmpty(),
    check('telefono','telefono no valido').isMobilePhone(),
    check('actividad','campo obligatorio').not().isEmpty(),
    check('razon_social','campo obligatorio').not().isEmpty(),
    check('persona_responsable','campo obligatorio').not().isEmpty(),
    check('mail','mail no valido').isEmail(),
    check('pass','campo obligatorio').not().isEmpty(),
    check('pais','campo obligatorio').not().isEmpty(),
    check('provincia','campo obligatorio').not().isEmpty(),
    check('ciudad','campo obligatorio').not().isEmpty(),
    check('postal','campo obligatorio').not().isEmpty(),
    check('domicilio','campo obligatorio').not().isEmpty(),
    validarCampos
],crearEmpresa);

module.exports=router;