// Shared in-memory data store for Vercel serverless functions
// Note: Data resets on cold start - for persistent storage, use Vercel KV

const teams = new Map();
const submissions = new Map();

// Questions data
const questions = [
  // Round 1 - SQL Query Questions
  {
    id: 1,
    round_number: 1,
    question: '1. Most Frequent Demand Level\n\nSELECT demand_level\nFROM AI_Predictions\nGROUP BY demand_level\nORDER BY COUNT(*) DESC\nLIMIT 1;',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['High', 'high'])
  },
  {
    id: 2,
    round_number: 1,
    question: '2. Loyalty Level Generating Highest Revenue',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['Platinum', 'platinum'])
  },
  // Round 2 - Algorithm & DSA
  {
    id: 3,
    round_number: 2,
    question: 'Logic Reconstruction - Minimum Platforms Algorithm',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['IELAJ', 'I,E,L,A,J'])
  },
  {
    id: 4,
    round_number: 2,
    question: 'DSA Problem - Output of code snippet',
    type: 'mcq',
    options: ['hi', 'hihihi', 'hihihihi', 'Infinite "hi" until crash'],
    marks: 10,
    correct_answer: 'hihihihi'
  },
  // Round 3 - Cloud Data Processing
  {
    id: 5,
    round_number: 3,
    question: 'Identify Scheduling Algorithm (SRTF)',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['Shortest Remaining Time First', 'SRTF'])
  },
  {
    id: 6,
    round_number: 3,
    question: 'Average Waiting Time Calculation',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['3', '3.0', '3ms'])
  },
  {
    id: 7,
    round_number: 3,
    question: 'Average Turnaround Time SRTF',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['7', '7.0', '7ms'])
  },
  {
    id: 8,
    round_number: 3,
    question: 'Starvation Problem',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['Starvation', 'starvation'])
  },
  // Round 4 - Flowchart Analysis
  {
    id: 9,
    round_number: 4,
    question: 'Flowchart Pattern Output',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['*\n**\n***\n****'])
  },
  {
    id: 10,
    round_number: 4,
    question: 'Flowchart Armstrong Number',
    type: 'text',
    options: null,
    marks: 10,
    correct_answer: JSON.stringify(['Armstrong Number', 'armstrong number'])
  }
];

const roundTimers = {
  1: 25,
  2: 25,
  3: 25,
  4: 25
};

module.exports = {
  teams,
  submissions,
  questions,
  roundTimers
};
