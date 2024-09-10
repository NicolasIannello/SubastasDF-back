const jwt = require("jsonwebtoken");


const validarJWT=(req,res,next)=>{
    const { token,tipo }=req.body
    
    if(!token){
        return res.status(401).json({
            ok:false,
            msg:'no hay token'
        });
    }

    try {
        let secret;
        switch (tipo) {
            case 1:
                secret=process.env.JWT_SECRET;
                break;
            case 2:
                secret=process.env.JWT_VALIDATE;
                break;
            case 3:
                secret='';
                break;
            default:
                break;
        }
        const { uid }=jwt.verify(token,secret);

        req.uid=uid;
        
        next();
    } catch (error) {
        return res.status(401).json({
            ok:false,
            msg:'token mal'
        });
    }
}

module.exports={validarJWT};