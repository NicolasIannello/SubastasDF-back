const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const Usuario = require('../models/usuario');
const bcrypt=require('bcryptjs');
const Empresa = require('../models/empresa');
const Viejos = require('../models/Viejos');

const crearEmpresa= async(req,res = response) =>{
    const {mail,pass}=req.body;

    try {
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
            // empresa,
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

module.exports={crearEmpresa}