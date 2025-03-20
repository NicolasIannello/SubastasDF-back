const mongoose = require('mongoose');
const Evento = require('../models/evento');
const Favorito = require('../models/favorito');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');
const Oferta = require('../models/oferta');
const OfertaAuto = require('../models/oferta-auto');
const nodemailer = require("nodemailer");
const Usuario = require('../models/usuario');
const Imagen = require('../models/imagen');
const PDF = require('../models/pdf');
const fs=require('fs');
const Vista = require('../models/vista');

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
        let hours=("0" + date_time.getHours()).slice(-2);//date_time.getHours();        
        let minutes=("0" + date_time.getMinutes()).slice(-2);//date_time.getMinutes();    
        let hora = hours+':'+minutes//.toString().length==1 ? '0'+minutes : minutes);        
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
                let evlotDB = await EventoLote.find({uuid_evento:eventoDB[i].uuid}).sort({uuid_lote: -1});
                for (let j = 0; j < evlotDB.length; j++) {
                    let dateFin= new Date(Date.parse(eventoDB[i].fecha_cierre+' '+eventoDB[i].hora_cierre));
                    dateFin.setMinutes(dateFin.getMinutes() + (eventoDB[i].segundos_cierre/60)*(j+1))

                    fecha_nueva=new Date(dateFin).toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires", hour12: false}).split("/");
                    hora_nueva=fecha_nueva[2].slice(6,14)
                    fecha_nueva[2].slice(0,4)
                    hora_nueva2 = hora_nueva.split(":")
                    // if(fecha_nueva[2][fecha_nueva[2].length-2]=='P'){                
                    //     hora_nueva=(parseInt(hora_nueva2[0])+12)+":"+hora_nueva2[1]
                    // }else{
                        hora_nueva=(hora_nueva2[0]=='24'?"00":hora_nueva2[0])+":"+hora_nueva2[1];
                    // }

                    const loteDB = await Lote.find({uuid:evlotDB[j].uuid_lote})
                    let {...campos}=loteDB[0];
                    campos._doc.ganador='';
                    campos._doc.precio_ganador='';
                    campos._doc.estado=1;
                    campos._doc.hora_cierre=hora_nueva;
                    campos._doc.fecha_cierre=fecha_nueva[2].slice(0,4)+'-'+(fecha_nueva[0].length==1 ? '0'+fecha_nueva[0] : fecha_nueva[0])+'-'+(fecha_nueva[1].length==1 ? '0'+fecha_nueva[1] : fecha_nueva[1]);
                    await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true});             
                }
                const userDB = await Usuario.find({$or: [{grupo: eventoDB[i].grupo}, {grupo: 'general'}]})
                for (let j = 0; j < userDB.length; j++) {
                    if(process.env.NOTI=='true') notificarApertura(userDB[j].mail,userDB[j].nombre,eventoDB[i].nombre,eventoDB[i].fecha_cierre,eventoDB[i].hora_cierre,eventoDB[i].uuid)
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
                let flagLotes=true;                

                const eventoloteDB = await EventoLote.find({uuid_evento:eventoDB2[i].uuid})
                for (let j = 0; j < eventoloteDB.length; j++) {
                    const loteDB = await Lote.find({uuid:eventoloteDB[j].uuid_lote})
                    const ofertaDB = await Oferta.find({uuid_lote:eventoloteDB[j].uuid_lote}).sort({cantidad:-1}).limit(1)
                    
                    if(loteDB[0].estado==1) flagLotes=false;
                    cierre= loteDB[0].hora_cierre.length==4 ? '0'+loteDB[0].hora_cierre : loteDB[0].hora_cierre;
                    if(/*ofertaDB[0] && loteDB[0] && */(cierre<=hora && loteDB[0].estado==1)){
                        let {...campos}=loteDB[0];        
                        campos._doc.estado=2;
                        if(ofertaDB[0]){
                            campos._doc.ganador=ofertaDB[0].mail;
                            campos._doc.precio_ganador=ofertaDB[0].cantidad;
                        }
                        await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true});             
                        console.log('Cerrando lote: '+loteDB[0]._id);
                    }
                }

                if(flagLotes){
                    let {...campos}=eventoDB2[i];        
                    campos.estado=2;
                    await Evento.findByIdAndUpdate(eventoDB2[i]._id, campos,{new:true});         
                    console.log('Cerrando evento: '+eventoDB2[i]._id);
                    //await Favorito.deleteMany({uuid_evento:eventoDB2[i].uuid});
                    await OfertaAuto.deleteMany({uuid_evento:eventoDB2[i].uuid});

                    const userDB = await Usuario.aggregate([
                        { $match:  {$or: [{grupo: eventoDB2[i].grupo}, {grupo: 'general'}]} },
                        { $lookup: {
                            from: "ofertas",
                            localField: "mail",
                            foreignField: "mail",
                            "pipeline": [ 
                                { $match: { uuid_evento: eventoDB2[i].uuid } },
                                { $group: { _id: "$uuid_lote", uuid_lote : { $first: '$uuid_lote' }, oferta: { $max: "$cantidad" } } },
                                { $lookup: {
                                    from: "lotes",
                                    localField: "uuid_lote",
                                    foreignField: "uuid",
                                    as: "lote",
                                } },
                                { $project: {
                                    __v: 0,
                                    "lote.aclaracion": 0,    "lote.base_salida": 0,   "lote.__v": 0,                   "lote._id": 0,
                                    "lote.descripcion": 0,   "lote.disponible": 0,    "lote.incremento": 0,            "lote.moneda": 0,
                                    "lote.precio_base": 0,   "lote.precio_salida": 0, "lote.terminos_condiciones": 0,
                                    "lote.visitas": 0,"lote.estado": 0,"lote.fecha_cierre": 0,"lote.hora_cierre": 0
                                } },
                                { $lookup: {
                                    from: "ofertas",
                                    localField: "uuid_lote",
                                    foreignField: "uuid_lote",
                                    "pipeline": [ 
                                        { $group: { _id: "$mail", oferta: { $max: "$cantidad" } } },
                                        { "$sort" : { "oferta" : -1 } },
                                    ],
                                    as: "puesto",
                                } },
                            ],
                            as: "oferta",
                        } },
                    ]);

                    for (let j = 0; j < userDB.length; j++) {
                        if(userDB[j].oferta.length>0){
                            if(process.env.NOTI=='true') notificarCierre(userDB[j].mail,userDB[j].nombre,eventoDB2[i].nombre,userDB[j].oferta)
                        }
                    }
                }
            }
        }

        let tresMeses = new Date();
        tresMeses.setMonth(tresMeses.getMonth()-3);
        let tresMesesdate=("0" + tresMeses.getDate()).slice(-2);
        let tresMesesmonth=("0" + (tresMeses.getMonth() + 1)).slice(-2);
        let tresMesesyear=tresMeses.getFullYear();
        let tresMesesfecha=tresMesesyear+"-"+tresMesesmonth+"-"+tresMesesdate;
    
        const lotesViejos= await Lote.find({ 'fecha_cierre': { $lt: tresMesesfecha } },);
        const eventosViejos= await Evento.find({ 'fecha_cierre': { $lt: tresMesesfecha } },);        
        if(lotesViejos[0]){
            for (let i = 0; i < lotesViejos.length; i++) {                
                if(lotesViejos[i].fecha_cierre!=''){
                    const imgDB = await Imagen.find({lote:lotesViejos[i].uuid})
                    const pdfDB = await PDF.find({pdf:lotesViejos[i].terminos_condiciones})
                    
                    if(pdfDB.length!=0){
                        let pathPDF='./files/pdfs/'+pdfDB[0].pdf;
                        if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                        await PDF.findByIdAndDelete(pdfDB[0]._id);    
                    }
                    if(imgDB.length!=0){
                        for (let i = 0; i < imgDB.length; i++) {
                            let pathImg='./files/lotes/'+imgDB[i].img
                            if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                            await Imagen.findByIdAndDelete(imgDB[i]._id);
                        }
                    }
                    await Oferta.deleteMany({uuid_lote:lotesViejos[i].uuid});
                    await Vista.deleteMany({uuid_lote:lotesViejos[i].uuid});
                    await OfertaAuto.deleteMany({uuid_lote:lotesViejos[i].uuid});
                    await EventoLote.deleteMany({uuid_lote:lotesViejos[i].uuid});
                    await Favorito.deleteMany({uuid_lote:lotesViejos[i].uuid});
                    await Lote.findByIdAndDelete(lotesViejos[i]._id);  
                }           
            }
        }
        if(eventosViejos[0]){
            for (let i = 0; i < eventosViejos.length; i++) {
                const imgDB = await Imagen.find({lote:eventosViejos[i].uuid})

                if(imgDB.length!=0){
                    for (let i = 0; i < imgDB.length; i++) {
                        let pathImg='./files/eventos/'+imgDB[i].img
                        if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                        await Imagen.findByIdAndDelete(imgDB[i]._id);
                    }
                }
                await Favorito.deleteMany({uuid_evento:eventosViejos[i].uuid});
                await OfertaAuto.deleteMany({uuid_evento:eventosViejos[i].uuid});
                await Evento.findByIdAndDelete(eventosViejos[i]._id);
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
        text: "Hola "+nombre+"!.\nHas sido invitado/a a participar del evento: "+evento+".\n"+
        "Le recordamos que la fecha de cierre es el "+fecha+" a las "+hora+" hs.\nPara acceder y participar, puedes acceder desde aquí:\n"+
        process.env.LINK+'/evento/'+id+"Saludamos muy atentamente."+
        "\nEquipo de Gruppo DF - Soluciones para el tratamiento de sus bienes",
        html: "Hola "+nombre+"!.<br>Has sido invitado/a a participar del evento: "+evento+".<br>"+
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

const notificarCierre= async(mail,nombre,evento,ofertas)=>{
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
        textMsg+="Lote: "+ofertas[i].lote[0].titulo+":\nOferta ganadora: "+ofertas[i].lote[0].precio_ganador+"\nSu mayor oferta: "+ofertas[i].oferta+"\n";
        htmlMsg+="Lote: "+ofertas[i].lote[0].titulo+":<br>Oferta ganadora: "+ofertas[i].lote[0].precio_ganador+"<br>Su mayor oferta: "+ofertas[i].oferta+"<br>";
        for (let j = 0; j < ofertas[i].puesto.length; j++) {
            if(ofertas[i].puesto[j]._id==mail){
                textMsg+="Puesto: "+(j+1)+"\n\n";
                htmlMsg+="Puesto: "+(j+1)+"<br><br>";    
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

module.exports={dbConnection, notificarApertura};