// Package lists
const express = require ("express");
const moment = require ("moment");
const mysql = require("mysql");
const schedule = require('node-schedule');
const bodyParser = require("body-parser");
const app = express();
const address = require("address");
const jsdom = require("jsdom");
const { after } = require("cheerio/lib/api/manipulation");
const { JSDOM } = jsdom;
const util = require('util');
const { prependListener } = require("process");

/// Additional packages /////
const http = require('http').createServer(app);
const WebSocket = require('ws');
const port = 3000;

// Package instances
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Server intitialization
http.listen(port, () => {
  console.log(`Server listening on the port ${port}`);
});

// Database connection
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "hellokiel2021",
    database: "db_hospital",
    multipleStatements: true,
});

con.connect(function (error) {
    if (error) {
      console.log('Error connecting to MySQL:', error);
    } else {
      console.log('Connected to MySQL database');
    }
});
const query = util.promisify(con.query).bind(con)

// Client get request
app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});

// Post request from client to the server
app.post("/", function(req, res){
    var user_rating = (req.body.feedback);
    var question = (req.body.question)
    var datetime = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    var mac_add = address.mac(function (err, addr) {
        return(addr);
    });
    var sql = mysql.format("SELECT * FROM tbl_mac WHERE mac_address=?", [mac_add]);
    con.query(sql, function(err, result){

        var id_for_mac = 0;
        if(result.length === 0){
            var sql = "insert into tbl_mac (mac_address) values ('" + mac_add +"')";
            con.query(sql, function(err2, result){
                if(err2) throw err2;
                sql = mysql.format("SELECT * FROM tbl_mac WHERE mac_address=?", [mac_add]);
                con.query(sql, function(err3, result){
                    if(err3) throw err3;
                    id_for_mac = result[0].mac_id;
                    afterProcessMacAddress(id_for_mac, req);
                })

            })
            
        } else{
            id_for_mac = result[0].mac_id;
            afterProcessMacAddress(id_for_mac, req);
        }

        
    })
    

    res.status(204).send();
});

function afterProcessMacAddress(id_for_mac, req){

    sql = mysql.format("SELECT * FROM tbl_survey WHERE question=?", [req.body.question]);
    var id_for_question = 0;
    let survey_question;
    con.query(sql, function(err, result){
        
        if(result.length === 0){
            throw new Error("Question does't exists in the table tbl_survey!");
        }else{
            id_for_question = result[0].question_id;
            survey_question  = [req.body.question];
            afterProcessQuestion(id_for_mac, id_for_question, survey_question, req)
        }
    })


}

function afterProcessQuestion(id_for_mac, id_for_question, survey_question, req){
    var datetime = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    var sql = "insert into tbl_survey_data (mac_id, question_id, question, user_rating, time_stamp) values (' "+ id_for_mac +  " ','" + id_for_question + "', ' " + survey_question +  " ' , ' " + req.body.feedback +  " ', ' " + datetime +" ' )";
    con.query(sql, function(err, result){
        if(err) throw err;
    })

}

// Fetching all questions from the database
app.get('/questions', function (req, res) {
    const query = 'SELECT question FROM tbl_survey';
    con.query(query, function (error, results) {
      if (error) {
        console.log('Error fetching data from MySQL:', error);
        res.status(500).json({ error: 'Error fetching data from MySQL' });
      } else {
        const questions = results.map((row) => ({
          question: row.question,
        }));
        res.json(questions);
      }
    });
  });

/// Question scheduling
const connection = mysql.createConnection(con);
let scheduledQuestionData = [];
app.use(bodyParser.json());
app.get('/questions', (req, res) => {
  const query = 'SELECT question FROM tbl_survey';
  connection.query(query, function (error, results) {
    if (error) {
      console.log('Error fetching data from MySQL:', error);
      res.status(500).json({ error: 'Error fetching data from MySQL' });
    } else {
      const questions = results.map((row) => ({
        question: row.question,
      }));
      res.json(questions);
    }
  });
});
app.get('/scheduled-question', (req, res) => {
  res.json(scheduledQuestionData);
});
app.post('/schedule-question', (req, res) => {
  const { question, dateTime } = req.body;
  const selectedDateTime = new Date(dateTime);
  const currentTime = new Date();
  if (selectedDateTime > currentTime) {
    const job = schedule.scheduleJob(selectedDateTime, function () {
      console.log(`Scheduled question: ${question}`);
    });
    const newScheduledQuestion = { question, dateTime, nextInvocation: job.nextInvocation() };
    console.log('Scheduled questions:', newScheduledQuestion);
    let insertIndex = scheduledQuestionData.findIndex(
      (data) => new Date(data.dateTime).getTime() > selectedDateTime.getTime()
    );

    if (insertIndex === -1) {
      insertIndex = scheduledQuestionData.length;
    }
    scheduledQuestionData.splice(insertIndex, 0, newScheduledQuestion);

    res.json({ success: true, message: 'Question is in queue.' });
  } else {
    res.json({ success: false, message: 'Please select a future date and time for scheduling.' });
  }
});

