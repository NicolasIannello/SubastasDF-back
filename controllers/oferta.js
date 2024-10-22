const { response }=require('express');
const { isAdmin2 } = require('./admin');
const { timeNow } = require('./usuario');
const Evento = require('../models/evento');
const Oferta = require('../models/oferta');
const EventoLote = require('../models/evento-lote');
const Usuario = require('../models/usuario');
const OfertaAuto = require('../models/oferta-auto');
const Lote = require('../models/lote');

const checkCierre= async(evento) =>{
    try {
        const eventoDB = await Evento.find({uuid: evento});
        let dateFin= new Date(Date.parse(eventoDB[0].fecha_cierre+' '+eventoDB[0].hora_cierre));
        let dateHoy= new Date();

        const milliDiff = (dateHoy.getTime()- dateFin.getTime())*-1;
        const totalSeconds = Math.floor(milliDiff / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);

        let totalDays = Math.floor(totalHours / 24);    
        let remMinutes = totalMinutes % 60;
        let remHours = totalHours % 24;

        if(totalDays==0 && remHours==0 && remMinutes<=4){
            dateFin.setMinutes(dateFin.getMinutes() + eventoDB[0].segundos_cierre/60)
            fecha_nueva=new Date(dateFin).toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}).split("/")                        
            hora_nueva=fecha_nueva[2].slice(6,14)
            fecha_nueva[2].slice(0,4)
            hora_nueva2 = hora_nueva.split(":")
            if(fecha_nueva[2][15]=='P'){
                hora_nueva=(parseInt(hora_nueva2[0])+12)+":"+hora_nueva2[1]
            }else{
                hora_nueva=(hora_nueva2[0]=='12'?"00":hora_nueva2[0])+":"+hora_nueva2[1];
            }

            let {...campos}=eventoDB[0];        
            campos._doc.hora_cierre=hora_nueva;
            campos._doc.fecha_cierre=fecha_nueva[2].slice(0,4)+'-'+fecha_nueva[0]+'-'+fecha_nueva[1];    
                            
            await Evento.findByIdAndUpdate(eventoDB[0]._id, campos,{new:true});  
        }
    } catch (error) {
        console.log(error);
    }
}

const checkOfertaA= async(lote,evento) =>{
    try {
        const ofertaDB = await Oferta.find({uuid_evento: evento, uuid_lote: lote}).sort({cantidad:-1}).limit(1);
        const ofertaAutoDB = await OfertaAuto.find({uuid_evento: evento, uuid_lote: lote}).sort({cantidad:-1}).limit(2);
        const loteDB = await Lote.find({uuid:lote});
        
        if(ofertaAutoDB.length>0 && ofertaDB[0].mail!=ofertaAutoDB[0].mail){
            if(ofertaAutoDB.length==1 && ofertaDB[0].cantidad+ +loteDB[0].incremento<=ofertaAutoDB[0].cantidad){
                const oferta= new Oferta({mail: ofertaAutoDB[0].mail,cantidad: ofertaDB[0].cantidad+ +loteDB[0].incremento,uuid_evento: evento,uuid_lote: lote})
                oferta.fecha=timeNow();
                oferta.tipo='automatica';
                await oferta.save();
            }else if(ofertaAutoDB.length==2 && ofertaAutoDB[1].cantidad+ +loteDB[0].incremento<=ofertaAutoDB[0].cantidad){
                const oferta= new Oferta({mail: ofertaAutoDB[0].mail,cantidad: ofertaAutoDB[1].cantidad+ +loteDB[0].incremento,uuid_evento: evento,uuid_lote: lote})
                oferta.fecha=timeNow();
                oferta.tipo='automatica';
                await oferta.save();
            }
        }
        checkCierre(evento)
    } catch (error) {
        console.log(error);
    }
}

