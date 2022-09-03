import express from 'express';
import dotenv from 'dotenv';
import joi from 'joi';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("batepapouol");
});

app.get('/participants', async (req,res)=>{
    try {
        const users = await db.collection("participants").find().toArray();
        res.send(users);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.post('/participants', async (req,res)=>{
    const data = req.body;
    const participantSchema = joi.object({
        name : joi.string().required()
    });
    const validation = participantSchema.validate(data);
    if(validation.error){
        res.status(422).send(validation.error.details);
        return;
    }
    try {
        const conflict = await db.collection("participants").find({name: data.name}).toArray();
        if(conflict.length != 0){
            res.status(409).send("Usuário já existente");
            return;
        }
        await db.collection("participants").insertOne({name: data.name, lastStatus: Date.now()});
        await db.collection("messages").insertOne({from: data.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(new Date()).format('HH-mm-ss')});
        res.sendStatus(201)
    } catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
});

app.post('/messages', async (req,res)=>{
    const msg = req.body;
    const source = req.headers.user;
    const messageSchema = joi.object({
        to : joi.string().required(),
        text : joi.string().required(),
        type : joi.string().valid('message','private_message').required()
    });
    const validation = messageSchema.validate(msg);
    if(validation.error){
        res.status(422).send(validation.error.details);
        return;
    }
    try {
        const validsrc = await db.collection("participants").find({name : source}).toArray();
        if(validsrc.length === 0){
            res.sendStatus(422);
            return;
        }
        await db.collection("messages").insertOne({from: source, to: msg.to, text: msg.text, type: msg.type, time: dayjs(new Date()).format('HH-mm-ss')});
        res.sendStatus(201);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

app.listen(5000, () => {
    console.log('Server is listening on port 5000.');
  });