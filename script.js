class Student {
  constructor(name) {
    this.name = name;
    this.subjects = [];
  }

  addSubject(subject, score) {
    this.subjects.push({
      subject,
      score,
    });
  }

  calculateAverage() {
    if (this.subjects.length === 0) return 0;

    const totalScore = this.subjects.reduce(
      (total, subject) => total + subject.score,
      0
    );
    return totalScore / this.subjects.length;
  }
}

function addSubject(btn) {
  const studentDiv = btn.parentElement;
  const subjectDiv = studentDiv.querySelector(".subjects");

  const subjectInput = document.createElement("div");
  subjectInput.classList.add("subject");
  subjectInput.innerHTML = ` <input type="text" class="subjectName" placeholder="Subject"><input type="number" class="subjectScore" placeholder="Score">`;
  subjectDiv.appendChild(subjectInput);
}

function calculateAverage(btn) {
  const studentDiv = btn.parentElement;
  const studentName = studentDiv.querySelector("#studentName").value;
  const subjects = studentDiv.querySelectorAll(".subject");

  const student = new Student(studentName);

  subjects.forEach((subject) => {
    const subjectName = subject.querySelector(".subjectName").value;
    const subjectScore = parseInt(subject.querySelector(".subjectScore").value);

    if (subjectName && !isNaN(subjectScore)) {
      student.addSubject(subjectName, subjectScore);
    }
  });

  const averageDisplay = studentDiv.querySelector(".average");
  const average = student.calculateAverage();
  averageDisplay.textContent = average.toFixed(2);
}

// function addStudent() {
//   const studentsDiv = document.getElementById("students");
//   const newStudentDiv = document.createElement("div");
//   newStudentDiv.classList.add("student");
//   newStudentDiv.innerHTML = ` <label for="studentName">Student Name: </label> <input type="text" id="studentName" > <div class="subjects" > <div class="subject" > <input type="text" class="subjectName" placeholder="Subject" > <input type="number" class="subjectScore" placeholder="Score" > </div> </div> <button onclick="addSubject(this)" >Add Subject</button> <button onclick="calculateAverage(this)" >Calculate Average</button> <p>Average Score: <span class="average" ></span></p> `;
//   studentsDiv.appendChild(newStudentDiv);
// }
function addStudent() {
  const studentsDiv = document.getElementById("students");
  const newStudentDiv = document.createElement("div");
  newStudentDiv.classList.add("student");
  newStudentDiv.innerHTML = `
    <label for="studentName">Student Name:</label>
    <input type="text" id="studentName">
    <div class="subjects">
      <div class="subject">
        <input type="text" class="subjectName" placeholder="Subject">
        <input type="number" class="subjectScore" placeholder="Score">
      </div>
    </div>
    <button onclick="addSubject(this)">Add Subject</button>
    <button onclick="calculateAverage(this)">Calculate Average</button>
    <p>Average Score: <span class="average"></span></p>
  `;
  studentsDiv.appendChild(newStudentDiv);
  studentsDiv.appendChild(document.querySelector(".addStudent")); // Move the add student button
}
