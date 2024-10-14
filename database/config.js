const mongoose = require('mongoose');
const Evento = require('../models/evento');

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
        ]);

        for (let i = 0; i < eventoDB.length; i++) {
            console.log(eventoDB[i].hora_inicio+" "+(eventoDB[i].hora_inicio<hora && !eventoDB[i].activo && eventoDB[i].inicio_automatico)+" "+hora);
            if(eventoDB[i].hora_inicio<=hora && !eventoDB[i].activo && eventoDB[i].inicio_automatico){
                let {...campos}=eventoDB[i];        
                campos.activo=true;
                await Evento.findByIdAndUpdate(eventoDB[i]._id, campos,{new:true});         
            }        
        }
    }
}

module.exports={dbConnection};