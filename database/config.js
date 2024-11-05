const mongoose = require('mongoose');
const Evento = require('../models/evento');
const Favorito = require('../models/favorito');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');
const Oferta = require('../models/oferta');
const OfertaAuto = require('../models/oferta-auto');
const nodemailer = require("nodemailer");
const Usuario = require('../models/usuario');

mongoose.set('strictQuery', false);

const dbConnection = async() =>{
    try {
        await mongoose.connect(process.env.DB_CNN);
        console.log('Conectado a la base de datos '+new Date());
        tracking();
    } catch (error) {
        console.log(error);
        throw new Error('Error al conectar con la base de datos')
    }
}

const tracking = async() =>{
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    while(true) {
        await sleep(5000);

        let date_time=new Date();
        let date=("0" + date_time.getDate()).slice(-2);
        let month=("0" + (date_time.getMonth() + 1)).slice(-2);
        let year=date_time.getFullYear();
        let fecha=year+"-"+month+"-"+date;
        let hours=date_time.getHours();
        let minutes=date_time.getMinutes();    
        let hora = hours+':'+(minutes.toString().length==1 ? '0'+minutes : minutes);
        
        const eventoDB = await Evento.aggregate([
            { $project: { __v: 0, } },
            { "$match": {"fecha_inicio" : { $lte : fecha }} },
            { "$match": {"estado" : { $eq : 0 }} },
        ]);

        for (let i = 0; i < eventoDB.length; i++) {
            if(eventoDB[i].hora_inicio<=hora && eventoDB[i].estado==0 && eventoDB[i].inicio_automatico){
                let {...campos}=eventoDB[i];        
                campos.estado=1;
                await Evento.findByIdAndUpdate(eventoDB[i]._id, campos,{new:true});         
                console.log('Abriendo evento: '+eventoDB[i]._id);
                const userDB = await Usuario.find({$or: [{grupo: eventoDB[i].grupo}, {grupo: 'general'}]})
                for (let j = 0; j < userDB.length; j++) {
                    notificarApertura(userDB[j].mail,userDB[j].nombre,eventoDB[i].nombre,eventoDB[i].fecha_cierre,eventoDB[i].hora_cierre,eventoDB[i].uuid)
                }
            }        
        }

        const eventoDB2 = await Evento.aggregate([
            { $project: { __v: 0, } },
            { "$match": {"fecha_cierre" : { $lte : fecha }} },
            { "$match": {"estado" : { $eq : 1 }} },
        ]);

        for (let i = 0; i < eventoDB2.length; i++) {
            if(eventoDB2[i].hora_cierre<=hora && eventoDB2[i].estado==1){
                let {...campos}=eventoDB2[i];        
                campos.estado=2;
                await Evento.findByIdAndUpdate(eventoDB2[i]._id, campos,{new:true});         
                console.log('Cerrando evento: '+eventoDB2[i]._id);
                //await Favorito.deleteMany({uuid_evento:eventoDB2[i].uuid});
                await OfertaAuto.deleteMany({uuid_evento:eventoDB2[i].uuid});

                const eventoloteDB = await EventoLote.find({uuid_evento:eventoDB2[i].uuid})
                for (let j = 0; j < eventoloteDB.length; j++) {
                    const loteDB = await Lote.find({uuid:eventoloteDB[j].uuid_lote})
                    const ofertaDB = await Oferta.find({uuid_lote:eventoloteDB[j].uuid_lote}).sort({cantidad:-1}).limit(1)
                    
                    if(ofertaDB[0] && loteDB[0]){
                        let {...campos}=loteDB[0];        
                        campos._doc.ganador=ofertaDB[0].mail;
                        campos._doc.precio_ganador=ofertaDB[0].cantidad;
                        await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true});             
                    }
                }

                const userDB = await Usuario.aggregate([
                    { $match:  {$or: [{grupo: eventoDB2[i].grupo}, {grupo: 'general'}]} },
                    { $lookup: {
                        from: "ofertas",
                        localField: "mail",
                        foreignField: "mail",
                        "pipeline": [ { $group: { _id: "$uuid_lote", oferta: { $max: "$cantidad" } } } ],
                        as: "oferta",
                    } },
                ]);

                for (let x = 0; x < userDB.length; x++) {
                    let resultado=[]                    
                    if(userDB[x].oferta.length>0){
                        for (let x2 = 0; x2 < userDB[x].oferta.length; x2++) {
                        const ofertaDB = await Lote.aggregate([
                            { $match: { uuid: userDB[x].oferta[x2]._id} },
                            { $project: {
                                __v: 0,
                                "aclaracion": 0,    "base_salida": 0,   "__v": 0,                   "_id": 0,
                                "descripcion": 0,   "disponible": 0,    "incremento": 0,            "moneda": 0,
                                "precio_base": 0,   "precio_salida": 0, "terminos_condiciones": 0
                            } },
                        ]);
                        resultado.push(ofertaDB[0])
                        }                    
                        notificarCierre(userDB[x].mail,userDB[x].nombre,eventoDB2[i].nombre,userDB[x].oferta,resultado)
                    }
                }
            }        
        }
    }
}

