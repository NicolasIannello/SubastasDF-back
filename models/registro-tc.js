const { Schema, model } = require('mongoose');

const RegistroTCSchema = Schema({
    mail: { type: String, required: true },
    terminos_condiciones: { type: String, required: true },
    fecha: { type: String, required: true },
});

RegistroTCSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('RegistroTC',RegistroTCSchema);