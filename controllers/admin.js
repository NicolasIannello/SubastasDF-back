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
    const orden= parseInt(req.query.orden) || 1;
    const order= req.query.order || '_id';
    var sortOperator = { "$sort": { } };
    sortOperator["$sort"][order] = orden;
    
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
            sortOperator,
            { $skip: desde },
            { $limit: limit },
        ]).collation({locale: 'en'}),
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
    const tipo=req.body.user;
    try {        
        const adminDB= await Admin.findById(req.uid)

        if(!adminDB){
            res.json({
                ok:false
            })
        }
        
        if(tipo=="user"){
            const user= await Usuario.findById(id);
            if(user.tipo=='emp'){
                await Empresa.deleteMany({'mail': { $eq: user.mail}})
            }
            await Usuario.findByIdAndDelete(id);
        }else{
            await Admin.findByIdAndDelete(id);
        }
        
        
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
    const {id, campos, nuevaPass} = req.body;
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
        if(nuevaPass!=''){
            const salt=bcrypt.genSaltSync();
            camposU._doc.pass=bcrypt.hashSync(nuevaPass,salt);
        }
        
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

const crearAdmin= async(req,res = response) =>{
    const {pass,usuario}=req.body;

    try {
        const adminDB= await Admin.findById(req.uid)
        if(!adminDB){
            res.json({
                ok:false
            })
        }

        const existeAdmin= await Admin.findOne({usuario});
        if(existeAdmin){
            return res.status(400).json({
                ok:false,
                msg:'Ya existe una cuenta con usuario'
            });
        }

        const admin= new Admin(req.body);

        const salt=bcrypt.genSaltSync();
        admin.pass=bcrypt.hashSync(pass,salt);
        await admin.save();

        res.json({
            ok:true,
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const getAdmins= async(req,res = response) =>{
    try {
        const adminDB= await Admin.findById(req.uid)
        if(!adminDB){
            res.json({
                ok:false
            })
        }

        const [ admins, total ]= await Promise.all([
            Admin.aggregate([
                { $project: {
                    __v: 0,
                    "__v": 0,
                    "pass": 0,
                } },
            ]),
            Usuario.countDocuments()
        ]); 

        res.json({
            ok:true,
            admins,
            total
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const buscarDato= async(req,res=response) =>{
    const dato= req.body.dato;
    const tipo= req.body.datoTipo;
    const user= req.body.datoTipoUser;
    //{ $match: { nombre: { $regex: 'demo', $options: "i" }  } };
    var regExOperator = { "$match": { } }
    regExOperator["$match"][tipo] = { "$regex": { }, "$options": "i" };
    regExOperator["$match"][tipo]["$regex"] = dato;
    var regExOperator2 = { "$match": { "tipo": { "$regex": { }, "$options": "i" } } }
    regExOperator2["$match"]["tipo"]["$regex"] = user;

    const adminDB= await Admin.findById(req.uid)
    if(!adminDB){
        res.json({
            ok:false
        })
    }

    const busqueda= await Usuario.aggregate([
        regExOperator,
        regExOperator2,
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
    ]).collation({locale: 'en'});
    
    res.json({
        ok:true,
        busqueda,
    });
}

const excelUsuarios= async(req,res=response) =>{
    const flag= req.body.estado;

    const adminDB= await Admin.findById(req.uid)
    if(!adminDB){
        res.json({
            ok:false
        })
    }

    const busqueda= await Usuario.aggregate([
        { $match: { habilitado: flag } },
        { $project: {
            __v: 0,
            "__v": 0,
            "pass": 0,
            "pais": 0,
            "provincia": 0,
            "ciudad": 0,
            "domicilio": 0,
            "postal": 0,
            "actividad": 0,
            "tipo": 0,
            "como_encontro": 0,
            "_id": 0,
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
            "dato_empresa.razon_social": 0,
        } },
    ]).collation({locale: 'en'});
    
    res.json({
        ok:true,
        busqueda,
    });
}

module.exports={ login, renewToken, getUsers, deleteUser, actualizarUser, crearAdmin, buscarDato, excelUsuarios, getAdmins }