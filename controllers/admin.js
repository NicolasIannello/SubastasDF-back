const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');

const login=async(req,res=response)=>{
    const { user, pass }= req.body;
    try {        
        const adminDB= await Admin.findOne({usuario:user});    
        if(!adminDB){
            return res.status(404).json({
                ok:false,
                msg:'No se encontro un usuario'
            })
        }

        const validPassword=bcrypt.compareSync(pass,adminDB.pass);
        if(!validPassword){
            return res.status(400).json({
                ok:false,
                msg:'Contraseña incorrecta'
            })
        }

        const token= await generarJWT(adminDB.id,1);
        
        res.json({
            ok:true,
            token,
            user: adminDB.usuario
        })
        
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
    const token= await generarJWT(_id,1);
    const adminDB= await Admin.findById(_id)

    if(!adminDB){
        res.json({
            ok:false
        })
    }else{
        res.json({
            ok:true,
            token,
            user: adminDB.usuario,
        })
    }
}

module.exports={ login, renewToken }