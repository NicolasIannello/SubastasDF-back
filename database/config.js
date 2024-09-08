const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const dbConnection = async() =>{
    try {
        await mongoose.connect(process.env.DB_CNN);
        console.log('Conectado a la base de datos');
    } catch (error) {
        console.log(error);
        throw new Error('Error al conectar con la base de datos')
    }
}

module.exports={dbConnection};