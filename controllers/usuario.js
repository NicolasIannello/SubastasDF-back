const { response }=require('express');
const { generarJWT } = require('../helpers/jwt');
const bcrypt=require('bcryptjs');
const nodemailer = require("nodemailer");
const Usuario = require('../models/usuario');
const Empresa = require('../models/empresa');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');

const crearUsuario= async(req,res = response) =>{
    const {mail,pass,cuil_cuit,tipo}=req.body;

    try {
        const flagcc=checkCuilCuit(cuil_cuit);
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

        const usuario= new Usuario(req.body);

        const salt=bcrypt.genSaltSync();
        usuario.pass=bcrypt.hashSync(pass,salt);
        usuario.habilitado=false;
        usuario.validado=false; 
        usuario.grupo="general"; 
        usuario.ultima_conexion=timeNow();
        await usuario.save();

        const token= await generarJWT(usuario._id,1);
        notificar(usuario.mail,usuario._id,2)

        if(tipo=='emp'){
            let dato={
                'mail':usuario.mail,
                'persona_responsable':req.body.persona_responsable,
                'razon_social':req.body.razon_social
            }
            const empresa= new Empresa(dato);
            await empresa.save();
        }

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
        const usuarioDB= await Usuario.findOne({mail});    
        if(!usuarioDB){
            return res.status(404).json({
                ok:false,
                msg:'No se encontro un usuario con ese e-mail'
            })
        }

        const validPassword=bcrypt.compareSync(pass,usuarioDB.pass);
        if(!validPassword){
            return res.status(400).json({
                ok:false,
                msg:'Contraseña incorrecta'
            })
        }

        const token= await generarJWT(usuarioDB.id,1);
        const {...campos}=usuarioDB;
        campos._doc.ultima_conexion=timeNow();
        await Usuario.findByIdAndUpdate(usuarioDB.id, campos,{new:true});

        if(!usuarioDB.validado || !usuarioDB.habilitado){
            if(!usuarioDB.validado){
                notificar(usuarioDB.mail,usuarioDB.id,2)
            }
            res.json({
                ok:false,
                validado: usuarioDB.validado,
                habilitado: usuarioDB.habilitado,
                mail: usuarioDB.mail,
                token,
                user: usuarioDB.nombre
            })
        }else{
            res.json({
                ok:true,
                token,
                user: usuarioDB.nombre
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
    const token= await generarJWT(_id,1);
    const usuarioDB= await Usuario.findById(_id)

    if(!usuarioDB){
        res.json({
            ok:false
        })
    }else{        
        const {...campos}=usuarioDB;
        campos._doc.ultima_conexion=timeNow();
        await Usuario.findByIdAndUpdate(usuarioDB.id, campos,{new:true});  

        res.json({
            ok:true,
            token,
            nombre: usuarioDB.nombre,
            email: usuarioDB.mail
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

const notificar= async(mail,id,tipo)=>{    
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
    let token=await generarJWT(id,tipo)
    let msg,msg2,title;
    switch (tipo) {
        case 2:
            title="Verificacion de cuenta";
            msg='Para terminar de configurar su cuenta siga el link.<br>'+process.env.LINK+'/verificar/'+token;
            msg2="Para terminar de configurar su cuenta siga el link.\n"+process.env.LINK+"/verificar/"+token;
        break;
        case 4:
            title="Cambio de contraseña";
            msg='Para realizar un cambio de contraseña siga el link.<br>'+process.env.LINK+'/cambio/'+token;
            msg2="Para realizar un cambio de contraseña siga el link.\n"+process.env.LINK+"/cambio/"+token;
        break;
    }

    await transporter.sendMail({
        from: '"Gruppo DF Subastas" <contacto@gruppodf.com.ar>',
        to: mail,
        subject: title,
        text: msg2,
        html: msg,
    }, function(error, info){
        if (error) {
            console.log(error);
            return false;
        }
    });
    
    return true;
};

const mailContacto= async(req,res=response)=>{    
    const {mensaje,mensaje2,asunto,nombre_apellido,mail,como_encontro} = req.body
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

    let msg = "Nombre y apellido: "+nombre_apellido+"\n"+"E-Mail: "+mail+"\n"+"Como encontro: "+como_encontro+"\n"+"Mensaje:\n"+mensaje
    let msgHTML = "Nombre y apellido: "+nombre_apellido+"<br><br>"+"E-Mail: "+mail+"<br><br>"+"Como encontro: "+como_encontro+"<br><br>"+"Mensaje:<br>"+mensaje2

    transporter.sendMail({
        from: '"Gruppo DF Subastas" <contacto@gruppodf.com.ar>',
        to: 'contacto@gruppodf.com.ar',
        subject: "Formulario contacto: "+asunto,
        text: msg,
        html: msgHTML,
    }, function(error, info){
        if (error) {
            console.log(error);
            return res.status(400).json({
                ok:false,
                msg:'error'
            });        
        }
    });
    
    res.json({
        ok:true,
    })
};

const validarCuenta= async(req,res=response)=>{    
    const _id=req.uid;
    const usuarioDB= await Usuario.findById(_id)
    
    if(!usuarioDB){
        res.json({
            ok:false
        })
    }else{
        const {validado, ...campos}=usuarioDB;
        campos._doc.validado=true;
        await Usuario.findByIdAndUpdate(_id, campos,{new:true});   

        res.json({
            ok:true,
        })
    }
}

const sendCambio= async(req,res=response)=>{  
    const {mail}=req.body;

    const existeEmail= await Usuario.findOne({mail});
    if(!existeEmail){
        return res.status(400).json({
            ok:false,
            msg:'No existe una cuenta con ese e-mail'
        });
    }

    notificar(mail,[mail,existeEmail._id],4)

    return res.json({
        ok:true,
        msg:'Hemos enviado un mail para el cambio de contraseña'
    });
}

const cambiarPass= async(req,res=response)=>{    
    const mail=req.uid;
    
    const passN=req.body.pass;    
    const usuarioDB= await Usuario.findById(mail[1])
    
    if(!usuarioDB){
        res.json({
            ok:false
        })
    }else if(usuarioDB.mail==mail[0]){
        const {validado, ...campos}=usuarioDB;
        const salt=bcrypt.genSaltSync();
        campos._doc.pass=bcrypt.hashSync(passN,salt);
        await Usuario.findByIdAndUpdate(usuarioDB._id, campos,{new:true});   

        res.json({
            ok:true,
        })
    }else{
        res.json({
            ok:false
        })
    }
}

const getDatos= async(req,res=response)=>{
    const userDB = await Usuario.findById(req.uid);

    const userDatos=await Usuario.aggregate([
        { "$match": { mail:userDB.mail } },
        { $project: {
            __v: 0,
            "__v": 0,
            "pass": 0,
            "grupo": 0,
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
        userDatos
    })
}

const getAdjudicados= async(req,res=response)=>{
    const userDB = await Usuario.findById(req.uid);
    const lotesDB = await Lote.find({ganador:userDB.mail})
    let adjudicadosDB = [];

    if(!lotesDB){
    adjudicadosDB=await EventoLote.aggregate([
        { "$match": { uuid_lote:lotesDB[0].uuid } },
        { $lookup: {
            from: "eventos",
            localField: "uuid_evento",
            foreignField: "uuid",
            as: "evento"
        } },
        {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
        { $project: {
            __v: 0,
            "evento.__v": 0,
            "evento._id": 0,
            "evento.categoria": 0,
            "evento.estado": 0,
            "evento.eventos": 0,
            "evento.fecha_cierre": 0,
            "evento.fecha_inicio": 0,
            "evento.grupo": 0,
            "evento.home": 0,
            "evento.hora_cierre": 0,
            "evento.hora_inicio": 0,
            "evento.inicio_automatico": 0,
            "evento.modalidad": 0,
            "evento.mostrar_ganadores": 0,
            "evento.mostrar_ofertas": 0,
            "evento.mostrar_precio": 0,
            "evento.publicar_cierre": 0,
            "evento.segundos_cierre": 0,
            "evento.uuid": 0,
            "evento.visitas": 0,
        } },
        { $lookup: {
            from: "lotes",
            localField: "uuid_lote",
            foreignField: "uuid",
            as: "lote"
        } },
        {$unwind: { path: "$lote", preserveNullAndEmptyArrays: true }},
        { $project: {
            __v: 0,
            "lote.__v": 0,
            "lote._id": 0,
            "lote.aclaracion": 0,
            "lote.base_salida": 0,
            "lote.descripcion": 0,
            "lote.disponible": 0,
            "lote.ganador": 0,
            "lote.incremento": 0,
            "lote.moneda": 0,
            "lote.precio_base": 0,
            "lote.precio_salida": 0,
            "lote.terminos_condiciones": 0,
            "lote.uuid": 0,
        } },
    ]).collation({locale: 'en'});
    }

    res.json({
        ok:true,
        adjudicadosDB
    })
}

module.exports={ crearUsuario, login, renewToken, validarCuenta, cambiarPass, sendCambio, mailContacto, timeNow, getDatos, getAdjudicados }