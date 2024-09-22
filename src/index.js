import dotenv from 'dotenv'
import connectDB from './db/connect.js'
import { app } from './app.js'

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
        console.log("🛠️ Server is listening at PORT:",process.env.PORT);
        
    })
})
.catch((err)=>{
    console.log("Mongo db connection failed !!",err);
    
})