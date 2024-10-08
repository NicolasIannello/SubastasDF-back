const { response }=require('express');
const { v4: uuidv4 }=require('uuid');
const { isAdmin } = require('./admin');
const Evento = require('../models/evento');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');

const crearEvento= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
               
            const evento= new Evento(req.body);
            evento.home=false;
            evento.eventos=false;
            evento.visitas=0;
            evento.uuid=uuidv4();
            await evento.save();  

            res.json({
                ok:true,
            });
            
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const getEventos= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        const desde= parseInt(req.query.desde) || 0;
        const limit= parseInt(req.query.limit) || 20;
        const orden= parseInt(req.query.orden) || 1;
        const order= req.query.order || '_id';
        var sortOperator = { "$sort": { } };
        sortOperator["$sort"][order] = orden;

        const [ eventos, total ]= await Promise.all([
            Evento.aggregate([
                { $project: { __v: 0, } },
                sortOperator,
                { $skip: desde },
                { $limit: limit },
                { $lookup: {
                    from: "eventolotes",
                    localField: "uuid",
                    foreignField: "uuid_evento",
                    as: "lotes"
                } },
                { $project: {
                    __v: 0,
                    "lotes.__v": 0,
                    "lotes._id": 0,
                    "lotes.uuid_evento": 0,
                } },
            ]).collation({locale: 'en'}),
            Evento.countDocuments()
        ]);        
        
        res.json({
            ok:true,
            eventos,
            total
        });
    }
};

const agregarLotes= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        for (let i = 0; i < req.body.lotes.length; i++) {
            const loteEventoDB = await EventoLote.find({uuid_lote: req.body.lotes[i]})
            if(loteEventoDB.length==0){
                const eventoLote = new EventoLote({uuid_lote:req.body.lotes[i], uuid_evento:req.body.evento})
                eventoLote.save();
                const loteDB= await Lote.find({uuid:req.body.lotes[i]});
                const {...campos}=loteDB[0];
                campos._doc.disponible=false;
                await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true}); 
            }
        }
        
        res.json({
            ok:true,
        });
    }
};

const quitarLote= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        await EventoLote.deleteMany({uuid_lote: { $eq: req.body.lote}})
        const loteDB= await Lote.find({uuid:req.body.lote});
        const {...campos}=loteDB[0];
        campos._doc.disponible=true;
        await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true}); 

        res.json({
            ok:true,
        });
    }
};

const getEvento= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        var matchOperator = { "$match": { "uuid": req.body.uuid } }

        const evento= await Evento.aggregate([
            matchOperator,
            { $project: { __v: 0, } },
            { $lookup: {
                from: "eventolotes",
                localField: "uuid",
                foreignField: "uuid_evento",
                as: "lotes"
            } },
            { $project: {
                __v: 0,
                "lotes.__v": 0,
                "lotes._id": 0,
                "lotes.uuid_evento": 0,
            } },
        ]).collation({locale: 'en'});
        
        res.json({
            ok:true,
            evento,
        });
    }
};

const actualizarEvento= async(req,res=response)=>{    
    if(await isAdmin(res,req.uid)){        
        const eventoDB= await Evento.find({uuid:req.body.uuid});
        if(!eventoDB){
            res.json({
                ok:false
            })
        }
        
        let {...campos}=eventoDB[0];        
        campos=req.body.campos;
        await Evento.findByIdAndUpdate(eventoDB[0]._id, campos,{new:true}); 
        
        res.json({
            ok:true,
        })
    }
}

module.exports={ crearEvento, getEventos, agregarLotes, quitarLote, getEvento, actualizarEvento }