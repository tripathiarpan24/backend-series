const asyncHandler => (req,res,next) =>{
   (req,res,next)=>{
    Promise.resolve(requestHandler(req,res,next)). catch((err)=>next(err))
   }
}

export {asynchandler}