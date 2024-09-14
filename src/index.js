import dotenv from 'dotenv'
import connectDB from './db/connect.js'

dotenv.config({
    path:'./env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT ||8000, ()=>{
        app.on("error",(error)=>{
            console.log("ERR: ",error);
            throw error
            
        })
        console.log("Serverr is listening at PORT:",process.env.PORT);
        
    })
})
.catch((err)=>{
    console.log("Mongo db connection failed !!",err);
    
})