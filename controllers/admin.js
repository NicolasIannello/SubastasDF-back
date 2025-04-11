const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');
const Usuario = require('../models/usuario');
const Empresa = require('../models/empresa');
const Lote = require('../models/lote');
const Evento = require('../models/evento');
const Oferta = require('../models/oferta');
const nodemailer = require("nodemailer");
const { notificarApertura } = require('../database/config');
const EventoLote = require('../models/evento-lote');
const RegistroTc = require('../models/registro-tc');

const login=async(req,res=response)=>{
    const { user, pass }= req.body;
    try {        
        const adminDB= await Admin.findOne({usuario:user});    
        if(!adminDB){
            return res.status(404).json({
                ok:false,
                msg:'Datos incorrectos'
            })
        }

        const validPassword=bcrypt.compareSync(pass,adminDB.pass);
        if(!validPassword){
            return res.status(400).json({
                ok:false,
                msg:'Datos incorrectos'
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
        return;
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
        return;
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
            return;
        }
        
        if(tipo=="user"){
            const user= await Usuario.findById(id);
            if(user.tipo=='emp'){
                await Empresa.deleteMany({'mail': { $eq: user.mail}})
            }
            await Favorito.deleteMany({mail:user.mail});
            await Vista.deleteMany({mail:user.mail});
            await OfertaAuto.deleteMany({mail:user.mail});
            await Oferta.deleteMany({mail:user.mail});
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
    let {id, campos, nuevaPass} = req.body;
    const adminDB= await Admin.findById(req.uid);    

    if(!adminDB && req.body.id!=req.uid){
        res.json({
            ok:false
        })
        return;
    }else{
        const usuarioDB= await Usuario.findById(id);
        const empresaDB= await Empresa.find({mail:usuarioDB.mail});
        if(!usuarioDB){
            res.json({
                ok:false
            })
        }

        let  {tipo, habilitado, mail, ...campos2} = campos
        if(!adminDB) campos=campos2;
        
        const {...camposU}=usuarioDB;
        camposU._doc=campos;
        if(nuevaPass && nuevaPass!=''){
            const salt=bcrypt.genSaltSync();
            camposU._doc.pass=bcrypt.hashSync(nuevaPass,salt);
        }
        
        if(empresaDB[0]){
            if((tipo=='emp' && adminDB) || (usuarioDB.tipo=='emp' && !adminDB)){
                const {...camposE}=empresaDB[0];
                camposE._doc=campos;
                await Empresa.findByIdAndUpdate(empresaDB[0]._id, camposE,{new:true});       
            }else if(adminDB){
                await Empresa.findByIdAndDelete(empresaDB[0]._id);
            }
        }else if(tipo=='emp' && adminDB){
            const empresa= new Empresa(campos);
            await empresa.save();
        }
        
        await Usuario.findByIdAndUpdate(id, camposU,{new:true});   

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
            return;
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
            return;
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
        return;
    }
    let busqueda
    if(user=='lote'){        
        if(tipo=='uuid_evento'){
            busqueda= await EventoLote.aggregate([
                regExOperator,
                { $project: { __v: 0, "_id": 0, } },
                { $lookup: {
                    from: "lotes",
                    localField: "uuid_lote",
                    foreignField: "uuid",
                    "pipeline": [ 
                        { $lookup: {
                            from: "ofertas",
                            localField: "uuid",
                            foreignField: "uuid_lote",
                            "pipeline": [ 
                                { "$sort" : { "cantidad" : -1 } },
                                { "$limit" : 1 } 
                            ],
                            as: "oferta"
                        } },
                        {$unwind: { path: "$oferta", preserveNullAndEmptyArrays: true }},
                        { $lookup: {
                            from: "ofertas",
                            localField: "uuid",
                            foreignField: "uuid_lote",
                            as: "ofertas",
                            "pipeline": [
                                {$facet: {
                                    total:[{$group:{_id: null, count: {$sum: 1}}}]
                                }}
                            ]
                        } },
                        {$unwind: { path: "$ofertas", preserveNullAndEmptyArrays: true }},
                    ],
                    as: "lote"
                } },
                {$unwind: { path: "$lote", preserveNullAndEmptyArrays: true }},
                { $project: {
                    __v: 0,
                    "lote.descripcion": 0,
                    "lote.aclaracion": 0,
                    "lote.terminos_condiciones": 0,
                } },
            ]).collation({locale: 'en'});
        }else{
        busqueda= await Lote.aggregate([
            regExOperator,
            { $project: {
                __v: 0,
                "descripcion": 0,
                "aclaracion": 0,
                "terminos_condiciones": 0,
            } },
            { $lookup: {
                from: "ofertas",
                localField: "uuid",
                foreignField: "uuid_lote",
                "pipeline": [ 
                    { "$sort" : { "cantidad" : -1 } },
                    { "$limit" : 1 } 
                ],
                as: "oferta"
            } },
            {$unwind: { path: "$oferta", preserveNullAndEmptyArrays: true }},
            { $lookup: {
                from: "ofertas",
                localField: "uuid",
                foreignField: "uuid_lote",
                as: "ofertas",
                "pipeline": [
                    {$facet: {
                        total:[{$group:{_id: null, count: {$sum: 1}}}]
                    }}
                ]
            } },
            {$unwind: { path: "$ofertas", preserveNullAndEmptyArrays: true }},
            { $lookup: {
                from: "eventolotes",
                localField: "uuid",
                foreignField: "uuid_lote",
                as: "evento",
            } },
            {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
            { $project: {
                __v: 0,
                "evento.uuid_lote": 0,
                "evento._id": 0,
                "evento.__v": 0,
            } },
        ]).collation({locale: 'en'});
        }
    }else if(user=='evento'){
        busqueda= await Evento.aggregate([
            regExOperator,
            { $project: {
                __v: 0,
            } },
        ]).collation({locale: 'en'});
    }else{
        busqueda= await Usuario.aggregate([
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
    }
    
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
        return;
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

const isAdmin = async(res,id)=>{
    const adminDB= await Admin.findById(id)
    if(!adminDB){        
        res.json({
            ok:false
        })
        return false;
    }
    return true;
}

const isAdmin2 = async(id)=>{
    const adminDB= await Admin.findById(id)
    if(!adminDB){
        const userDB = await Usuario.findById(id)        
        if(!userDB.validado || !userDB.habilitado){
            return 3
        }
        return 2;
    }
    return 1;
}

const comunicar= async(req,res=response) =>{
    const adminDB= await Admin.findById(req.uid)    
    if(!adminDB){
        res.json({
            ok:false
        })
        return;
    }

    const userDB = await Usuario.find();

    req.body.texto+="\nSaludamos muy atentamente."+"\nEquipo de Gruppo DF - Soluciones para el tratamiento de sus bienes"
    req.body.texto2+="<br>Saludamos muy atentamente."+"<br>Equipo de Gruppo DF - Soluciones para el tratamiento de sus bienes"

    for (let i = 0; i < userDB.length; i++) {
        const transporter = nodemailer.createTransport({
            maxConnections: 1,
            pool: true,
            host: process.env.MSERVICE,
            port: 465,
            secure: true,
            auth: {
                user: 'contacto@gruppodf.com.ar',
                pass: process.env.MPASS
            }
        });

        await transporter.sendMail({
            from: '"Gruppo DF Subastas" <contacto@gruppodf.com.ar>',
            to: userDB[i].mail,
            subject: req.body.asunto,
            text: req.body.texto,
            html: req.body.texto2,
        }, function(error, info){
            if (error) {
                console.log(error);
                return false;
            }
        });
    }
    
    
    res.json({
        ok:true,
    });
}

const reComunicado= async(req,res=response) =>{
    const adminDB= await Admin.findById(req.uid)    
    if(!adminDB){
        res.json({
            ok:false
        })
        return;
    }

    const userDB = await Usuario.find({$or: [{grupo: req.body.grupo}, {grupo: 'general'}]})
    for (let j = 0; j < userDB.length; j++) {
        notificarApertura(userDB[j].mail,userDB[j].nombre,req.body.nombre,req.body.fecha_cierre,req.body.hora_cierre,req.body.uuid)
    }

    res.json({
        ok:true,
    });
}

const setStatus= async(req,res=response) =>{
    const adminDB= await Admin.findById(req.uid)    
    if(!adminDB){
        res.json({
            ok:false
        })
        return;
    }

    const loteDB= await Lote.find({uuid:req.body.lote});
    if(!loteDB){
        res.json({
            ok:false
        })
    }

    let {...camposL}=loteDB;        
    camposL[0].adjudicacion=req.body.status;
    await Lote.findByIdAndUpdate(loteDB[0]._id, camposL[0],{new:true}); 

    res.json({
        ok:true,
    });
}

const getRegistroTC= async(req,res=response) =>{
    const desde= parseInt(req.query.desde) || 0;
    const limit= parseInt(req.query.limit) || 20;
    const orden= parseInt(req.query.orden) || 1;
    const order= req.query.order || '_id';
    var sortOperator = { "$sort": { } };
    sortOperator["$sort"][order] = orden;
    
    const dato= req.query.dato;
    const tipo= req.query.tipo;
    var regExOperator = { "$match": { } }    
    var regExOperator2 = { "$match": { } }    

    if(dato!=undefined && tipo!='nombre' && tipo!='uuid'){
        regExOperator["$match"][tipo] = { "$regex": { }, "$options": "i" };
        regExOperator["$match"][tipo]["$regex"] = dato;    
    }else if(tipo!='nombre' && tipo!='uuid'){
        regExOperator["$match"][tipo]= { $exists: true };
    }

    if(dato!=undefined && tipo!='fecha' && tipo!='mail'){
        regExOperator2["$match"][tipo] = { "$regex": { }, "$options": "i" };
        regExOperator2["$match"][tipo]["$regex"] = dato;    
    }else if(tipo!='fecha' && tipo!='mail'){
        regExOperator2["$match"][tipo]= { $exists: true };
    }

    const adminDB= await Admin.findById(req.uid)
    if(!adminDB){
        res.json({
            ok:false
        })
        return;
    }

    const [ tcs, total ]= await Promise.all([
        RegistroTc.aggregate([
            regExOperator,
            { $project: {
                __v: 0,
                "__v": 0,
            } },
            { $lookup: {
                from: "eventos",
                localField: "terminos_condiciones",
                foreignField: "terminos_condiciones",
                as: "evento",
                "pipeline": [ 
                    regExOperator2
                ],
            } },
            {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
            { $project: {
                __v: 0,
                "evento.__v": 0,                "evento.categoria":0,           "evento.fecha_inicio":0,
                "evento.fecha_cierre":0,    "evento.hora_inicio":0,         "evento.hora_cierre":0,   "evento.segundos_cierre":0,
                "evento.modalidad":0,           "evento.publicar_cierre":0,     "evento.inicio_automatico":0,   "evento.mostrar_precio":0,
                "evento.mostrar_ganadores":0,   "evento.mostrar_ofertas":0,     "evento.grupo":0,               "evento.home":0,
                "evento.visitas":0,             "evento.estado":0, "evento.eventos":0
            } },
            sortOperator,
            { $skip: desde },
            { $limit: limit },
        ]).collation({locale: 'en'}),
        RegistroTc.countDocuments()
    ]); 
    
    res.json({
        ok:true,
        tcs,
        total
    });
}

module.exports={ login, renewToken, getUsers, deleteUser, actualizarUser, crearAdmin, buscarDato, excelUsuarios, getAdmins, isAdmin, isAdmin2, comunicar, reComunicado, setStatus, getRegistroTC }