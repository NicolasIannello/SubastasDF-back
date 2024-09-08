const { response }=require('express');
const { validationResult }=require('express-validator');

const validarCampos= (req,res=response,next)=>{

    const errores=validationResult(req);
    
    if( !errores.isEmpty() ){
        let datos="Campos: ";
        for (let i = 0; i < errores.array().length; i++) {
            datos+=errores.array()[i].param+" "
        }
        datos+="no validos."
        return res.status(400).json({
            ok:false,
            msg:datos
        })
    }

    next();
}

module.exports={ validarCampos }