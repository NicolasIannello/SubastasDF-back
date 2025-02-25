const { response }=require('express');
const Web = require('../models/web');
const Admin = require('../models/admin');

const actualizarWeb= async(req,res=response)=>{    
    const {campo1, campo2} = req.body;
    const adminDB= await Admin.findById(req.uid);    

    if(!adminDB){
        res.json({
            ok:false
        })
        return;
    }else{        
        const web1= await Web.find({id:campo1.id});
        const web2= await Web.find({id:campo2.id});
        if(!web1 || !web2){
            res.json({
                ok:false
            })
        }
        await Web.findByIdAndUpdate(web1[0]._id, campo1,{new:true});   
        await Web.findByIdAndUpdate(web2[0]._id, campo2,{new:true});   


        res.json({
            ok:true,
        })
    }
}

const getWeb= async(req,res = response) =>{
    try {
        const datos = await Web.aggregate([
            { $project: {
                __v: 0,
                "__v": 0,
                "_id": 0,
            } },
        ]);

        res.json({
            ok:true,
            datos,
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

module.exports={ actualizarWeb, getWeb }