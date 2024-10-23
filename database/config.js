const mongoose = require('mongoose');
const Evento = require('../models/evento');
const Favorito = require('../models/favorito');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');
const Oferta = require('../models/oferta');

mongoose.set('strictQuery', false);

const dbConnection = async() =>{
    try {
        await mongoose.connect(process.env.DB_CNN);
        console.log('Conectado a la base de datos');
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
                await Favorito.deleteMany({uuid_evento:eventoDB2[i].uuid});

                const eventoloteDB = await EventoLote.find({uuid_evento:eventoDB2[i].uuid})
                for (let j = 0; j < eventoloteDB.length; j++) {
                    const loteDB = await Lote.find({uuid:eventoloteDB[j].uuid_lote})
                    const ofertaDB = await Oferta.find({uuid_lote:eventoloteDB[j].uuid_lote}).sort({cantidad:-1}).limit(1)
                    
                    let {...campos}=loteDB[0];        
                    campos._doc.ganador=ofertaDB[0].mail;
                    campos._doc.precio_ganador=ofertaDB[0].cantidad;
                    await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true});         
                }
            }        
        }
    }
}

module.exports={dbConnection};