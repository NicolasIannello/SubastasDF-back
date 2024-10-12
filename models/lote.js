const { Schema, model } = require('mongoose');

const LoteSchema = Schema({
    uuid: { type: String, required: true },
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    moneda: { type: String, required: true },
    precio_base: { type: String, required: true },
    incremento: { type: String, required: true },
    precio_salida: { type: String },
    base_salida: { type: Boolean, required: true },
    aclaracion: { type: String },
    terminos_condiciones: { type: String, required: true },
    disponible: { type: Boolean, required: true },
});

LoteSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Lote',LoteSchema);