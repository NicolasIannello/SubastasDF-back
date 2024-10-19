const { Schema, model } = require('mongoose');

const OfertaSchema = Schema({
    mail: { type: String, required: true },
    uuid_evento: { type: String, required: true },
    uuid_lote: { type: String, required: true },
    cantidad: { type: Number, required: true },
    fecha: { type: String, required: true },
    tipo: { type: String, required: true },
});

OfertaSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Oferta',OfertaSchema);