// Endpoint for scheduled question
app.post('/delete-scheduled-question', (req, res) => {
  const { dateTime } = req.body;
  const deleteIndex = scheduledQuestionData.findIndex((data) => data.dateTime === dateTime);
  if (deleteIndex !== -1) {
    scheduledQuestionData.splice(deleteIndex, 1);
    res.json({ success: true, message: 'Question deleted successfully.' });
  } else {
    res.json({ success: false, message: 'Question not found for deletion.' });
  }
});





















































// Fetching data for time Series chart

app.get('/fetchTimeSeriesData', async (req, res) =>{
    try {
        //Get All Questions:
        const questionData = await query("select * from tbl_survey")
        var questionIDs = []
        for(let i = 0; i<questionData.length; i++){
            questionIDs.push(questionData[i].question_id)
        }
        sqlStr = 'select * from tbl_survey_data'
        const result = await query(sqlStr)
        var retData = {}
        var lebel = []

        fetchedData = []

        for (let i = 0; i<result.length; i++){
            curDay = result[i].time_stamp.toString().substring(4,15)
            let index = lebel.indexOf(curDay)
            if(index == -1){
                lebel.push(curDay)
            }

            if(retData[curDay] === undefined){
                retData[curDay] = {}
                for(let q = 0; q<questionIDs.length; q++){
                    retData[curDay][questionIDs[q]] = 0
                }
                
            }

            if(retData[curDay][result[i].question_id] === undefined){
                retData[curDay][result[i].question_id] = 1
            }else{
                retData[curDay][result[i].question_id] +=1
            }

        }

var preProcessing = {}

        for(let i = 0; i<lebel.length; i++){
            let curKeys = Object.keys(retData[lebel[i]])
            for(let j = 0; j<curKeys.length; j++){
                if (preProcessing[curKeys[j]] === undefined){
                    preProcessing[curKeys[j]] = []
                    preProcessing[curKeys[j]].push(retData[lebel[i]][curKeys[j]])
                }else{
                    preProcessing[curKeys[j]].push(retData[lebel[i]][curKeys[j]])
                }
            }

        }

        let qKeys = Object.keys(preProcessing);

        for(let i = 0; i<qKeys.length; i++){
            const res = await query("select question from tbl_survey where question_id = " + qKeys[i])
            let obj = {
                questionID: qKeys[i],
                name: res[0].question,
                data: preProcessing[qKeys[i]],
                type: 'line'
            }
            fetchedData.push(obj)
        }

        
        
    } catch(err) {
        console.log("Error: ", err)
    }
    return res.json({fetchedData, lebel})
})


//fetching the total number of rows
app.get('/totalRows', (req, res) => {
    // Retrieve the total number of rows from the tbl_survey_data table
    const query = 'SELECT COUNT(id) AS totalRows FROM tbl_survey_data';
    con.query(query, (error, results) => {
      if (error) {
        console.error('Error executing query: ' + error.stack);
        res.status(500).json({ error: 'Error fetching data from the database' });
        return;
      }
      const totalRows = results[0].totalRows;
  
      // Send the total number of rows as the response
      res.json({ totalRows });
    });
  });


/// Fetching percentage value for all data
app.get('/ratings', (req, res) => {
    const query = `
      SELECT user_rating, COUNT(*) * 100 / (SELECT COUNT(*) FROM tbl_survey_data WHERE user_rating BETWEEN 1 AND 5) AS percentage
      FROM tbl_survey_data
      WHERE user_rating BETWEEN 1 AND 5
      GROUP BY user_rating;
    `;
  
  con.query(query, (error, results) => {
  if (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
      } else {
      const ratingsWithPercentage = {};
      results.forEach(row => {
          ratingsWithPercentage[row.user_rating] = Math.floor(row.percentage);
      });
        res.json(ratingsWithPercentage);
      }
    });
  });
///////////////////////////////////////////////////// Stacked Bar Chart ///////////////////////////////////////////////////////
app.get('/data', (req, res) => {
  con.query('SELECT question, user_rating FROM tbl_survey_data', (err, rows) => {
    if (err) {
      console.error('Error retrieving data from MySQL:', err);
      res.status(500).send('Error retrieving data');
      return;
    }

    const data = {};
    const uniqueQuestions = new Set(); // Keep track of unique questions

    rows.forEach((row) => {
      const question = row.question;
      const rating = row.user_rating;

      if (!data[question]) {
        data[question] = { total: 0, ratings: {} };
        uniqueQuestions.add(question); // Add the question to the Set
      }

      data[question].total++;
      if (!data[question].ratings[rating]) {
        data[question].ratings[rating] = 0;
      }
      data[question].ratings[rating]++;
    });

    uniqueQuestions.forEach((question) => {
      const total = data[question].total;
      Object.keys(data[question].ratings).forEach((rating) => {
        const count = data[question].ratings[rating];
        const percentage = Math.floor((count / total) * 100);
        data[question].ratings[rating] = percentage;
      });
    });

    res.json(data);
  });
});

