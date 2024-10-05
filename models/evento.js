const { Schema, model } = require('mongoose');

const EventoSchema = Schema({
    uuid: { type: String, required: true },
    nombre: { type: String, required: true },
    categoria: { type: String, required: true },
    fecha_inicio: { type: String, required: true },
    fecha_cierre: { type: String, required: true },
    modalidad: { type: String, required: true },
    publicar_cierre: { type: Boolean, require:true },
    home: { type: Boolean, required: true },
    inicio: { type: Boolean, required: true },
    inicio_automatico: { type: Boolean, required: true },
    visitas: { type: Number, required: true },
});

EventoSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Evento',EventoSchema);