const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const Usuario = require('../models/usuario');
const bcrypt=require('bcryptjs');
const Empresa = require('../models/empresa');
const Viejos = require('../models/Viejos');

const crearEmpresa= async(req,res = response) =>{
    const {mail,pass}=req.body;

    try {
        const flagcc=checkCuilCuit(req.body.cuil_cuit);
        if(!flagcc){
            return res.status(400).json({
                ok:false,
                msg:'Cuil/Cuit invalido'
            });
        }
        const existeEmail= await Usuario.findOne({mail});
        if(existeEmail){
            return res.status(400).json({
                ok:false,
                msg:'Ya existe una cuenta con ese e-mail'
            });
        }
        const existeEmail2= await Empresa.findOne({mail});
        if(existeEmail2){
            return res.status(400).json({
                ok:false,
                msg:'Ya existe una cuenta con ese e-mail'
            });
        }

        const empresa= new Empresa(req.body);

        const salt=bcrypt.genSaltSync();
        empresa.pass=bcrypt.hashSync(pass,salt);
        empresa.habilitado=false;
        empresa.validado=false;

        let date_time=new Date();
        let date=("0" + date_time.getDate()).slice(-2);
        let month=("0" + (date_time.getMonth() + 1)).slice(-2);
        let year=date_time.getFullYear();
        let hours=date_time.getHours();
        let minutes=date_time.getMinutes();
        let fecha=date+"-"+month+"-"+year+" "+hours+":"+minutes;   
        empresa.ultima_conexion=fecha
        
        await empresa.save();
        const token= await generarJWT(empresa.uid);

        res.json({
            ok:true,
            mail,
            token
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const crearUsuario= async(req,res = response) =>{
    const {mail,pass}=req.body;

    try {
        const flagcc=checkCuilCuit(req.body.cuil_cuit);
        if(!flagcc){
            return res.status(400).json({
                ok:false,
                msg:'Cuil/Cuit invalido'
            });
        }
        const existeEmail= await Usuario.findOne({mail});
        if(existeEmail){
            return res.status(400).json({
                ok:false,
                msg:'Ya existe una cuenta con ese e-mail'
            });
        }
        const existeEmail2= await Empresa.findOne({mail});
        if(existeEmail2){
            return res.status(400).json({
                ok:false,
                msg:'Ya existe una cuenta con ese e-mail'
            });
        }

        const usuario= new Usuario(req.body);

        const salt=bcrypt.genSaltSync();
        usuario.pass=bcrypt.hashSync(pass,salt);
        usuario.habilitado=false;
        usuario.validado=false; 
        usuario.ultima_conexion=timeNow();
        
        await usuario.save();
        const token= await generarJWT(usuario.uid);

        res.json({
            ok:true,
            mail,
            token
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const login=async(req,res=response)=>{
    const { mail, pass }= req.body;

    try {        
        let flag1, flag2= false;
        const usuarioDB= await Usuario.findOne({mail});    
        if(!usuarioDB){
            flag1=true
        }
        const usuarioDB2= await Empresa.findOne({mail});
        if(!usuarioDB2){
            flag2=true
        }
        if(flag1 && flag2){
            return res.status(404).json({
                ok:false,
                msg:'No se encontro un usuario con ese e-mail'
            })
        }

        let cuentaEncontrada;
        if(!flag1) cuentaEncontrada=usuarioDB;
        if(!flag2) cuentaEncontrada=usuarioDB2;

        const validPassword=bcrypt.compareSync(pass,cuentaEncontrada.pass);
        if(!validPassword){
            return res.status(400).json({
                ok:false,
                msg:'Contraseña incorrecta'
            })
        }

        const token= await generarJWT(cuentaEncontrada.id);
        if(!cuentaEncontrada.validado || !cuentaEncontrada.habilitado){
            res.json({
                ok:false,
                validado: cuentaEncontrada.validado,
                habilitado: cuentaEncontrada.habilitado,
                mail: cuentaEncontrada.mail,
                token,
                user: cuentaEncontrada.nombre_comercial ? cuentaEncontrada.nombre_comercial : cuentaEncontrada.nombre_apellido
            })
        }else{
            res.json({
                ok:true,
                token,
                user: cuentaEncontrada.nombre_comercial ? cuentaEncontrada.nombre_comercial : cuentaEncontrada.nombre_apellido
            })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error login'
        });
    }
}

const renewToken= async(req,res=response)=>{    
    const _id=req.uid;
    const token= await generarJWT(_id);
    const empDB= await Empresa.findById(_id)
    const userDB= await Usuario.findById(_id)

    if(!empDB && !userDB){
        res.json({
            ok:false
        })
    }else{
        let nombre, email;
        if(empDB){
            let {nombre_comercial, mail}=empDB
            nombre=nombre_comercial;
            email=mail;
        }
        if(userDB){
            let {nombre_apellido, mail}=userDB
            nombre=nombre_apellido;
            email=mail;
        }
        res.json({
            ok:true,
            token,
            nombre,
            email
        })
    }
}

const checkCuilCuit=(cc)=>{		
    var rv = false;
    var resultado = 0;
    var cc_nro = cc.replace("-", "");
    var codes = "6789456789";
    var verificador = parseInt(cc_nro[cc_nro.length-1]);
    var x = 0;
    
    while (x < 10){
        var digitoValidador = parseInt(codes.substring(x, x+1));
        if (isNaN(digitoValidador)) digitoValidador = 0;
        var digito = parseInt(cc_nro.substring(x, x+1));
        if (isNaN(digito)) digito = 0;
        var digitoValidacion = digitoValidador * digito;
        resultado += digitoValidacion;
        x++;
    }
    resultado = resultado % 11;
    rv = (resultado == verificador);
    return rv;
}

const timeNow=()=>{
    let date_time=new Date();
    let date=("0" + date_time.getDate()).slice(-2);
    let month=("0" + (date_time.getMonth() + 1)).slice(-2);
    let year=date_time.getFullYear();
    let hours=date_time.getHours();
    let minutes=date_time.getMinutes();
    let fecha=date+"-"+month+"-"+year+" "+hours+":"+minutes;

    return fecha;
}

module.exports={crearEmpresa, crearUsuario, login, renewToken}