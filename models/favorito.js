const { Schema, model } = require('mongoose');

const FavoritoSchema = Schema({
    mail: { type: String, required: true },
    uuid_evento: { type: String, required: true },
    uuid_lote: { type: String, required: true },
});

FavoritoSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Favorito',FavoritoSchema);