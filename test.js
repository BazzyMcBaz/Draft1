const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const webPush = require('web-push');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'https://task-frontend.onrender.com'
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});
const User = mongoose.model('User', userSchema);

// ✅ Task schema
const taskSchema = new mongoose.Schema({
  day: Number,
  name: String,
  time: String
});
const Task = mongoose.model('Task', taskSchema);

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.json({ success: false, message: 'Username already exists' });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashed });
  res.json({ success: true, message: 'User registered' });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.json({ success: false, message: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.json({ success: false, message: 'Incorrect password' });

  res.json({ success: true, message: 'Login successful' });
});

// ✅ Save Task route
app.post('/task', async (req, res) => {
  const { day, name, time } = req.body;
  try {
    const newTask = new Task({ day, name, time });
    await newTask.save();
    res.json({ success: true, message: 'Task saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving task' });
  }
});

app.get('/tasks', async (req, res) => {
  try {
    const allTasks = await Task.find({});
    res.json({ success: true, tasks: allTasks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching tasks' });
  }
});

// ✅ DELETE a task by ID
app.delete('/task/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

webPush.setVapidDetails(
  'mailto:germanshepherd54321@gmail.com',
  'BJu9aeVYWucklGJlUktm2M0DXVbrA0v3hXa9sADMlMlDHqdmksiATiXFi3papNx4aD03NacbeiE9sqg6ibWraew',
  'PsF5vmnks7GzsgEx8J4ptqaYctYM5oRfWSJXjPs-0UM'
);



// Store subscriptions (in-memory for now, or in DB)
const subscriptions = [];

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscribed successfully' });
});


cron.schedule('* * * * *', async () => {
  const tasks = await Task.find({});

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDay = tomorrow.getDay() - 1; // JS Sunday=0, DB Monday=0

  const tomorrowTasks = tasks.filter(task => task.day === targetDay);

  for (const task of tomorrowTasks) {
    const payload = JSON.stringify({
      title: '⏰ Upcoming Task Reminder',
      body: `${task.name} is scheduled for tomorrow at ${task.time}`,
      vibrate: [200, 100, 200]
    });

    subscriptions.forEach(sub => {
      webPush.sendNotification(sub, payload).catch(err => console.error('Push failed:', err));
    });
  }
});


const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
