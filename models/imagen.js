const { Schema, model } = require('mongoose');

const ImagenSchema = Schema({
    lote: { type: String, require:true },
    img: { type: String, require:true }
});

ImagenSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Imagen',ImagenSchema);