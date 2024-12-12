import mongoose from "mongoose";
import 'dotenv/config';

// const uri = `mongodb://localhost:27017/`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mydatabase.1c7whlf.mongodb.net/?retryWrites=true&w=majority&appName=myDatabase`;

export const database = () => {
    mongoose.connect(uri, { dbName: "language_app" })
        .then(() => {
            console.log("Database is connected....");
        })
        .catch(error => {
            console.log(error);
        })
}