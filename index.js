const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

console.log('mongodb+srv://tjrapodile:Incorrect12345!@cluster0.y90ln.mongodb.net/exerciseDB?retryWrites=true&w=majority');
mongoose.connect('mongodb+srv://tjrapodile:Incorrect12345!@cluster0.y90ln.mongodb.net/exerciseDB?retryWrites=true&w=majority').then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB', err);
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
  await User.syncIndexes();
  await Exercise.syncIndexes();
});

app.get('/api/users/delete', function (_req, res) {
  console.log('### delete all users ###'.toLocaleUpperCase());

  User.deleteMany({}, function (err, result) {
    if (err) {
      console.error(err);
      res.json({
        message: 'Deleting all users failed!',
      });
    }

    res.json({ message: 'All users have been deleted!', result: result });
  });
});

app.get('/api/exercises/delete', function (_req, res) {
  console.log('### delete all exercises ###'.toLocaleUpperCase());

  Exercise.deleteMany({}, function (err, result) {
    if (err) {
      console.error(err);
      res.json({
        message: 'Deleting all exercises failed!',
      });
    }

    res.json({ message: 'All exercises have been deleted!', result: result });
  });
});

app.get('/api/users', async (req, res) => {
  console.log('### get all users ###'.toLocaleUpperCase());

  try {
    const users = await User.find({});
    
    if (users.length === 0) {
      res.json({ message: 'There are no users in the database!' });
    } else {
      console.log('users in database: '.toLocaleUpperCase() + users.length);
      res.json(users);
    }
  } catch (err) {
    console.error(err);
    res.json({
      message: 'Getting all users failed!',
    });
  }
});


// Updated using async/await
app.post('/api/users', async function (req, res) {
  const inputUsername = req.body.username;
  console.log('### create a new user ###'.toLocaleUpperCase());

  let newUser = new User({ username: inputUsername });
  console.log(
    'creating a new user with username - '.toLocaleUpperCase() + inputUsername
  );

  try {
    let user = await newUser.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error(err);
    res.json({ message: 'User creation failed!' });
  }
});

// Updated using async/await
app.post('/api/users/:_id/exercises', async function (req, res) {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;

  console.log('### add a new exercise ###'.toLocaleUpperCase());

  if (!date) {
    date = new Date().toISOString().substring(0, 10);
  }

  console.log(
    'looking for user with id ['.toLocaleUpperCase() + userId + '] ...'
  );

  try {
    const userInDb = await User.findById(userId);
    if (!userInDb) {
      return res.json({ message: 'There are no users with that ID in the database!' });
    }

    let newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description: description,
      duration: parseInt(duration),
      date: date,
    });

    let exercise = await newExercise.save();
    res.json({
      username: userInDb.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: userInDb._id,
    });
  } catch (err) {
    console.error(err);
    res.json({ message: 'Exercise creation failed!' });
  }
});

app.get('/api/users/:_id/logs', async function (req, res) {
  const userId = req.params._id;
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  console.log('### get the log from a user ###'.toLocaleUpperCase());

  try {
    let user = await User.findById(userId).exec();

    console.log(
      'looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...'
    );

    let exercises = await Exercise.find({
      userId: userId,
      date: { $gte: from, $lte: to },
    })
      .select('description duration date')
      .limit(limit)
      .exec();

    let parsedDatesLog = exercises.map((exercise) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      };
    });

    res.json({
      _id: user._id,
      username: user.username,
      count: parsedDatesLog.length,
      log: parsedDatesLog,
    });
  } catch (err) {
    console.error(err);
    res.json({ message: 'Failed to fetch logs!' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