const notificarApertura= async(mail,nombre,evento,fecha,hora,id)=>{
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
        to: mail,
        subject: 'Invitacion a evento '+evento,
        text: "Hola "+nombre+"!.\nHas sido invitado/a a participar de la subasta electrónica "+evento+".\n"+
        "Le recordamos que la fecha de cierre es el "+fecha+" a las "+hora+" hs.\nPara acceder y participar, puedes acceder desde aquí:\n"+
        process.env.LINK+'/evento/'+id+"Saludamos muy atentamente."+
        "\nEquipo de Gruppo DF - Soluciones para el tratamiento de sus bienes",
        html: "Hola "+nombre+"!.<br>Has sido invitado/a a participar de la subasta electrónica "+evento+".<br>"+
        "Le recordamos que la fecha de cierre es el "+fecha+" a las "+hora+" hs.<br>Para acceder y participar, puedes acceder desde aquí:<br>"+
        process.env.LINK+'/evento/'+id+"<br>Saludamos muy atentamente."+
        "<br>Equipo de Gruppo DF - Soluciones para el tratamiento de sus bienes",
    }, function(error, info){
        if (error) {
            console.log(error);
            return false;
        }
    });
    
    return true;
};

const notificarCierre= async(mail,nombre,evento,ofertas,resultado)=>{
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
    let textMsg="Hola "+nombre+"!.\nEstos han sido los resultados del evento: "+evento+".\nLotes ofertados:\n";
    let htmlMsg="Hola "+nombre+"!.<br>Estos han sido los resultados del evento: "+evento+".<br>Lotes ofertados:<br>";

    for (let i = 0; i < ofertas.length; i++) {
        textMsg+="Lote: "+resultado[i].titulo+":\nOferta ganadora: "+resultado[i].precio_ganador;
        htmlMsg+="Lote: "+resultado[i].titulo+":<br>Oferta ganadora: "+resultado[i].precio_ganador;
        for (let j = 0; j < ofertas.length; j++) {
            if(resultado[i].uuid==ofertas[j]._id) {
                textMsg+="\nSu mayor oferta: "+ofertas[j].oferta+"\n\n";
                htmlMsg+="<br>Su mayor oferta: "+ofertas[j].oferta+"<br><br>";
            }
        }
    }
    textMsg+="\nSaludamos muy atentamente."+"\nEquipo de Gruppo DF - Soluciones para el tratamiento de sus bienes"
    htmlMsg+="<br>Saludamos muy atentamente."+"<br>Equipo de Gruppo DF - Soluciones para el tratamiento de sus bienes"

    await transporter.sendMail({
        from: '"Gruppo DF Subastas" <contacto@gruppodf.com.ar>',
        to: mail,
        subject: 'Finalizacion del evento '+evento,
        text: textMsg,
        html: htmlMsg
    }, function(error, info){
        if (error) {
            console.log(error);
            return false;
        }
    });
    
    return true;
};

module.exports={dbConnection};