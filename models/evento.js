const { Schema, model } = require('mongoose');

const EventoSchema = Schema({
    uuid: { type: String, required: true },
    nombre: { type: String, required: true },
    categoria: { type: String, required: true },
    fecha_inicio: { type: String, required: true },
    fecha_cierre: { type: String, required: true },
    hora_inicio: { type: String, required: true },
    hora_cierre: { type: String, required: true },
    segundos_cierre: { type: Number, required: true },
    modalidad: { type: String, required: true },
    publicar_cierre: { type: Boolean, require:true },
    home: { type: Boolean, required: true },
    eventos: { type: Boolean, required: true },
    inicio_automatico: { type: Boolean, required: true },
    visitas: { type: Number, required: true },
    mostrar_precio: { type: Boolean, required: true },
    mostrar_ganadores: { type: Boolean, required: true },
    mostrar_ofertas: { type: Boolean, required: true },
    grupo: { type: String, required: true },
    estado: { type: Number, required: true },
    terminos_condiciones: { type: String },
});

EventoSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Evento',EventoSchema);