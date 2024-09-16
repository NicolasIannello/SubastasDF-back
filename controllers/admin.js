const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');
const Usuario = require('../models/usuario');
const Empresa = require('../models/empresa');

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
    const desde= parseInt(req.query.desde) || 0;
    const limit= parseInt(req.query.limit) || 20;
    const adminDB= await Admin.findById(req.uid)

    if(!adminDB){
        res.json({
            ok:false
        })
    }

    const [ users, total ]= await Promise.all([
        Usuario.aggregate([
            { $project: {
                __v: 0,
                "__v": 0,
                "pass": 0,
            } },
            { $lookup: {
                from: "empresas",
                localField: "mail",
                foreignField: "mail",
                as: "dato_empresa"
            } },
            {$unwind: { path: "$dato_empresa", preserveNullAndEmptyArrays: true }},
            { $project: {
                __v: 0,
                "dato_empresa.__v": 0,
                "dato_empresa.mail": 0,
                "dato_empresa._id": 0,
            } },
            { $skip: desde },
            { $limit: limit },
        ]),
        Usuario.countDocuments()
    ]); 
    
    res.json({
        ok:true,
        users,
        total
    });
}

const deleteUser=async(req,res=response) =>{
    const id=req.body.id;
    try {        
        const adminDB= await Admin.findById(req.uid)

        if(!adminDB){
            res.json({
                ok:false
            })
        }
        
        const user= await Usuario.findById(id);
        if(user.tipo=='emp'){
            await Empresa.deleteMany({'mail': { $eq: user.mail}})
        }
        await Usuario.findByIdAndDelete(id);
        
        res.json({
            ok:true,
        })
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error borrar'
        });
    }
}

const actualizarUser= async(req,res=response)=>{    
    const {id, campos} = req.body;
    const adminDB= await Admin.findById(req.uid);    

    if(!adminDB){
        res.json({
            ok:false
        })
    }else{
        const usuarioDB= await Usuario.findById(id);
        const empresaDB= await Empresa.find({mail:usuarioDB.mail});
        if(!usuarioDB){
            res.json({
                ok:false
            })
        }
        const {...camposU}=usuarioDB;
        camposU._doc=campos;
        
        if(empresaDB[0]){
            if(campos.tipo=='emp'){
                const {...camposE}=empresaDB[0];
                camposE._doc=campos;
                await Empresa.findByIdAndUpdate(empresaDB[0]._id, campos,{new:true});       
            }else{
                await Empresa.findByIdAndDelete(empresaDB[0]._id);
            }
        }else if(campos.tipo=='emp'){
            const empresa= new Empresa(campos);
            await empresa.save();
        }
        
        await Usuario.findByIdAndUpdate(id, campos,{new:true});   

        res.json({
            ok:true,
        })
    }
}

module.exports={ login, renewToken, getUsers, deleteUser, actualizarUser }