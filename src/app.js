import express from 'express';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());


app.listen(5000, () => {
    console.log('Server is litening on port 5000.');
  });