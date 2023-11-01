// Fetching the total number of responses from the database and showing it as response counter
fetch('/totalRows')
  .then(response => response.json())
  .then(data => {
    const totalRows = data.totalRows;
    const counterElement = document.querySelector('.response_counter');
    counterElement.textContent = `${totalRows} responses`;
  })
  .catch(error => console.error('Error fetching total rows:', error));

// Fetching percentage values for every rating value
const url = 'http://localhost:3000/ratings';
fetch(url)
  .then(response => response.json())
  .then(data => {
    const counterElements = document.querySelectorAll('.counter-element');
  
      for (let i = 1; i <= 4; i++) {
        const percentage = data[i] || 0;
        const counterElement = counterElements[i - 1];
  
        if (counterElement) {
          counterElement.textContent = `${percentage} %`;
        }
      }
    })
.catch(error => console.error('Error:', error));

// Time series values for every question on a specific day/time
async function fetchDataFromServerDrawTimeSeries() {
  const response = await fetch('http://localhost:3000/fetchTimeSeriesData', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const myJson = await response.json();
  console.log("fetchDataFromServerDrawTimeSeries  = ", myJson);

  var options = {
    series: myJson.fetchedData,
    chart: {
      height: 350,
      type: 'line',
    },
    stroke: {
      curve: 'smooth'
    },
    fill: {
      type: 'solid',
      opacity: [0.35, 1],
    },
    labels: myJson.lebel,
    markers: {
      size: 0
    },
    yaxis: [],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return y.toFixed(0) + " responses";
          }
          return y;
        }
      }
    }
  };

  var chartTimeSeries = new ApexCharts(document.querySelector("#chart_time_series"), options);
  chartTimeSeries.render();
}
fetchDataFromServerDrawTimeSeries()

/// 100% stacked chart 
const chartDataUrl = '/data';
let chart;
const selectedQuestions = [];
fetch(chartDataUrl)
  .then(response => response.json())
  .then(data => {
    const labels = Object.keys(data);
    const questionSelector = document.getElementById('questionSelector');
    labels.forEach(question => {
      const option = document.createElement('option');
      option.text = question;
      option.value = question;
      questionSelector.appendChild(option);
    });

    // Attach event listener to the drop-down menu
    questionSelector.addEventListener('change', function () {
      const selectedQuestion = this.value;
      if (selectedQuestion) {
        const index = selectedQuestions.indexOf(selectedQuestion);
        if (index === -1) {
          selectedQuestions.push(selectedQuestion);
        }
        generateChart(data, selectedQuestions);
      }
    });
  })
  .catch(error => console.error('Error fetching chart data:', error));

function generateChart(data, selectedQuestions) {
  const labels = selectedQuestions;

  const ratingColors = {
    1: 'rgba(255, 0, 0, 0.5)',
    2: 'rgba(128, 128, 128, 0.5)',
    3: 'rgba(0, 0, 255, 0.5)',
    4: 'rgba(0, 128, 0, 0.5)',
  };

  const ratingLabels = {
    1: 'Bad',
    2: 'Average',
    3: 'Good',
    4: 'Excellent',
  };

  const datasets = [];
  for (let rating = 1; rating <= 4; rating++) {
    const dataPoints = labels.map(question => {
      return data[question].ratings[rating] || 0;
    });
    datasets.push({
      label: ratingLabels[rating],
      data: dataPoints,
      backgroundColor: ratingColors[rating],
    });
  }

  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          ticks: { callback: value => `${value}%` },
        },
        y: {
          stacked: true,
        },
      },
    },
  };

  const ctx = document.getElementById('stackedBarChart').getContext('2d');
  if (chart) {
    chart.destroy();
  }
  chart = new Chart(ctx, chartConfig);
}

fetch('/questions')
.then((response) => response.json())
.then((data) => {
  const questionSelect = document.getElementById('questionSelect');
  data.forEach((question) => {
    const option = document.createElement('option');
    option.value = question.question;
    option.textContent = question.question;
    questionSelect.appendChild(option);
  });
});

function scheduleQuestion() {
const selectedQuestion = document.getElementById('questionSelect').value;
const selectedDateTime = document.getElementById('datetimePicker').value;

  if (selectedQuestion && selectedDateTime) {
    fetch('/schedule-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: selectedQuestion, dateTime: selectedDateTime }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log('Question scheduled successfully!');
        } else {
          console.log('Failed to schedule the question: ' + data.message);
        }
      })
      .catch((error) => {
        console.error('Error scheduling the question:', error);
      });
  }
}


function updateQuestion(questions) {
  const scheduledQuestionElement = document.querySelector('.question');
  const currentTime = new Date().getTime();
  let latestQuestion = null;

  for (const data of questions) {
    const selectedDateTime = new Date(data.dateTime).getTime();
    if (selectedDateTime <= currentTime) {
      latestQuestion = data.question;
    }
  }

  if (latestQuestion !== null) {
    scheduledQuestionElement.textContent = latestQuestion;
  } else {
    scheduledQuestionElement.textContent = '';
  }

  let button_top = document.querySelectorAll(".top_emoji");
  const storedQuestion = scheduledQuestionElement.innerText;
  const questionElement = document.querySelector('.question');
  const questionOfTheDay = storedQuestion;
  document.getElementById("question_val").value = questionOfTheDay;

  if (storedQuestion) {
    questionElement.innerText = storedQuestion;
    for (let i = 0; i < button_top.length; i++)  {

      button_top[i].onclick = function() {
      document.getElementById("body_top").style.display = "none";
      document.getElementById("top_info_text").style.display = "block";

      let test_top = document.getElementById("top_info_text").innerHTML;
      document.getElementById("top_info_text").innerHTML ="Thanks for your feedback 💕";
          
      }
    };
  }
}

setInterval(() => {
  fetch('/scheduled-question')
    .then((response) => response.json())
    .then((data) => {
      if (data && Array.isArray(data)) {
        updateQuestion(data);
      }
    })
    .catch((error) => {
      console.error('Error fetching scheduled questions:', error);
    });
}, 10);

// Fetch and populate the scheduled question dropdown
fetch('/scheduled-question')
  .then((response) => response.json())
  .then((data) => {
    const scheduledQuestionSelect = document.getElementById('scheduledQuestionSelect');
    scheduledQuestionSelect.innerHTML = '<option value="">Select a scheduled question</option>';

    data.forEach((scheduledQuestion) => {
      const option = document.createElement('option');
      option.value = scheduledQuestion.dateTime;
      option.textContent = scheduledQuestion.question + ' - ' + scheduledQuestion.dateTime;
      scheduledQuestionSelect.appendChild(option);
    });
  })
  .catch((error) => {
    console.error('Error fetching scheduled questions:', error);
  });

// Function to delete a scheduled question
function deleteScheduledQuestion() {
  const selectedScheduledQuestion = document.getElementById('scheduledQuestionSelect').value;

  if (selectedScheduledQuestion) {
    fetch('/delete-scheduled-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dateTime: selectedScheduledQuestion }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log('Question deleted successfully!');
          location.reload();
        } else {
          console.log('Failed to delete the question: ' + data.message);
        }
      })
      .catch((error) => {
        console.error('Error deleting the question:', error);
      });
  }
}

// Attach the deleteScheduledQuestion function to a button click event
const deleteButton = document.getElementById('deleteButton');
deleteButton.addEventListener('click', deleteScheduledQuestion);
function submitForm() {
  setTimeout(function() {
    location.reload();
  }, 2000);
}