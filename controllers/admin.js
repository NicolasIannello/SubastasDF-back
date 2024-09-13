const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');
const Usuario = require('../models/usuario');
const Empresa = require('../models/empresa');
const Viejos = require('../models/Viejos');

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

const getUsers= async(req,res=response) =>{
    const desde= req.query.desde || 0;
    const limit= req.query.limit || 10;
    const adminDB= await Admin.findById(req.uid)

    if(!adminDB){
        res.json({
            ok:false
        })
    }

    const [ users, totalU ]= await Promise.all([
        //Usuario.find({},{pass:0,__v:0}).skip(desde).limit(limit),
        Usuario.aggregate([
            { "$project": {
                "_id": 0,
                "nombre": "$nombre_apellido",
                "cuil_cuit":1,
                "telefono":1,
                "actividad":1,
                "como_encontro":1,
                "mail":1,
                "pais":1,
                "provincia":1,
                "ciudad":1,
                "postal":1,
                "domicilio":1,
                "habilitado":1,
                "ultima_conexion":1,
                "validado":1,
            }},
            { $addFields: { 'tipo': 'user' } }
        ]).skip(desde).limit(limit),
        Usuario.countDocuments()
    ]);
    const [ emps, totalE ]= await Promise.all([
        // Empresa.find().skip(desde).limit(limit),
        Empresa.aggregate([
            { "$project": {
                "_id": 0,
                "nombre": "$nombre_comercial",
                "razon_social": 1,
                "cuil_cuit": 1,
                "persona_responsable": 1,
                "telefono": 1,
                "actividad": 1,
                "como_encontro": 1,
                "mail": 1,
                "pass": 1,
                "pais": 1,
                "provincia": 1,
                "ciudad": 1,
                "postal": 1,
                "domicilio": 1,
                "habilitado": 1,
                "ultima_conexion": 1,
                "validado": 1,
            }},
            { $addFields: { 'tipo': 'emp' } }
        ]).skip(desde).limit(limit),
        Empresa.countDocuments()
    ]);
    const [ viejos, totalV ]= await Promise.all([
        // Viejos.find().skip(desde).limit(limit),
        Viejos.aggregate([{ $addFields: { 'tipo': 'viejo' } }]).skip(desde).limit(limit),
        Viejos.countDocuments()
    ]);
    let total=totalE+totalU+totalV;    
    
    res.json({
        ok:true,
        users,
        emps,
        viejos,
        total
    });
}

module.exports={ login, renewToken, getUsers }