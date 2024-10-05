const { response }=require('express');
const { v4: uuidv4 }=require('uuid');
const { isAdmin } = require('./admin');
const Evento = require('../models/evento');

const crearEvento= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
               
            const evento= new Evento(req.body);
            evento.home=false;
            evento.inicio=false;
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
                { $project: {
                    __v: 0,
                    "categoria": 0,
                    "modalidad": 0,
                    "fecha_inicio": 0,
                } },
                sortOperator,
                { $skip: desde },
                { $limit: limit },
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


module.exports={ crearEvento, getEventos }