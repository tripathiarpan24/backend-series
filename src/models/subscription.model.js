import mongoose,{Schema} from 'mongoose'
import { User } from './user.model'

const subsriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel:{
         type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps:true})

export const Subscription = mongoose.model("Subsription",subsriptionSchema)