const setOfertaA= async(req,res = response) =>{
    try {
        if(await isAdmin2(req.uid)==2){
            const userDB = await Usuario.findById(req.uid);
            if(userDB){
                const {evento, lote, cantidad} = req.body
                const oferta_autoDB = await OfertaAuto.find({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                if(oferta_autoDB[0]){
                    let {...campos}=oferta_autoDB[0];        
                    campos._doc.cantidad=cantidad;                    
                    await OfertaAuto.findByIdAndUpdate(oferta_autoDB[0]._id, campos,{new:true});  
                }else{
                    const oferta_auto= new OfertaAuto({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote,cantidad:cantidad});
                    await oferta_auto.save();
                }
                checkOfertaA(lote,evento);
            }
        }

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
}

const eliminarOfertaA= async(req,res = response) =>{
    try {
        if(await isAdmin2(req.uid)==2){
            const userDB = await Usuario.findById(req.uid);
            if(userDB){
                const {evento, lote} = req.body
                const oferta_autoDB = await OfertaAuto.find({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                if(oferta_autoDB[0]){
                    await OfertaAuto.deleteMany({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote})  
                }else{
                    res.json({
                        ok:false,
                        msg: 'No se encontro una oferta automatica para eliminar'
                    });
                    return;
                }
            }
        }

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
}

const getOfertaA= async(req,res = response) =>{
    try {
        if(await isAdmin2(req.uid)==2){
            const userDB = await Usuario.findById(req.uid);
            if(userDB){
                const {evento, lote} = req.body
                const oferta_autoDB = await OfertaAuto.find({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                
                if(oferta_autoDB[0]){
                    res.json({
                        ok:true,
                        cantidad: oferta_autoDB[0].cantidad
                    });
                }else{
                    res.json({
                        ok:false,
                    });
                }
            }    
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

const getDatos= async(req,res = response) =>{
    try {
        const flag = await isAdmin2(req.uid);
        if(flag==1){
            const lote = req.body.lote
            const ofertaDB = await Oferta.aggregate([
                { "$match": { uuid_lote: lote } },
                { $project: { __v: 0, "__v": 0,} },
                { $lookup: {
                    from: "eventos",
                    localField: "uuid_evento",
                    foreignField: "uuid",
                    as: "evento"
                } },
                {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
                { $project: {
                    __v: 0,
                    "evento._id": 0,                "evento.__v": 0,                "evento.categoria":0,           "evento.fecha_inicio":0,
                    /*"evento.fecha_cierre":0,*/    "evento.hora_inicio":0,         /*"evento.hora_cierre":0,*/     "evento.segundos_cierre":0,
                    "evento.modalidad":0,           "evento.publicar_cierre":0,     "evento.inicio_automatico":0,   "evento.mostrar_precio":0,
                    "evento.mostrar_ganadores":0,   "evento.mostrar_ofertas":0,     "evento.grupo":0,               "evento.home":0,
                    "evento.eventos":0,             "evento.visitas":0,             /*"evento.estado":0,*/          "evento.uuid":0,
                } },
                { "$sort": { cantidad: -1 } },
            ]);
            res.json({
                ok:true,
                ofertaDB
            });
            return;
        }else if(flag!=3){
            const {evento, lote} = req.body
            const eventoDB = await Evento.find({uuid: evento});
            let cantidad=null;
            let precio=null;
            let ganador=null
            if(eventoDB[0]){
                const ofertaDB = await Oferta.find({uuid_evento: evento, uuid_lote: lote}).sort({cantidad:-1});
                if(ofertaDB[0]){
                    if(eventoDB[0].mostrar_ofertas) cantidad = ofertaDB.length;
                    if(eventoDB[0].mostrar_precio) precio = ofertaDB[0].cantidad;
                    if(eventoDB[0].mostrar_ganadores) ganador = ofertaDB[0].mail;    
                }
            }
            res.json({
                ok:true,
                ganador,
                cantidad,
                precio
            });
            return;
        }
        res.json({
            ok:false,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

const ofertar= async(req,res = response) =>{
    try {
        if(await isAdmin2(req.uid)==2){
            const {cantidad, evento, lote} = req.body
            const eventoDB = await Evento.find({uuid: evento});
            if(eventoDB[0] && eventoDB[0].estado==1){
                const eventoLoteDB = await EventoLote.find({uuid_evento: evento, uuid_lote: lote});
                /*{ $and: [ { uuid_evento: evento }, { uuid_lote: lote } ] }*/
                if(eventoLoteDB[0]){
                    const userDB = await Usuario.findById(req.uid);
                    if(userDB){
                        const ofertaDB = await Oferta.find({uuid_evento: evento, uuid_lote: lote}).sort({cantidad:-1}).limit(1);
                        if(!ofertaDB[0] || cantidad>ofertaDB[0].cantidad){
                            const oferta= new Oferta({mail: userDB.mail,cantidad: cantidad,uuid_evento: evento,uuid_lote: lote})
                            oferta.fecha=timeNow();
                            oferta.tipo='manual';
                            await oferta.save();
                            
                            checkOfertaA(lote,evento);

                            res.json({
                                ok:true,
                            });
                            return;
                        }else{
                            res.json({
                                ok:false,
                                msg: 'La oferta no vence al precio actual'
                            });
                            return;
                        }
                    }
                }
            }else if(eventoDB[0] && eventoDB[0].estado==2){
                res.json({
                    ok:false,
                    msg: 'El evento ha finalizado'
                });
                return;
            }
        }

        res.json({
            ok:false,
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const getOfertas= async(req,res = response) =>{
    try {
        const flag = await isAdmin2(req.uid);
        if(flag==2){
            const userDB = await Usuario.findById(req.uid)

            const ofertaDB = await Oferta.aggregate([
                { "$match": { mail: userDB.mail } },
                { $project: { __v: 0, "__v": 0,} },
                { $lookup: {
                    from: "eventos",
                    localField: "uuid_evento",
                    foreignField: "uuid",
                    as: "evento"
                } },
                {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
                { $project: {
                    __v: 0,
                    "evento._id": 0,                "evento.__v": 0,                "evento.categoria":0,           "evento.fecha_inicio":0,
                    /*"evento.fecha_cierre":0,*/    "evento.hora_inicio":0,         /*"evento.hora_cierre":0,*/     "evento.segundos_cierre":0,
                    "evento.modalidad":0,           "evento.publicar_cierre":0,     "evento.inicio_automatico":0,   "evento.mostrar_precio":0,
                    "evento.mostrar_ganadores":0,   "evento.mostrar_ofertas":0,     "evento.grupo":0,               "evento.home":0,
                    "evento.eventos":0,             "evento.visitas":0,             /*"evento.estado":0,*/          "evento.uuid":0,
                    "evento.estado":0,              "fecha_cierre":0,               "hora_cierre":0
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
                    "lote.aclaracion": 0,    "lote.base_salida": 0,   "lote.uuid": 0,                  "lote.__v": 0,         "lote._id": 0,
                    "lote.descripcion": 0,   "lote.disponible": 0,    "lote.incremento": 0,            "lote.moneda": 0,
                    "lote.precio_base": 0,   "lote.precio_salida": 0, "lote.terminos_condiciones": 0
                } },
                { "$sort": { _id: -1 } },
            ]);

            res.json({
                ok:true,
                ofertaDB
            });
            return;
        }else{
            res.json({
                ok:false
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

module.exports={ ofertar, getDatos, setOfertaA, getOfertaA, eliminarOfertaA, getOfertas }