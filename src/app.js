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

setInterval(removeinative,15000);

async function removeinative(){
    const now = Date.now();
    try {
        const users = await db.collection("participants").find().toArray();
        for(let i=0; i<users.length; i++){
            const past = users[i].lastStatus;
            const diff = Math.abs(now - past)/1000;
            if(diff > 15){
                const username = users[i].name;
                await db.collection("participants").deleteOne({name: username});
                await db.collection("messages").insertOne({from: username, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs(new Date()).format('HH-mm-ss')});
            }
        }
    } catch (error) {
        console.error(error);
    }
}

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

app.get('/messages', async (req,res)=>{
    const source = req.headers.user;
    let limit = req.query.limit;
    try {
        let arrmessages = await db.collection("messages").find({$or: [{to: "Todos"},{to: source},{from: source}]}).toArray()
        if(limit){
            limit = Number(limit);
            arrmessages = arrmessages.reverse();
            let aux = [];
            for(let i=0; i < limit && i < arrmessages.length; i++){
                aux.push(arrmessages[i]);
            }
            aux = aux.reverse();
            res.send(aux);
            return;
        }
        res.send(arrmessages)
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
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

app.put('/messages/:ID_DA_MENSAGEM', async (req,res)=>{
    const body = req.body;
    const usr = req.headers.user;
    const idmsg = req.params.ID_DA_MENSAGEM;
    const messageSchema = joi.object({
        to : joi.string().required(),
        text : joi.string().required(),
        type : joi.string().valid('message','private_message').required()
    });
    const validation = messageSchema.validate(body);
    if(validation.error){
        res.status(422).send(validation.error.details);
        return;
    }
    try {
        const validsrc = await db.collection("participants").find({name : usr}).toArray();
        if(validsrc.length === 0){
            res.sendStatus(422);
            return;
        }
        const existsmsg = await db.collection("messages").find({_id: new ObjectId(idmsg)}).toArray();
        if(existsmsg.length === 0){
            res.sendStatus(404);
            return;
        }
        if(existsmsg[0].from != usr){
            res.sendStatus(401);
            return;
        }
        await db.collection("messages").updateOne({_id: new ObjectId(idmsg)},{$set:{text: body.text}});
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

app.delete('/messages/:ID_DA_MENSAGEM', async (req,res)=>{
    const user = req.headers.user;
    const idmsg = req.params.ID_DA_MENSAGEM;
    try {
        const message = await db.collection("messages").find({_id: new ObjectId(idmsg)}).toArray();
        if(message.length === 0){
            res.sendStatus(404);
            return;
        }
        if(message[0].from != user){
            res.sendStatus(401);
            return;
        }
        await db.collection("messages").deleteOne({_id: ObjectId(idmsg)});
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

app.post('/status', async (req,res)=>{
    const user = req.headers.user;
    try {
        const exists = await db.collection("participants").find({name: user}).toArray();
        if(!exists){
            res.sendStatus(404);
            return;
        }
        await db.collection("participants").deleteOne({name: user});
        await db.collection("participants").insertOne({name: user, lastStatus: Date.now()});
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.listen(5000, () => {
    console.log('Server is listening on port 5000.');
  });