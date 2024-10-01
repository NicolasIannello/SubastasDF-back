const Imagen = require('../models/imagen');
const { v4: uuidv4 }=require('uuid');
const fs=require('fs');

const subirImagen= async(imagen,LoteID,res)=>{
    const img=imagen;
    const nombreCortado=img.name.split('.');
    const extensionArchivo=nombreCortado[nombreCortado.length-1];
    const nombreArchivo= uuidv4()+'.'+extensionArchivo;
    const path= './files/lotes/'+nombreArchivo;
    const datos={ lote: LoteID, img: nombreArchivo };

    img.mv(path, async (err)=>{
        if(err){
            console.log(err);
            return res.status(500).json({
                ok:false,
                msg:'error en carga de imagen '+nombreCortado[0],
            })
        }
        const imagen = new Imagen(datos);
        await imagen.save();
        return true;
    })
}

const borrarImagen= async(LoteID)=>{
    const imagenDB= await Imagen.find({lote:LoteID});

    for (let i = 0; i < imagenDB.length; i++) {
        let pathImg='./files/lotes/'+imagenDB[i].img
        if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
        await Imagen.findByIdAndDelete(imagenDB[i]._id);
    }

    return true;
}

module.exports={subirImagen, borrarImagen };