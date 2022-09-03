import express from 'express';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("batepapouol");
});

app.post('/participants', async (req,res)=>{
    const data = req.body;
    const participantSchema = joi.object({
        name : joi.string().required()
    });
    const validation = participantSchema.validate(data);
    if(validation.error){
        res.status(422).send("Nome inválido");
        return;
    }
    try {
        const conflict = await db.collection("participants").find({name: data.name}).toArray();
        if(conflict.length != 0){
            res.status(409).send("Usuário já existente");
            return;
        }
        const insertion = await db.collection("participants").insertOne({name: data.name, lastStatus: Date.now()});
        const chat = await db.collection("messages").insertOne({from: data.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(new Date()).format('HH-mm-ss')});
        res.sendStatus(201)
    } catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
});


app.listen(5000, () => {
    console.log('Server is listening on port 5000.');
  });